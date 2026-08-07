import { apiFetch } from '@/integrations/supabase/client';
import { sendBookingPaymentEmail } from '@/lib/sendBookingEmail';

export function buildFoodPaymentLink(donationId: string): string {
  return `${window.location.origin}/pay?donationId=${donationId}`;
}

export async function sendBookingPaymentNotifications(params: {
  donorEmail?: string | null;
  donorPhone?: string | null;
  donorName: string;
  donationId: string;
  amount: number;
  homeName: string;
  eventDescription?: string;
  date: string;
}): Promise<{ emailSent: boolean; whatsappSent: boolean }> {
  const paymentLink = buildFoodPaymentLink(params.donationId);
  let emailSent = false;
  let whatsappSent = false;

  const message = `Dear ${params.donorName},

Thank you for registering your food sponsorship with M.S. Chellamuthu Trust.

Home: ${params.homeName}
${params.eventDescription ? `${params.eventDescription}\n` : ''}Date: ${params.date}
Amount: ₹${params.amount.toLocaleString('en-IN')}

Please complete your payment using this link:
${paymentLink}

Thank you for your generous support!`;

  if (params.donorEmail) {
    try {
      await sendBookingPaymentEmail({
        donorEmail: params.donorEmail,
        donorName: params.donorName,
        donationId: params.donationId,
        amount: params.amount,
        homeName: params.homeName,
        eventDescription: params.eventDescription,
        date: params.date,
      });
      emailSent = true;
    } catch (error) {
      console.error('Failed to send booking payment email:', error);
    }
  }

  if (params.donorPhone) {
    try {
      const res = await apiFetch('/api/send-whatsapp', {
        method: 'POST',
        body: JSON.stringify({ phone: params.donorPhone, message }),
      });
      whatsappSent = res.ok;
    } catch (error) {
      console.error('Failed to send booking payment WhatsApp:', error);
    }
  }

  return { emailSent, whatsappSent };
}
