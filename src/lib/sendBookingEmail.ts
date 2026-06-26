import { supabase } from '@/integrations/supabase/client';

interface SendBookingEmailParams {
  donorEmail: string;
  donorName: string;
  donationId: string;
  amount: number;
  homeName: string;
  eventDescription?: string;
  date: string;
}

export async function sendBookingPaymentEmail({
  donorEmail,
  donorName,
  donationId,
  amount,
  homeName,
  eventDescription,
  date,
}: SendBookingEmailParams) {
  const paymentLink = `${window.location.origin}/pay?donationId=${donationId}`;

  const messageBody = `Your booking has been confirmed with the following details:

Home: ${homeName}
${eventDescription ? `Event: ${eventDescription}\n` : ''}Date: ${date}
Amount: ₹${amount.toLocaleString('en-IN')}

Please complete your payment using the link below:

${paymentLink}

If you have any questions, please contact us.

Thank you for your generous support!`;

  try {
    await supabase.functions.invoke('send-donor-report', {
      body: {
        donor_email: donorEmail,
        donor_name: donorName,
        subject: 'Booking Confirmed — Payment Required',
        message_body: messageBody,
      },
    });
  } catch (error) {
    console.error('Failed to send booking email:', error);
  }
}
