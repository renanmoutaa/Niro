import twilio from 'twilio';
import { db } from './db';
import { settings } from '../../packages/db/schema';
import { eq } from 'drizzle-orm';

const getTwilioConfig = async () => {
  const result = await db.select().from(settings);
  const config = result.reduce((acc: any, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {});

  return {
    accountSid: config.twilio_sid || process.env.TWILIO_ACCOUNT_SID,
    authToken: config.twilio_token || process.env.TWILIO_AUTH_TOKEN,
    fromNumber: config.twilio_phone || process.env.TWILIO_PHONE_NUMBER
  };
};

export interface SendMessageParams {
  to: string;
  body: string;
  type: 'sms' | 'whatsapp';
}

export const sendMessage = async ({ to, body, type }: SendMessageParams) => {
  const config = await getTwilioConfig();

  if (!config.accountSid || !config.authToken) {
    throw new Error('Configuração do Twilio ausente. Por favor, vincule sua conta no painel de configurações.');
  }

  const client = twilio(config.accountSid, config.authToken);
  const formattedTo = type === 'whatsapp' ? `whatsapp:${to}` : to;
  const formattedFrom = type === 'whatsapp' ? `whatsapp:${config.fromNumber}` : config.fromNumber;

  try {
    const message = await client.messages.create({
      body,
      from: formattedFrom,
      to: formattedTo,
    });
    return message;
  } catch (error) {
    console.error('Twilio Error:', error);
    throw error;
  }
};
