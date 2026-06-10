import { sendEmail } from "../notification/email.resend.js";

export const sendEmailAlert = async ({ to, subject, text }) => {
  const recipients = Array.isArray(to) ? to.filter(Boolean) : to;
  if (!recipients || (Array.isArray(recipients) && recipients.length === 0)) {
    throw new Error("Missing alert recipient email");
  }

  const response = await sendEmail(recipients, subject, text);
  if (!response) {
    throw new Error("Alert email delivery failed");
  }

  return response;
};
