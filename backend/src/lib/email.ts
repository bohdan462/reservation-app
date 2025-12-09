import { config } from '../config';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Placeholder email sender
 * In production, integrate with a service like SendGrid, AWS SES, or Nodemailer
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  console.log('[EMAIL] Sending email:', {
    from: config.email.fromEmail,
    to: options.to,
    subject: options.subject,
  });
  
  // In a real implementation, connect to SMTP server or email service API
  // For now, just log it
  console.log('[EMAIL] Body:', options.text);
  
  // Simulate async operation
  return Promise.resolve();
}

export async function sendReservationConfirmation(
  email: string,
  guestName: string,
  date: string,
  time: string,
  partySize: number,
  cancelToken: string
): Promise<void> {
  const cancelUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/cancel/${cancelToken}`;
  
  return sendEmail({
    to: email,
    subject: 'Reservation Confirmed',
    text: `
Dear ${guestName},

Your reservation has been confirmed!

Date: ${date}
Time: ${time}
Party Size: ${partySize}

To cancel this reservation, please visit: ${cancelUrl}

Thank you for choosing our restaurant!
    `.trim(),
  });
}

export async function sendReservationPending(
  email: string,
  guestName: string,
  date: string,
  time: string,
  partySize: number
): Promise<void> {
  return sendEmail({
    to: email,
    subject: 'Reservation Request Received',
    text: `
Dear ${guestName},

We have received your reservation request for ${partySize} people on ${date} at ${time}.

Our team will review your request and get back to you shortly.

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
  const cancelUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/cancel/${cancelToken}`;
  
  return sendEmail({
    to: email,
    subject: 'Reservation Confirmed - Promoted from Waitlist!',
    text: `
Dear ${guestName},

Great news! A spot has opened up and your reservation is now confirmed!

Date: ${date}
Time: ${time}
Party Size: ${partySize}

To cancel this reservation, please visit: ${cancelUrl}

See you soon!
    `.trim(),
  });
}
