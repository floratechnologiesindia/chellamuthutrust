import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GMAIL_USER = Deno.env.get('GMAIL_USER');
    const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD');

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      throw new Error('GMAIL_USER and GMAIL_APP_PASSWORD must be configured.');
    }

    const { donor_email, donor_name, subject, message_body, html_body } = await req.json();

    if (!donor_email || !subject || !message_body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: donor_email, subject, message_body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use pre-rendered html_body if provided, otherwise wrap message_body
    const htmlBody = html_body || `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
          ${subject}
        </h2>
        ${donor_name ? `<p style="color: #374151;">Dear ${donor_name},</p>` : ''}
        <div style="color: #374151; white-space: pre-line; line-height: 1.6;">
          ${message_body.replace(/\n/g, '<br/>')}
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
        auth: {
          username: GMAIL_USER,
          password: GMAIL_APP_PASSWORD,
        },
      },
    });

    await client.send({
      from: `MS Chellamuthu Trust <${GMAIL_USER}>`,
      to: donor_email,
      subject: subject,
      html: htmlBody,
    });

    await client.close();

    console.log(`Email sent successfully to ${donor_email} via Gmail SMTP`);

    return new Response(
      JSON.stringify({ success: true, message: `Email sent to ${donor_email}` }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error sending email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
