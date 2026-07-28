import { Request, Response } from 'express';
import { handleRazorpayWebhook, verifyWebhookSignature } from '../services/razorpay.service.js';
import { env } from '../config/env.js';

/** Raw-body Razorpay webhook (registered before express.json in index.ts). */
export async function razorpayWebhookHandler(req: Request, res: Response) {
  const signature = req.headers['x-razorpay-signature'];
  if (!signature || typeof signature !== 'string') {
    return res.status(400).json({ error: 'Missing X-Razorpay-Signature header' });
  }

  if (!env.razorpayWebhookSecret) {
    return res.status(500).json({ error: 'Razorpay webhook secret is not configured' });
  }

  const rawBody = req.body as Buffer;
  if (!Buffer.isBuffer(rawBody)) {
    return res.status(400).json({ error: 'Invalid webhook body' });
  }

  if (!verifyWebhookSignature(rawBody, signature)) {
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  try {
    const result = await handleRazorpayWebhook(rawBody);
    return res.json(result);
  } catch (err) {
    console.error('Razorpay webhook error:', err);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}
