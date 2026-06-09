import { subscribeToQueue } from "./rabbitmq.broker.js";
import { sendEmail } from "../email.resend.js";

const QUEUE_PREFIX = process.env.QUEUE_PREFIX || "DRISHYA";
const BRAND_NAME = process.env.BRAND_NAME || "Drishya";
const SUPPORT_EMAIL = process.env.BRAND_SUPPORT_EMAIL || "support@drishya.com";

const QUEUES = {
  AUTH_OTP: `${QUEUE_PREFIX}.AUTH.OTP`,
  AUTH_USER_CREATED: `${QUEUE_PREFIX}.AUTH.USER_CREATED`,
  AUTH_USER_LOGGED_IN: `${QUEUE_PREFIX}.AUTH.USER_LOGGED_IN`,
  MONITOR_DOWN: `${QUEUE_PREFIX}.MONITOR.DOWN`,
  MONITOR_RECOVERED: `${QUEUE_PREFIX}.MONITOR.RECOVERED`,
  INCIDENT_CREATED: `${QUEUE_PREFIX}.INCIDENT.CREATED`,
};

const buildOtpTemplate = ({ otp, purpose, ttlMinutes }) => {
  const actionMap = {
    register: "Complete your signup",
    registration: "Complete your signup",
    login: "Complete your login",
    forgot: "Reset your password",
    "password reset": "Reset your password",
  };
  const actionText = actionMap[purpose] || "Verify your request";
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; color: #333;">
      <h2 style="color: #2c3e50;">${BRAND_NAME} Verification Code</h2>
      <p>${actionText} using the OTP below:</p>
      <div style="font-size: 24px; font-weight: bold; letter-spacing: 4px; margin: 20px 0;">${otp}</div>
      <p>This code expires in <strong>${ttlMinutes} minutes</strong>.</p>
      <p>If you did not request this, please contact ${SUPPORT_EMAIL}.</p>
    </div>
  `;
};

export async function startNotificationListeners() {
  const subscriptions = [];
  const register = (queueName, handler) => {
    subscriptions.push(subscribeToQueue(queueName, handler));
  };

  // ─── AUTH EVENTS ───

  register(QUEUES.AUTH_OTP, async (data) => {
    const purposeLabel = data.purpose ? ` - ${data.purpose}` : "";
    const subject = `${BRAND_NAME} OTP Verification${purposeLabel}`;
    const text = `Your OTP code is ${data.otp}. It expires in ${data.ttlMinutes} minutes.`;
    const html = buildOtpTemplate({
      otp: data.otp,
      purpose: data.purpose,
      ttlMinutes: data.ttlMinutes,
    });
    await sendEmail(data.email, subject, text, html);
  });

  register(QUEUES.AUTH_USER_CREATED, async (data) => {
    const customerName = `${data.fullName?.firstName || ""} ${data.fullName?.lastName || ""}`.trim();

    const emailHTMLTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; color: #333;">
        <h2 style="color: #2c3e50;">Welcome to ${BRAND_NAME} 🚀</h2>

        <p>Hi <strong>${customerName || "there"}</strong>,</p>

        <p>
          We're excited to have you onboard! Your ${BRAND_NAME} account has been
          successfully created.
        </p>

        <p>
          You can now explore the platform and start using all available features.
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />

        <p>
          If you ever need help, just reply to this email — we're here for you.
        </p>

        <p style="margin-top: 30px;">
          Best regards,<br/>
          <strong>The ${BRAND_NAME} Team</strong>
        </p>

        <p style="font-size: 12px; color: #888;">
          This is an automated email confirming your account registration.
        </p>
      </div>
    `;

    await sendEmail(
      data.email,
      `Welcome to ${BRAND_NAME}!`,
      `Your ${BRAND_NAME} account has been created successfully`,
      emailHTMLTemplate
    );
  });

  register(QUEUES.AUTH_USER_LOGGED_IN, async (data) => {
    const customerName = `${data.fullName?.firstName || ""} ${data.fullName?.lastName || ""}`.trim();
    const loginTime = new Date().toLocaleString();

    const emailHTMLTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; color: #333;">
        <h2 style="color: #c0392b;">New Login Detected 🔐</h2>

        <p>Hi <strong>${customerName || "there"}</strong>,</p>

        <p>
          We noticed a successful login to your ${BRAND_NAME} account with the
          following details:
        </p>

        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0;"><strong>Date & Time</strong></td>
            <td style="padding: 8px 0;">${loginTime}</td>
          </tr>
          ${data.ipAddress ? `
          <tr>
            <td style="padding: 8px 0;"><strong>IP Address</strong></td>
            <td style="padding: 8px 0;">${data.ipAddress}</td>
          </tr>` : ""}
          ${data.userAgent ? `
          <tr>
            <td style="padding: 8px 0;"><strong>Device</strong></td>
            <td style="padding: 8px 0;">${data.userAgent}</td>
          </tr>` : ""}
        </table>

        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />

        <p>
          <strong>If this was you</strong>, no further action is required.
        </p>

        <p>
          <strong>If this wasn't you</strong>, please reset your password
          immediately and contact support.
        </p>

        <p style="margin-top: 30px;">
          Stay safe,<br/>
          <strong>The ${BRAND_NAME} Security Team</strong>
        </p>

        <p style="font-size: 12px; color: #888;">
          This security alert was generated automatically.
        </p>
      </div>
    `;

    await sendEmail(
      data.email,
      "Security Alert: New Login Detected",
      `We detected a new login to your ${BRAND_NAME} account`,
      emailHTMLTemplate
    );
  });

  // ─── MONITORING EVENTS ───

  register(QUEUES.MONITOR_DOWN, async (data) => {
    const emailHTMLTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; color: #333;">
        <h2 style="color: #e74c3c;">🚨 Monitor Down Alert</h2>

        <p>Your monitored endpoint is experiencing issues:</p>

        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0;"><strong>URL</strong></td>
            <td style="padding: 8px 0;">${data.url}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Status</strong></td>
            <td style="padding: 8px 0; color: #e74c3c;"><strong>DOWN</strong></td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Consecutive Failures</strong></td>
            <td style="padding: 8px 0;">${data.failCount || "N/A"}</td>
          </tr>
        </table>

        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />

        <p>Please investigate immediately. Check the ${BRAND_NAME} dashboard for more details.</p>

        <p style="margin-top: 30px;">
          — <strong>The ${BRAND_NAME} Monitoring System</strong>
        </p>
      </div>
    `;

    await sendEmail(
      data.email,
      `🚨 Monitor Down: ${data.url}`,
      `Your monitor ${data.url} is DOWN with ${data.failCount} consecutive failures`,
      emailHTMLTemplate
    );
  });

  register(QUEUES.MONITOR_RECOVERED, async (data) => {
    const emailHTMLTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; color: #333;">
        <h2 style="color: #27ae60;">✅ Monitor Recovered</h2>

        <p>Great news! Your monitored endpoint is back online:</p>

        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0;"><strong>URL</strong></td>
            <td style="padding: 8px 0;">${data.url}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Status</strong></td>
            <td style="padding: 8px 0; color: #27ae60;"><strong>UP</strong></td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Downtime</strong></td>
            <td style="padding: 8px 0;">${data.downtime || "N/A"}</td>
          </tr>
        </table>

        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />

        <p>The incident has been automatically resolved.</p>

        <p style="margin-top: 30px;">
          — <strong>The ${BRAND_NAME} Monitoring System</strong>
        </p>
      </div>
    `;

    await sendEmail(
      data.email,
      `✅ Monitor Recovered: ${data.url}`,
      `Your monitor ${data.url} is back UP`,
      emailHTMLTemplate
    );
  });

  register(QUEUES.INCIDENT_CREATED, async (data) => {
    const emailHTMLTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; color: #333;">
        <h2 style="color: #e74c3c;">⚠️ New Incident Created</h2>

        <p>An incident has been automatically created for your monitor:</p>

        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0;"><strong>Monitor</strong></td>
            <td style="padding: 8px 0;">${data.url || data.monitorId}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Incident ID</strong></td>
            <td style="padding: 8px 0;">${data.incidentId}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Failures</strong></td>
            <td style="padding: 8px 0;">${data.failCount}</td>
          </tr>
        </table>

        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />

        <p>AI analysis is running. Check your ${BRAND_NAME} dashboard for insights and suggested fixes.</p>

        <p style="margin-top: 30px;">
          — <strong>The ${BRAND_NAME} Monitoring System</strong>
        </p>
      </div>
    `;

    await sendEmail(
      data.email,
      `⚠️ Incident: ${data.url || "Monitor Alert"}`,
      `A new incident was created for monitor ${data.url || data.monitorId}`,
      emailHTMLTemplate
    );
  });

  return Promise.all(subscriptions);
}
