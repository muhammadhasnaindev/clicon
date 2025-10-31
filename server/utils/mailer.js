// server/utils/mailer.js
// Summary: Minimal mailer — real SMTP when DEMO_MODE=false, else console log.

/*
[PRO] Purpose: Provide a tiny email API usable in dev and prod.
Context: In dev/demo, we log emails; in prod (DEMO_MODE=false) we send via SMTP.
Edge cases: Missing SMTP config → always log; caller still gets {ok:true, dev:true}.
Notes: Keep messages user-safe; logs are dev-facing.
*/
import dotenv from "dotenv";
dotenv.config();
import nodemailer from "nodemailer";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
  DEMO_MODE = "true",
  CLIENT_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173",
} = process.env;

// DEMO_MODE=false => real SMTP. Otherwise console log only.
const IS_DEMO = String(DEMO_MODE).toLowerCase() !== "false";

let transporter = null;
function hasSmtp() {
  return Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS);
}
function getTransporter() {
  if (!hasSmtp()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465, // 587 STARTTLS (secure=false)
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    console.log(
      `[mailer] Using SMTP host=${SMTP_HOST} port=${SMTP_PORT} secure=${Number(SMTP_PORT) === 465}`
    );
  }
  return transporter;
}

// ---------------- core send ----------------
export async function sendMail(to, subject, text, html) {
  if (IS_DEMO || !hasSmtp()) {
    console.log(`\n[DEV EMAIL]\nTo: ${to}\nSubj: ${subject}\n\n${text || html || ""}\n`);
    return { ok: true, sent: false, dev: true };
  }
  const t = getTransporter();
  const from = SMTP_FROM || SMTP_USER || "no-reply@clicon.local";
  try {
    await t.sendMail({ from, to, subject, text, html });
    return { ok: true, sent: true };
  } catch (err) {
    console.error("mailer send error:", err?.message || err);
    return { ok: true, sent: false, error: true }; // non-fatal to callers
  }
}
// alias kept for backwards compatibility
export const sendEmail = sendMail;

// ---------------- helpers used across the app ----------------
export async function sendVerificationEmail(email, code) {
  return sendMail(
    email,
    "Verify your Clicon email",
    `Your verification code is: ${code}`,
    `<p>Your verification code is: <b>${code}</b></p>`
  );
}
export async function sendTempPassword(email, password) {
  return sendMail(
    email,
    "Your Clicon temporary password",
    `Welcome! Your temporary password is: ${password}\n\nPlease sign in and change it from Settings.`,
    `<p>Welcome! Your temporary password is: <b>${password}</b></p><p>Please sign in and change it from <i>Settings</i>.</p>`
  );
}
export async function sendResetCode(email, code) {
  return sendMail(
    email,
    "Clicon password reset code",
    `Your reset code is: ${code}\n\nUse this code to set a new password.`,
    `<p>Your reset code is: <b>${code}</b></p><p>Use this code to set a new password.</p>`
  );
}
export async function sendNewsletterThanks(email) {
  return sendMail(
    email,
    "Thanks for subscribing",
    "You're subscribed to Clicon updates. You'll receive an email when we publish new posts.",
    `<p>You're subscribed to Clicon updates. You'll receive an email when we publish new posts.</p>`
  );
}
export async function sendNewPostEmail(email, post) {
  const id = post?._id || post?.id || "";
  const link = `${CLIENT_ORIGIN.replace(/\/$/, "")}/blog/${id}`;
  const title = post?.title || "New post";
  const plainExcerpt = String(post?.content || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
  return sendMail(
    email,
    `New post: ${title}`,
    `${title}\n\n${plainExcerpt}\n\nRead more: ${link}\n`,
    `<p><b>${title}</b></p><p>${plainExcerpt}</p><p><a href="${link}" target="_blank" rel="noopener">Read more</a></p>`
  );
}

// ---------------- support tickets ----------------
export async function sendSupportThanks(email, subject) {
  const s = `We've received your message: “${subject}”`;
  const body = `Thanks for contacting Clicon Support.\n\nWe received your message and will reply shortly.\n\nSubject: ${subject}\n\n— Clicon Support`;
  const html = `<p>Thanks for contacting <b>Clicon Support</b>.</p><p>We received your message and will reply shortly.</p><p><b>Subject:</b> ${subject}</p><p>— Clicon Support</p>`;
  return sendMail(email, s, body, html);
}
export async function sendSupportReply(email, subject, replyText) {
  const s = `Re: ${subject}`;
  const body = `${replyText}\n\n— Clicon Support`;
  const html = `<p>${(replyText || "").replace(/\n/g, "<br/>")}</p><p>— <b>Clicon Support</b></p>`;
  return sendMail(email, s, body, html);
}

export default {
  sendMail,
  sendEmail,
  sendVerificationEmail,
  sendTempPassword,
  sendResetCode,
  sendNewsletterThanks,
  sendNewPostEmail,
  sendSupportThanks,
  sendSupportReply,
};
