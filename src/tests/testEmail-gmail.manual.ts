import dotenv from 'dotenv';
import path from 'path';

// Load .env explicitly
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { sendEmail } from '../services/emailService';
import logger from '../utils/logger';

async function testGmail() {
  console.log('Testing Gmail SMTP configuration...');
  console.log('SMTP_HOST:', process.env.SMTP_HOST);
  console.log('SMTP_USER:', process.env.SMTP_USER);
  console.log('SMTP_PORT:', process.env.SMTP_PORT);
  console.log('SMTP_SECURE:', process.env.SMTP_SECURE);
  console.log('EMAIL_FROM:', process.env.EMAIL_FROM);
  
  try {
    const result = await sendEmail({
      to: 'chysavith089@gmail.com', // Sending to yourself for testing
      subject: 'Maplore Test - Gmail SMTP OTP',
      text: 'This is a test email to verify Gmail SMTP configuration for Maplore OTP.',
      html: '<h1>Maplore Test</h1><p>Your test OTP is: <strong>123456</strong></p>'
    });
    
    console.log('Success! Email sent successfully.');
    console.log('Message ID:', result.messageId);
  } catch (error) {
    console.error('Failed to send test email:', error);
  }
}

testGmail();
