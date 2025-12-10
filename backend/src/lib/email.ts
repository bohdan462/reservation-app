import { config } from '../config';
import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

// Create reusable transporter
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter && config.email.smtpHost && config.email.smtpUser && config.email.smtpPass) {
    transporter = nodemailer.createTransport({
      host: config.email.smtpHost,
      port: config.email.smtpPort,
      secure: config.email.smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: config.email.smtpUser,
        pass: config.email.smtpPass,
      },
      // Add connection timeout settings for Railway
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
  }
  return transporter;
}

/**
 * Send email using nodemailer with timeout
 * Falls back to console logging if SMTP is not configured
 * Runs with timeout to avoid blocking API response too long
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  console.log('[EMAIL] Sending email:', {
    from: config.email.fromEmail,
    to: options.to,
    subject: options.subject,
  });
  
  const smtp = getTransporter();
  
  if (smtp) {
    try {
      // Send with 30 second timeout (Railway can be slower)
      await Promise.race([
        smtp.sendMail({
          from: config.email.fromEmail,
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Email timeout after 30s')), 30000)
        )
      ]);
      console.log('[EMAIL] ✅ Email sent successfully to:', options.to);
    } catch (error: any) {
      console.error('[EMAIL] ❌ Failed to send email:', error.message);
      console.error('[EMAIL] Error details:', error);
      console.log('[EMAIL] Body (for debugging):', options.text);
      // Don't throw - just log the error so API continues
    }
  } else {
    // Fallback: just log it (for development without SMTP configured)
    console.log('[EMAIL] ⚠️  SMTP not configured, logging email body:');
    console.log('[EMAIL] Body:', options.text);
  }
}

export async function sendReservationConfirmation(
  email: string,
  guestName: string,
  date: string,
  time: string,
  partySize: number,
  cancelToken: string
): Promise<void> {
  const manageUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/manage/${cancelToken}`;
  
  return sendEmail({
    to: email,
    subject: 'Reservation Confirmed',
    text: `
Dear ${guestName},

Your reservation has been confirmed!

Date: ${date}
Time: ${time}
Party Size: ${partySize}

Manage your reservation (edit or cancel): ${manageUrl}

Thank you for choosing our restaurant!
    `.trim(),
  });
}

export async function sendReservationPending(
  email: string,
  guestName: string,
  date: string,
  time: string,
  partySize: number,
  cancelToken: string
): Promise<void> {
  const manageUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/manage/${cancelToken}`;

  return sendEmail({
    to: email,
    subject: 'Reservation Request Received',
    text: `
Dear ${guestName},

We have received your reservation request for ${partySize} people on ${date} at ${time}.

Our team will review your request and get back to you shortly.

Manage your reservation: ${manageUrl}

Thank you!
    `.trim(),
  });
}

export async function sendWaitlistConfirmation(
  email: string,
  guestName: string,
  date: string,
  time: string,
  partySize: number
): Promise<void> {
  return sendEmail({
    to: email,
    subject: 'Added to Waitlist',
    text: `
Dear ${guestName},

You have been added to the waitlist for ${partySize} people on ${date} at ${time}.

We will notify you if a spot becomes available.

Thank you for your patience!
    `.trim(),
  });
}

export async function sendWaitlistPromotion(
  email: string,
  guestName: string,
  date: string,
  time: string,
  partySize: number,
  cancelToken: string
): Promise<void> {
  const manageUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/manage/${cancelToken}`;
  
  return sendEmail({
    to: email,
    subject: 'Reservation Confirmed - Promoted from Waitlist!',
    text: `
Dear ${guestName},

Great news! A spot has opened up and your reservation is now confirmed!

Date: ${date}
Time: ${time}
Party Size: ${partySize}

Manage your reservation: ${manageUrl}

See you soon!
    `.trim(),
  });
}

export async function sendReservationUpdated(
  email: string,
  guestName: string,
  date: string,
  time: string,
  partySize: number,
  cancelToken: string
): Promise<void> {
  const manageUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/manage/${cancelToken}`;
  
  return sendEmail({
    to: email,
    subject: 'Reservation Updated',
    text: `
Dear ${guestName},

Your reservation has been updated and is now pending review.

Updated Details:
Date: ${date}
Time: ${time}
Party Size: ${partySize}

We will confirm the changes shortly.

Manage your reservation: ${manageUrl}

Thank you!
    `.trim(),
  });
}

export async function sendReservationCancelled(
  email: string,
  guestName: string,
  date: string,
  time: string
): Promise<void> {
  return sendEmail({
    to: email,
    subject: 'Reservation Cancelled',
    text: `
Dear ${guestName},

Your reservation for ${date} at ${time} has been cancelled.

We hope to see you again soon!

Thank you!
    `.trim(),
  });
}
