import { Resend } from "resend";
import { logger } from "./logger.utils.js";

const fromAddress = process.env.EMAIL_FROM || "Drishya <no-reply@example.com>";

if (!process.env.RESEND_API_KEY) {
  logger.warn("Missing RESEND_API_KEY in environment variables");
} else {
  logger.info("Email service configured");
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sendEmail = async (to, subject, text, html, retries = 3) => {
  if (!resend) {
    logger.error("Cannot send email: RESEND_API_KEY is not configured");
    return null;
  }

  const noRecipients = !to || (typeof to === "string" && !to.trim());
  if (noRecipients) {
    logger.warn("No recipients for email:", subject);
    return null;
  }

  const attempts = Array.from({ length: retries }, (_, index) => index + 1);
  for (const attempt of attempts) {
    try {
      logger.info(`Sending email (attempt ${attempt}/${retries}): ${subject}`);

      const emailPayload = {
        from: fromAddress,
        to: Array.isArray(to) ? to : [to],
        subject,
        text: text || undefined,
        html: html || (text ? `<p>${text}</p>` : undefined),
      };

      const response = await resend.emails.send(emailPayload);
      if (response?.error) {
        const errorMsg = response.error.message || JSON.stringify(response.error);
        logger.error("Resend API returned error:", errorMsg);
        throw new Error(`Resend API Error: ${errorMsg}`);
      }

      if (!response || !response.data) {
        logger.error("Invalid response from Resend API:", JSON.stringify(response));
        throw new Error("Invalid response from Resend API");
      }

      logger.info("Email sent successfully:", response.data.id);
      return response;
    } catch (error) {
      logger.error(`Send email failed (attempt ${attempt}/${retries})`);
      logger.error(error);

      if (attempt < retries) {
        const waitTime = attempt * 2000;
        logger.info(`Retrying in ${waitTime / 1000}s...`);
        await delay(waitTime);
      } else {
        logger.error(`All ${retries} attempts failed for email to:`, to);
        return null;
      }
    }
  }

  return null;
};

export { sendEmail };
