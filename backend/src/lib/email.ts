import { config } from '../config';
import { Resend } from 'resend';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

// Initialize Resend client
let resend: Resend | null = null;

function getResendClient() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

/**
 * Send email using Resend API (works on Railway - uses HTTPS not SMTP)
 * Falls back to console logging if API key is not configured
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  console.log('[EMAIL] Sending email:', {
    from: config.email.fromEmail,
    to: options.to,
    subject: options.subject,
  });
  
  const client = getResendClient();
  
  if (client) {
    try {
      const { data, error } = await client.emails.send({
        from: config.email.fromEmail,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      if (error) {
        throw error;
      }

      console.log('[EMAIL] ✅ Email sent successfully to:', options.to, 'ID:', data?.id);
    } catch (error: any) {
      console.error('[EMAIL] ❌ Failed to send email:', error.message);
      console.error('[EMAIL] Error details:', error);
      console.log('[EMAIL] Body (for debugging):', options.text);
      // Don't throw - just log the error so API continues
    }
  } else {
    // Fallback: just log it (for development without API key configured)
    console.log('[EMAIL] ⚠️  Resend API key not configured, logging email body:');
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
