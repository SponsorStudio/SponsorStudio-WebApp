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

  const { phone } = req.body;

  if (!phone || !/^\+[1-9]\d{1,14}$/.test(phone)) {
    return res.status(400).json({ error: 'Invalid phone number format' });
  }

  try {
    const verification = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verifications
      .create({ to: phone, channel: 'sms' });

    console.log('OTP sent:', verification.sid);
    res.json({ sid: verification.sid });
  } catch (error: any) {
    console.error('Twilio send OTP error:', error);
    res.status(500).json({ error: `Failed to send OTP: ${error.message}` });
  }
}