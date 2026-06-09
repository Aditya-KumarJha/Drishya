import jwt from 'jsonwebtoken';
import User from './models/user.model.js';
import { publishToQueue } from './broker/broker.js';
import { asyncHandler } from './utils/async-handler.js';
import { normalizeEmail, normalizeUsername } from './utils/normalize.js';
import { hashPassword, verifyPassword } from './utils/password.js';
import redis from './db/redis.js';
import {
  generateOtp,
  storeOtp,
  verifyOtp,
  checkCooldown,
  OTP_TTL_SECONDS,
} from './services/otp.service.js';
import {
  signAccessToken,
  signRefreshToken,
  blacklistToken,
  getExpirySeconds,
  getAccessCookieOptions,
  getRefreshCookieOptions,
  storeRefreshSession,
  getRefreshSessionJti,
  revokeRefreshSession,
  acquireRefreshSessionLock,
  releaseRefreshSessionLock,
} from './services/token.service.js';
import { logger } from './utils/logger.js';

const REGISTRATION_TTL_SECONDS = Number(process.env.REGISTRATION_TTL_SECONDS || 900);
const FORGOT_PASSWORD_VERIFIED_TTL_SECONDS = Number(
  process.env.FORGOT_PASSWORD_VERIFIED_TTL_SECONDS || 900
);

const QUEUE_PREFIX = process.env.QUEUE_PREFIX || 'DRISHYA';
const QUEUES = {
  AUTH_OTP: `${QUEUE_PREFIX}.AUTH.OTP`,
  AUTH_USER_CREATED: `${QUEUE_PREFIX}.AUTH.USER_CREATED`,
  AUTH_USER_LOGGED_IN: `${QUEUE_PREFIX}.AUTH.USER_LOGGED_IN`,
};

const shouldEchoOtp = String(process.env.OTP_ECHO || '').toLowerCase() === 'true';
const genericOtpDispatchMessage = 'If the account exists, an OTP will be sent shortly.';
const genericPasswordResetMessage =
  'If the account exists, password reset instructions have been sent.';

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie('access_token', accessToken, getAccessCookieOptions());
  res.cookie('refresh_token', refreshToken, getRefreshCookieOptions());
};

const clearAuthCookies = (res) => {
  res.clearCookie('access_token', getAccessCookieOptions());
  res.clearCookie('refresh_token', getRefreshCookieOptions());
};

const buildOtpResponse = (message, otp) => {
  const response = {
    success: true,
    message,
  };

  if (shouldEchoOtp) {
    response.data = { otp };
  }

  return response;
};

const buildUserResponse = (user) => ({
  id: user._id,
  email: user.email,
  username: user.username,
  fullName: user.fullName,
  role: user.role,
  provider: user.provider || 'email',
  isVerified: user.isVerified !== false,
  profilePic: user.profilePic || '',
});

const getIdentifierFromBody = (body) => {
  if (body.email) {
    return normalizeEmail(body.email);
  }

  return normalizeUsername(body.username);
};

const getUserByIdentifier = async (identifier) => {
  if (!identifier) {
    return null;
  }

  if (identifier.includes('@')) {
    return User.findOne({ email: identifier });
  }

  return User.findOne({ username: identifier });
};

const getForgotPasswordVerifiedKey = (identifier) => `fpv:${identifier}`;

const publishOtpEvent = async (email, otp, purpose) => {
  return publishToQueue(QUEUES.AUTH_OTP, {
    email,
    otp,
    purpose,
    ttlMinutes: Math.floor(OTP_TTL_SECONDS / 60),
    brand: process.env.BRAND_NAME || 'Drishya',
  });
};

const issueAuthSession = async (req, res, user) => {
  const { token: accessToken } = signAccessToken(user);
  const { token: refreshToken, jti: refreshJti, familyId } = signRefreshToken(user);

  await storeRefreshSession(familyId, refreshJti);
  setAuthCookies(res, accessToken, refreshToken);

  await publishToQueue(QUEUES.AUTH_USER_LOGGED_IN, {
    email: user.email,
    fullName: user.fullName,
    username: user.username,
    role: user.role,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') || null,
  });

  return null;
};

const registerUser = asyncHandler(async (req, res) => {
  const { email, password, fullName, username, provider = 'email' } = req.body;
  console.log("HashChangeEvent",req.body)
  const normalizedEmail = normalizeEmail(email);
  const normalizedUsername = username ? normalizeUsername(username) : null;

  const existingEmail = await User.findOne({ email: normalizedEmail });
  if (existingEmail) {
    return res.status(409).json({
      success: false,
      message: 'Email already registered',
    });
  }

  if (normalizedUsername) {
    const existingUsername = await User.findOne({ username: normalizedUsername });
    if (existingUsername) {
      return res.status(409).json({
        success: false,
        message: 'Username already taken',
      });
    }
  }

  const passwordHash = await hashPassword(password);
  const registrationKey = `reg:${normalizedEmail}`;

  await redis.set(
    registrationKey,
    JSON.stringify({
      email: normalizedEmail,
      username: normalizedUsername,
      passwordHash,
      fullName,
      provider,
    }),
    'EX',
    REGISTRATION_TTL_SECONDS
  );

  const otp = generateOtp();
  await storeOtp('register', normalizedEmail, otp);
  await publishOtpEvent(normalizedEmail, otp, 'registration');

  return res.status(201).json(
    buildOtpResponse('Registration successful. Please verify your email.', otp)
  );
});

const verifyRegisterOTP = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const { otp } = req.body;

  const otpResult = await verifyOtp('register', email, otp);
  if (!otpResult.ok) {
    return res.status(400).json({
      success: false,
      message: otpResult.reason,
    });
  }

  const registrationKey = `reg:${email}`;
  const rawRegistration = await redis.get(registrationKey);
  if (!rawRegistration) {
    return res.status(400).json({
      success: false,
      message: 'Registration session expired',
    });
  }

  const registrationData = JSON.parse(rawRegistration);
  const user = await User.create({
    email: registrationData.email,
    username: registrationData.username || null,
    passwordHash: registrationData.passwordHash,
    fullName: registrationData.fullName,
    provider: registrationData.provider || 'email',
    isVerified: true,
    role: 'user',
  });

  await redis.del(registrationKey);

  await issueAuthSession(req, res, user);

  await publishToQueue(QUEUES.AUTH_USER_CREATED, {
    email: user.email,
    fullName: user.fullName,
    username: user.username,
    role: user.role,
  });

  return res.status(200).json({
    success: true,
    message: 'Email verified successfully',
    data: {
      user: buildUserResponse(user),
    },
  });
});

const resendOTP = asyncHandler(async (req, res) => {
 
  const identifier = getIdentifierFromBody(req.body);
 
  const purpose = req.body.purpose || 'login';

  if (purpose === 'register') {
    const registrationKey = `reg:${identifier}`;
    const rawRegistration = await redis.get(registrationKey);

    if (!rawRegistration) {
      return res.status(400).json({
        success: false,
        message: 'Registration session expired',
      });
    }

    const allowResend = await checkCooldown('register', identifier);
    if (!allowResend) {
      return res.status(429).json({
        success: false,
        message: 'Please wait before requesting another OTP',
      });
    }

    const otp = generateOtp();
    await storeOtp('register', identifier, otp);
    await publishOtpEvent(identifier, otp, 'registration');

    return res.status(200).json(buildOtpResponse('OTP resent successfully', otp));
  }

  const user = await getUserByIdentifier(identifier);
  if (!user) {
    return res.status(200).json({
      success: true,
      message: genericOtpDispatchMessage,
    });
  }

  const otpPurpose = purpose === 'forgot' ? 'forgot' : 'login';
  const allowResend = await checkCooldown(otpPurpose, user.email);
  if (!allowResend) {
    return res.status(429).json({
      success: false,
      message: 'Please wait before requesting another OTP',
    });
  }

  const otp = generateOtp();
  await storeOtp(otpPurpose, user.email, otp);
  await publishOtpEvent(user.email, otp, otpPurpose === 'forgot' ? 'password reset' : 'login');

  return res.status(200).json(buildOtpResponse('OTP resent successfully', otp));
});

const loginUser = asyncHandler(async (req, res) => {
  const identifier = getIdentifierFromBody(req.body);
  const { password } = req.body;
  const user = await getUserByIdentifier(identifier);

  if (!user || !user.isActive || user.provider !== 'email' || !user.passwordHash) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials',
    });
  }

  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials',
    });
  }

  const otp = generateOtp();
  await storeOtp('login', user.email, otp);
  await publishOtpEvent(user.email, otp, 'login');

  return res.status(200).json(
    buildOtpResponse('OTP sent to your email. Please verify to complete login.', otp)
  );
});

const verifyLoginOTP = asyncHandler(async (req, res) => {
  const identifier = getIdentifierFromBody(req.body);
  const { otp } = req.body;
  const user = await getUserByIdentifier(identifier);

  if (!user || !user.isActive) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials',
    });
  }

  const otpResult = await verifyOtp('login', user.email, otp);
  if (!otpResult.ok) {
    return res.status(400).json({
      success: false,
      message: otpResult.reason,
    });
  }

  await issueAuthSession(req, res, user);

  return res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: buildUserResponse(user),
    },
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const identifier = getIdentifierFromBody(req.body);
  const user = await getUserByIdentifier(identifier);

  if (!user || user.provider !== 'email') {
    return res.status(200).json({
      success: true,
      message: genericPasswordResetMessage,
    });
  }

  const otp = generateOtp();
  await storeOtp('forgot', user.email, otp);
  await publishOtpEvent(user.email, otp, 'password reset');

  return res.status(200).json(buildOtpResponse(genericPasswordResetMessage, otp));
});

const verifyForgotPasswordOTP = asyncHandler(async (req, res) => {
  const identifier = getIdentifierFromBody(req.body);
  const { otp } = req.body;

  const user = await getUserByIdentifier(identifier);

  if (!user || user.provider !== 'email') {
    return res.status(400).json({
      success: false,
      message: 'Invalid reset request',
    });
  }

  const otpResult = await verifyOtp('forgot', user.email, otp);

  if (!otpResult.ok) {
    return res.status(400).json({
      success: false,
      message: otpResult.reason,
    });
  }

  await redis.set(
    getForgotPasswordVerifiedKey(user.email),
    '1',
    'EX',
    FORGOT_PASSWORD_VERIFIED_TTL_SECONDS
  );

  return res.status(200).json({
    success: true,
    message: 'OTP verified. You can now reset your password.',
    data: {
      email: user.email,
      username: user.username,
    },
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const identifier = getIdentifierFromBody(req.body);
  const { newPassword } = req.body;
  const user = await getUserByIdentifier(identifier);

  if (!user || user.provider !== 'email') {
    return res.status(400).json({
      success: false,
      message: 'Invalid reset request',
    });
  }

  const verifiedResetState = await redis.get(getForgotPasswordVerifiedKey(user.email));
  if (!verifiedResetState) {
    return res.status(400).json({
      success: false,
      message: 'Password reset OTP verification is required',
    });
  }

  user.passwordHash = await hashPassword(newPassword);
  await user.save();
  await redis.del(getForgotPasswordVerifiedKey(user.email));

  return res.status(200).json({
    success: true,
    message: 'Password reset successful. You can now login with your new password.',
  });
});

const oauthCallback = (provider) =>
  asyncHandler(async (req, res) => {
    const user = req.user;
    
    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL || '/'}/login?error=oauth_failed`);
    }

    await issueAuthSession(req, res, user);

    if (req.authInfo?.isNewUser) {
      await publishToQueue(QUEUES.AUTH_USER_CREATED, {
        email: user.email,
        fullName: user.fullName,
        username: user.username,
        role: user.role,
      });
    }

    const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(
      `${frontend}/login?auth=success&provider=${encodeURIComponent(provider)}`
    );
  });

const logout = asyncHandler(async (req, res) => {
  const accessJti = req.accessTokenJti;
  const refreshToken = req.cookies?.refresh_token || null;

  if (accessJti) {
    await blacklistToken(accessJti, getExpirySeconds(process.env.JWT_ACCESS_EXPIRES_IN || '15m'));
  }

  if (refreshToken) {
    try {
      const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      await blacklistToken(payload.jti, getExpirySeconds(process.env.JWT_REFRESH_EXPIRES_IN || '7d'));
      await revokeRefreshSession(payload.family);
    } catch (error) {
      logger.warn('Refresh token blacklist failed');
    }
  }

  clearAuthCookies(res);

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refresh_token || null;
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Refresh token missing',
    });
  }

  const parsed = (() => {
    try {
      return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      return null;
    }
  })();

  if (!parsed) {
    return res.status(401).json({
      success: false,
      message: 'Invalid refresh token',
    });
  }

  const blacklisted = await redis.get(`bl:${parsed.jti}`);
  if (blacklisted || !parsed.family) {
    return res.status(401).json({
      success: false,
      message: 'Refresh token expired',
    });
  }

  const lockToken = await acquireRefreshSessionLock(parsed.family);
  if (!lockToken) {
    return res.status(409).json({
      success: false,
      message: 'Session refresh already in progress',
    });
  }

  try {
    const currentSessionJti = await getRefreshSessionJti(parsed.family);
    if (!currentSessionJti || currentSessionJti !== parsed.jti) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token expired',
      });
    }

    const user = await User.findById(parsed.sub);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is inactive',
      });
    }

    await blacklistToken(parsed.jti, getExpirySeconds(process.env.JWT_REFRESH_EXPIRES_IN || '7d'));

    const { token: newAccessToken } = signAccessToken(user);
    const { token: newRefreshToken, jti: newRefreshJti } = signRefreshToken(user, {
      familyId: parsed.family,
    });

    await storeRefreshSession(parsed.family, newRefreshJti);
    setAuthCookies(res, newAccessToken, newRefreshToken);

    return res.status(200).json({
      success: true,
      message: 'Token refreshed',
    });
  } finally {
    await releaseRefreshSessionLock(parsed.family, lockToken);
  }
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json({
    success: true,
    user: buildUserResponse(req.user),
  });
});

export {
  registerUser,
  verifyRegisterOTP,
  resendOTP,
  loginUser,
  verifyLoginOTP,
  forgotPassword,
  verifyForgotPasswordOTP,
  resetPassword,
  oauthCallback,
  logout,
  refreshToken,
  getCurrentUser,
};