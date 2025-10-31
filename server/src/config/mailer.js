import nodemailer from "nodemailer";

let transporter;

/**
 * Gmail SMTP using App Password (recommended).
 * Requires:
 * - process.env.GMAIL_USER
 * - process.env.GMAIL_APP_PASSWORD
 */
if (process.env.SMTP_PROVIDER === "gmail" && process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
} else {
  // Fallback: log emails to console in dev
  console.warn("[mailer] Gmail SMTP not configured. Emails will be logged to console.");
}

export async function sendEmail(to, subject, html) {
  if (!transporter) {
    console.log("\n[DEV EMAIL]", { to, subject, html: html.replace(/\n/g, " ") });
    return;
  }
  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.GMAIL_USER,
    to,
    subject,
    html,
  });
}
