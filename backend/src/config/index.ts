import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  database: {
    url: process.env.DATABASE_URL || '',
  },
  
  businessRules: {
    maxAutoConfirmPartySize: parseInt(process.env.MAX_AUTO_CONFIRM_PARTY_SIZE || '8', 10),
    maxCoversPerTimeSlot: parseInt(process.env.MAX_COVERS_PER_TIME_SLOT || '50', 10),
    minNoticeMinutes: parseInt(process.env.MIN_NOTICE_MINUTES || '60', 10),
    openingTime: process.env.OPENING_TIME || '11:00',
    closingTime: process.env.CLOSING_TIME || '22:00',
  },
  
  email: {
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    fromEmail: process.env.FROM_EMAIL || 'reservations@restaurant.com',
  },
};
