import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

async function testEmail() {
  console.log('Testing email configuration...\n');
  
  console.log('SMTP Settings:');
  console.log('- Host:', process.env.SMTP_HOST);
  console.log('- Port:', process.env.SMTP_PORT);
  console.log('- User:', process.env.SMTP_USER);
  console.log('- Pass:', process.env.SMTP_PASS ? '***' + process.env.SMTP_PASS.slice(-4) : 'NOT SET');
  console.log('- From:', process.env.FROM_EMAIL);
  console.log('');

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    console.log('Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!\n');

    console.log('Sending test email...');
    const info = await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: process.env.SMTP_USER, // Send to yourself
      subject: 'Test Email from Reservation App',
      text: 'If you receive this, your email configuration is working correctly!',
      html: '<p>If you receive this, your <strong>email configuration</strong> is working correctly!</p>',
    });

    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('\nCheck your inbox at:', process.env.SMTP_USER);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('\n⚠️  Authentication failed. Please check:');
      console.log('1. Go to https://myaccount.google.com/apppasswords');
      console.log('2. Delete the old app password');
      console.log('3. Generate a NEW app password for "Reservation App"');
      console.log('4. Copy the 16-character password (it will look like: abcd efgh ijkl mnop)');
      console.log('5. Remove ALL spaces and update .env: SMTP_PASS=abcdefghijklmnop');
      console.log('6. Make sure 2-Factor Authentication is enabled on your Google account');
    }
  }
}

testEmail();
