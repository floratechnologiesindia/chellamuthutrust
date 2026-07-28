import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';

function getTransporter() {
  if (!env.gmailUser || !env.gmailAppPassword) return null;
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: env.gmailUser, pass: env.gmailAppPassword },
  });
}

export async function sendDonorEmail(to: string, subject: string, html: string, text?: string) {
  const transporter = getTransporter();
  if (!transporter) throw new AppError('Email service not configured', 500);
  await transporter.sendMail({
    from: `MS Chellamuthu Trust <${env.gmailUser}>`,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ''),
  });
  return { success: true };
}

export async function sendWhatsApp(phone: string, message: string, templateName = 'new_template') {
  if (!env.watiApiEndpoint || !env.watiAccessToken) throw new AppError('WhatsApp service not configured', 500);
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const response = await fetch(`${env.watiApiEndpoint}/api/v1/sendTemplateMessage?whatsappNumber=${cleanPhone}`, {
    method: 'POST',
    headers: { Authorization: env.watiAccessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ template_name: templateName, broadcast_name: 'chellamuthu', parameters: [{ name: 'message', value: message }] }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new AppError(`WhatsApp send failed: ${err}`, 500);
  }
  return { success: true };
}

export async function listWatiTemplates() {
  if (!env.watiApiEndpoint || !env.watiAccessToken) return [];
  const response = await fetch(`${env.watiApiEndpoint}/api/v1/getMessageTemplates`, {
    headers: { Authorization: env.watiAccessToken },
  });
  if (!response.ok) return [];
  return response.json();
}
