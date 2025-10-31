// utils/sendEmail.js
// Backwards compatibility: use the real SMTP mailer.

export { sendMail as sendEmail } from "../utils/mailer.js";
import { sendNewPostEmail, } from "../utils/mailer.js";
// ya path adjust: "../../server/utils/mailer.js"
export { sendNewPostEmail, };