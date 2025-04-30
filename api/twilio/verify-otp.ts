import { VercelRequest, VercelResponse } from '@vercel/node';
import twilio from 'twilio';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phone, code } = req.body;

  // Validate input
  if (!phone || typeof phone !== 'string') {
    return res.status(400).json({ error: 'Phone number is required' });
  }
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Verification code is required' });
  }

  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({ error: 'Invalid phone number format (e.g., +1234567890)' });
  }

  try {
    // Initialize Twilio client
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    // Verify environment variables
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_VERIFY_SERVICE_SID) {
      console.error('Missing Twilio environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Verify OTP
    const verificationCheck = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({
        to: phone,
        code,
      });

    if (verificationCheck.status !== 'approved') {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    console.log('OTP verified:', verificationCheck.sid);
    return res.status(200).json({ sid: verificationCheck.sid, status: 'approved' });
  } catch (error: any) {
    console.error('Twilio verify-otp error:', {
      message: error.message,
      code: error.code,
      status: error.status,
    });
    return res.status(error.status || 500).json({
      error: error.message || 'Failed to verify OTP',
    });
  }
}