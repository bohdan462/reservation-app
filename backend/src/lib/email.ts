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
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">✓ Reservation Confirmed</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Dear ${guestName},</p>
    
    <p style="font-size: 16px; margin-bottom: 25px;">Your reservation has been confirmed!</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #666;">Date:</td>
          <td style="padding: 8px 0; text-align: right;">${date}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #666;">Time:</td>
          <td style="padding: 8px 0; text-align: right;">${time}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #666;">Party Size:</td>
          <td style="padding: 8px 0; text-align: right;">${partySize} ${partySize === 1 ? 'person' : 'people'}</td>
        </tr>
      </table>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${manageUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Manage Reservation</a>
    </div>
    
    <p style="font-size: 14px; color: #666; text-align: center; margin-top: 30px;">
      Need to make changes? Click the button above to edit or cancel your reservation.
    </p>
    
    <p style="font-size: 16px; margin-top: 30px;">Thank you for choosing our restaurant!</p>
  </div>
</body>
</html>
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
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">⏳ Reservation Pending</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Dear ${guestName},</p>
    
    <p style="font-size: 16px; margin-bottom: 25px;">We have received your reservation request and our team will review it shortly.</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #666;">Date:</td>
          <td style="padding: 8px 0; text-align: right;">${date}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #666;">Time:</td>
          <td style="padding: 8px 0; text-align: right;">${time}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #666;">Party Size:</td>
          <td style="padding: 8px 0; text-align: right;">${partySize} ${partySize === 1 ? 'person' : 'people'}</td>
        </tr>
      </table>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${manageUrl}" style="display: inline-block; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Manage Reservation</a>
    </div>
    
    <p style="font-size: 14px; color: #666; text-align: center; margin-top: 30px;">
      Need to make changes? Click the button above to edit or cancel your reservation.
    </p>
    
    <p style="font-size: 16px; margin-top: 30px;">Thank you!</p>
  </div>
</body>
</html>
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
