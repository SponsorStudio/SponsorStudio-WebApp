import type { VercelRequest, VercelResponse } from '@vercel/node';
import Twilio from 'twilio';

const client = Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phone, code } = req.body;

  if (!phone || !code) {
    return res.status(400).json({ error: 'Phone number and code are required' });
  }

  try {
    const verificationCheck = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verificationChecks
      .create({ to: phone, code });

    if (verificationCheck.status !== 'approved') {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    console.log('OTP verified:', verificationCheck.sid);
    res.json({ status: verificationCheck.status });
  } catch (error: any) {
    console.error('Twilio verify OTP error:', error);
    res.status(500).json({ error: `Failed to verify OTP: ${error.message}` });
  }
}