import { sendEmail } from "../notification/email.resend.js";

export const sendEmailAlert = async ({ to, subject, text }) => {
  if (!to) {
    throw new Error("Missing alert recipient email");
  }

  const response = await sendEmail(to, subject, text);
  if (!response) {
    throw new Error("Alert email delivery failed");
  }

  return response;
};
