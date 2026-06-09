import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import redis from '../db/redis.js';

const accessExpiry = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const refreshExpiry = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const refreshSessionLockSeconds = Number(process.env.REFRESH_SESSION_LOCK_SECONDS || 5);

const sameSitePolicy = (process.env.COOKIE_SAME_SITE || 'lax').toLowerCase();
const secureCookie =
  process.env.COOKIE_SECURE != null
    ? String(process.env.COOKIE_SECURE).toLowerCase() === 'true'
    : process.env.NODE_ENV === 'production';

const buildBlacklistKey = (jti) => `bl:${jti}`;
const buildRefreshSessionKey = (familyId) => `rt:${familyId}`;
const buildRefreshLockKey = (familyId) => `rt:lock:${familyId}`;

const signAccessToken = (user) => {
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    { sub: user._id.toString(), role: user.role, jti },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: accessExpiry }
  );
  return { token, jti };
};

const signRefreshToken = (user, options = {}) => {
  const familyId = options.familyId || crypto.randomUUID();
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    { sub: user._id.toString(), jti, family: familyId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: refreshExpiry }
  );
  return { token, jti, familyId };
};

const blacklistToken = async (jti, expiresInSeconds) => {
  if (!jti) return;
  await redis.set(buildBlacklistKey(jti), '1', 'EX', expiresInSeconds);
};

const getExpirySeconds = (expiresInValue) => {
  if (typeof expiresInValue === 'number') return expiresInValue;
  const match = String(expiresInValue).match(/^(\d+)([smhd])$/);
  if (!match) return 0;
  const amount = Number(match[1]);
  const unit = match[2];
  const unitSeconds = { s: 1, m: 60, h: 3600, d: 86400 }[unit];
  return amount * unitSeconds;
};

const getAccessCookieOptions = () => ({
  httpOnly: true,
  secure: secureCookie,
  sameSite: sameSitePolicy,
  maxAge: getExpirySeconds(accessExpiry) * 1000,
});

const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: secureCookie,
  sameSite: sameSitePolicy,
  maxAge: getExpirySeconds(refreshExpiry) * 1000,
});

const getRefreshExpirySeconds = () => getExpirySeconds(refreshExpiry);

const storeRefreshSession = async (familyId, jti) => {
  await redis.set(buildRefreshSessionKey(familyId), jti, 'EX', getRefreshExpirySeconds());
};

const getRefreshSessionJti = async (familyId) => {
  return redis.get(buildRefreshSessionKey(familyId));
};

const revokeRefreshSession = async (familyId) => {
  if (!familyId) return;
  await redis.del(buildRefreshSessionKey(familyId));
};

const acquireRefreshSessionLock = async (familyId) => {
  const lockToken = crypto.randomUUID();
  const result = await redis.set(
    buildRefreshLockKey(familyId),
    lockToken,
    'EX',
    refreshSessionLockSeconds,
    'NX'
  );

  if (result !== 'OK') {
    return null;
  }

  return lockToken;
};

const releaseRefreshSessionLock = async (familyId, lockToken) => {
  if (!familyId || !lockToken) return;
  const key = buildRefreshLockKey(familyId);
  const currentToken = await redis.get(key);
  if (currentToken === lockToken) {
    await redis.del(key);
  }
};

export {
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
};
