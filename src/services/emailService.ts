import nodemailer from "nodemailer";
import logger from "../utils/logger";

interface MailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

const createTransporter = async () => {
  // Use Ethereal for testing if no real credentials are provided
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    logger.warn("SMTP credentials not provided, using Ethereal for testing");
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

export const sendEmail = async (options: MailOptions) => {
  try {
    const transporter = await createTransporter();
    
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Maplore" <no-reply@maplore.com>',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    logger.info(`Email sent: ${info.messageId}`);
    
    // If using Ethereal, log the preview URL
    if (info.envelope && info.envelope.from === "smtp.ethereal.email" || (process.env.SMTP_HOST === "smtp.ethereal.email") || (!process.env.SMTP_HOST)) {
       const previewUrl = nodemailer.getTestMessageUrl(info);
       if (previewUrl) {
         logger.info(`Preview URL: ${previewUrl}`);
       }
    }
    
    return info;
  } catch (error) {
    logger.error("Error sending email:", error);
    throw new Error("Email could not be sent");
  }
};
