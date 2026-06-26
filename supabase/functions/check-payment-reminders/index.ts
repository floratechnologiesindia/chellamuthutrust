import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendReminderEmail(
  gmailUser: string,
  gmailPassword: string,
  donorEmail: string,
  donorName: string,
  subject: string,
  messageBody: string,
) {
  try {
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
          ${subject}
        </h2>
        ${donorName ? `<p style="color: #374151;">Dear ${donorName},</p>` : ''}
        <div style="color: #374151; white-space: pre-line; line-height: 1.6;">
          ${messageBody.replace(/\n/g, '<br/>')}
        </div>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px;">
          This email was sent from MS Chellamuthu Trust Management System.
        </p>
      </div>
    `;

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: { username: gmailUser, password: gmailPassword },
      },
    });

    await client.send({
      from: `MS Chellamuthu Trust <${gmailUser}>`,
      to: donorEmail,
      subject,
      html: htmlBody,
    });

    await client.close();
    console.log(`Reminder email sent to ${donorEmail}`);
  } catch (error) {
    console.error(`Failed to send reminder email to ${donorEmail}:`, error);
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting payment reminder check...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const GMAIL_USER = Deno.env.get("GMAIL_USER");
    const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");
    const emailEnabled = !!(GMAIL_USER && GMAIL_APP_PASSWORD);

    if (!emailEnabled) {
      console.log("Gmail credentials not configured, skipping email notifications");
    }

    // Check for upcoming payments (due within 3 days)
    console.log("Checking for upcoming payment reminders...");
    const { data: upcomingPayments, error: upcomingError } = await supabase
      .rpc('check_recurring_payment_due');

    if (upcomingError) {
      console.error("Error checking upcoming payments:", upcomingError);
      throw upcomingError;
    }

    console.log(`Found ${upcomingPayments?.length || 0} upcoming payments`);

    let upcomingNotificationsCreated = 0;
    let upcomingEmailsSent = 0;

    for (const payment of upcomingPayments || []) {
      const { data: existingNotification } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', payment.donor_id)
        .eq('type', 'recurring_payment_due')
        .gte('created_at', new Date().toISOString().split('T')[0])
        .maybeSingle();

      if (!existingNotification) {
        const daysText = payment.days_until_due === 0
          ? 'today'
          : `in ${payment.days_until_due} day${payment.days_until_due > 1 ? 's' : ''}`;

        const message = `Your recurring donation of ₹${payment.amount} to ${payment.home_name} is due ${daysText}.`;

        const { error: insertError } = await supabase
          .from('notifications')
          .insert({
            user_id: payment.donor_id,
            type: 'recurring_payment_due',
            title: 'Payment Reminder',
            message,
          });

        if (insertError) {
          console.error("Error creating notification:", insertError);
        } else {
          upcomingNotificationsCreated++;
        }

        // Send email reminder
        if (emailEnabled) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', payment.donor_id)
            .maybeSingle();

          if (profile?.email) {
            await sendReminderEmail(
              GMAIL_USER!,
              GMAIL_APP_PASSWORD!,
              profile.email,
              profile.name || 'Donor',
              `Payment Reminder - ₹${payment.amount} due ${daysText}`,
              `${message}\n\nPlease log in to your account to make the payment.\n\nWarm regards,\nMS Chellamuthu Trust`,
            );
            upcomingEmailsSent++;
          }
        }
      }
    }

    // Check for overdue payments
    console.log("Checking for overdue payments...");
    const { data: overduePayments, error: overdueError } = await supabase
      .rpc('check_overdue_payments');

    if (overdueError) {
      console.error("Error checking overdue payments:", overdueError);
      throw overdueError;
    }

    console.log(`Found ${overduePayments?.length || 0} overdue payments`);

    let overdueNotificationsCreated = 0;
    let overdueEmailsSent = 0;

    for (const payment of overduePayments || []) {
      const { data: existingNotification } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', payment.donor_id)
        .eq('type', 'donation_reminder')
        .gte('created_at', new Date().toISOString().split('T')[0])
        .maybeSingle();

      if (!existingNotification) {
        const overdueMessage = `Your recurring donation of ₹${payment.amount} to ${payment.home_name} is ${payment.days_overdue} day${payment.days_overdue > 1 ? 's' : ''} overdue.`;

        const { error: insertError } = await supabase
          .from('notifications')
          .insert({
            user_id: payment.donor_id,
            type: 'donation_reminder',
            title: 'Payment Overdue',
            message: overdueMessage,
          });

        if (insertError) {
          console.error("Error creating overdue notification:", insertError);
        } else {
          overdueNotificationsCreated++;
        }

        // Send overdue email
        if (emailEnabled) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', payment.donor_id)
            .maybeSingle();

          if (profile?.email) {
            await sendReminderEmail(
              GMAIL_USER!,
              GMAIL_APP_PASSWORD!,
              profile.email,
              profile.name || 'Donor',
              `Payment Overdue - ₹${payment.amount} to ${payment.home_name}`,
              `${overdueMessage}\n\nPlease log in to your account to make the payment at your earliest convenience.\n\nWarm regards,\nMS Chellamuthu Trust`,
            );
            overdueEmailsSent++;
          }
        }
      }

      // Update donation status to OVERDUE if not already
      await supabase
        .from('donations')
        .update({ status: 'OVERDUE' })
        .eq('id', payment.donation_id)
        .neq('status', 'OVERDUE');
    }

    const result = {
      success: true,
      upcomingPaymentsFound: upcomingPayments?.length || 0,
      upcomingNotificationsCreated,
      upcomingEmailsSent,
      overduePaymentsFound: overduePayments?.length || 0,
      overdueNotificationsCreated,
      overdueEmailsSent,
      timestamp: new Date().toISOString(),
    };

    console.log("Payment reminder check completed:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in check-payment-reminders function:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
