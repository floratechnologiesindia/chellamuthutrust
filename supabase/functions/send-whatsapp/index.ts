import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DEFAULT_TEMPLATE_NAME = 'new_template';

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

const parseResponseBody = async (response: Response) => {
  const responseText = await response.text();
  try {
    return JSON.parse(responseText);
  } catch {
    return { rawResponse: responseText };
  }
};

/** Extract delivery-blocking issues from WATI response data */
const checkDeliveryEligibility = (data: Record<string, unknown>): { eligible: boolean; reason?: string } => {
  const contact = data?.contact as Record<string, unknown> | undefined;

  const optedIn = contact?.optedIn ?? data?.optedIn;
  const contactStatus = contact?.contactStatus ?? data?.contactStatus;
  const validWA = data?.validWhatsAppNumber;

  console.log('Delivery eligibility check:', { optedIn, contactStatus, validWhatsAppNumber: validWA });

  if (validWA === false) {
    return { eligible: false, reason: 'Invalid WhatsApp number — the number is not registered on WhatsApp.' };
  }
  if (typeof contactStatus === 'string' && contactStatus !== 'VALID') {
    return { eligible: false, reason: `Contact status is "${contactStatus}" — message may not be delivered.` };
  }
  return { eligible: true };
};

const sendSessionMessage = async (watiEndpoint: string, cleanToken: string, cleanPhone: string, message: string) => {
  const encodedMessage = encodeURIComponent(message);
  const url = `${watiEndpoint}/api/v1/sendSessionMessage/${cleanPhone}?messageText=${encodedMessage}`;

  console.log(`Calling WATI API: ${url} (method: session)`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cleanToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  const data = await parseResponseBody(response);
  console.log('WATI session response:', { status: response.status, data });

  return { response, data };
};

const sendTemplateMessage = async (
  watiEndpoint: string,
  cleanToken: string,
  cleanPhone: string,
  templateName: string,
  templateParams: unknown[] = [],
) => {
  const url = `${watiEndpoint}/api/v1/sendTemplateMessage?whatsappNumber=${cleanPhone}`;
  const body = {
    template_name: templateName,
    broadcast_name: 'donor_outreach',
    parameters: templateParams,
  };

  console.log(`Calling WATI API: ${url} (method: template)`);
  console.log('Request body:', JSON.stringify(body));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cleanToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await parseResponseBody(response);
  console.log('WATI template response:', { status: response.status, data });

  return { response, data };
};

/** Send an image file via WATI session file API */
const sendSessionFile = async (
  watiEndpoint: string,
  cleanToken: string,
  cleanPhone: string,
  imageUrl: string,
  caption?: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log(`Downloading image: ${imageUrl}`);
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return { success: false, error: `Failed to download image: ${imageResponse.status}` };
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const fileName = `photo.${ext}`;

    const file = new File([imageBuffer], fileName, { type: contentType });
    const formData = new FormData();
    formData.append('file', file);

    const url = `${watiEndpoint}/api/v1/sendSessionFile/${cleanPhone}?caption=${encodeURIComponent(caption || '')}`;
    console.log(`Sending file to WATI: ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
      },
      body: formData,
    });

    const data = await parseResponseBody(response);
    console.log('WATI sendSessionFile response:', { status: response.status, data });

    if (!response.ok || data?.result === false) {
      return { success: false, error: data?.info || data?.message || `HTTP ${response.status}` };
    }

    return { success: true };
  } catch (err) {
    console.error('sendSessionFile error:', err);
    return { success: false, error: err.message };
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, message, template_name, template_params, media_urls } = await req.json();

    if (!phone || (!message && !template_name)) {
      return new Response(
        JSON.stringify({ error: 'phone and (message or template_name) are required' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const watiEndpoint = Deno.env.get('WATI_API_ENDPOINT');
    const watiToken = Deno.env.get('WATI_ACCESS_TOKEN');

    if (!watiEndpoint || !watiToken) {
      const missing = [!watiEndpoint && 'WATI_API_ENDPOINT', !watiToken && 'WATI_ACCESS_TOKEN'].filter(Boolean);
      console.error('Missing secrets:', missing.join(', '));
      return new Response(
        JSON.stringify({ error: 'whatsapp_not_configured', details: `Missing: ${missing.join(', ')}` }),
        { status: 500, headers: jsonHeaders }
      );
    }

    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    } else if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
      cleanPhone = `91${cleanPhone.substring(1)}`;
    }
    console.log(`Normalized phone: ${cleanPhone}`);
    let cleanToken = watiToken.trim();
    if (cleanToken.toLowerCase().startsWith('bearer ')) {
      cleanToken = cleanToken.substring(7).trim();
    }

    const requestedTemplateName = template_name || DEFAULT_TEMPLATE_NAME;
    const requestedTemplateParams = Array.isArray(template_params) ? template_params : [];
    const mediaUrls: string[] = Array.isArray(media_urls) ? media_urls : [];

    // Helper to send media files after text message — returns counts
    const sendMediaFiles = async (): Promise<{ sent: number; failed: number }> => {
      if (mediaUrls.length === 0) return { sent: 0, failed: 0 };
      console.log(`Sending ${mediaUrls.length} media file(s) to ${cleanPhone}`);
      let sent = 0;
      let failed = 0;
      for (let i = 0; i < mediaUrls.length; i++) {
        const result = await sendSessionFile(
          watiEndpoint, cleanToken, cleanPhone, mediaUrls[i],
          `Photo ${i + 1} of ${mediaUrls.length}`
        );
        if (result.success) {
          sent++;
        } else {
          console.warn(`Media file ${i + 1} failed: ${result.error} — skipping`);
          failed++;
        }
      }
      return { sent, failed };
    };

    // --- Direct template send ---
    if (template_name) {
      const { response, data } = await sendTemplateMessage(
        watiEndpoint, cleanToken, cleanPhone, requestedTemplateName, requestedTemplateParams,
      );

      if (!response.ok || data?.result === false) {
        return new Response(
          JSON.stringify({
            error: 'api_error',
            delivery_status: 'blocked',
            status: response.status,
            message: `WATI template API returned ${response.status} ${response.statusText}`,
            details: data,
          }),
          { status: response.ok ? 422 : response.status, headers: jsonHeaders }
        );
      }

      const eligibility = checkDeliveryEligibility(data);
      if (!eligibility.eligible) {
        return new Response(
          JSON.stringify({
            error: 'delivery_blocked',
            delivery_status: 'blocked',
            message: eligibility.reason,
            method: 'template',
            template_name: requestedTemplateName,
            details: data,
          }),
          { status: 422, headers: jsonHeaders }
        );
      }

      const media = await sendMediaFiles();

      return new Response(
        JSON.stringify({
          success: true,
          delivery_status: 'session_sent',
          method: 'template',
          template_name: requestedTemplateName,
          media_sent_count: media.sent,
          media_failed_count: media.failed,
          warnings: media.failed > 0 ? [`${media.failed} photo(s) failed to send`] : [],
          data,
        }),
        { headers: jsonHeaders }
      );
    }

    // --- Session message (with template fallback) ---
    const { response: sessionResponse, data: sessionData } = await sendSessionMessage(
      watiEndpoint, cleanToken, cleanPhone, message,
    );

    const sessionFailed = sessionData?.result === false && sessionData?.result !== 'success';

    if (sessionFailed) {
      const failedDetail = sessionData?.message?.failedDetail || sessionData?.message || 'Session message could not be delivered';
      console.log(`Session message failed for ${cleanPhone} (reason: ${failedDetail}); retrying with template ${requestedTemplateName}`);

      const { response: templateResponse, data: templateData } = await sendTemplateMessage(
        watiEndpoint, cleanToken, cleanPhone, requestedTemplateName, requestedTemplateParams,
      );

      if (!templateResponse.ok || templateData?.result === false) {
        return new Response(
          JSON.stringify({
            error: 'template_fallback_failed',
            delivery_status: 'blocked',
            message: 'Session message failed and template fallback was unsuccessful.',
            session_failure_reason: String(failedDetail),
            session_details: sessionData,
            template_status: templateResponse.status,
            template_details: templateData,
          }),
          { status: templateResponse.ok ? 422 : templateResponse.status, headers: jsonHeaders }
        );
      }

      const eligibility = checkDeliveryEligibility(templateData);
      if (!eligibility.eligible) {
        return new Response(
          JSON.stringify({
            error: 'delivery_blocked',
            delivery_status: 'blocked',
            message: eligibility.reason,
            method: 'template',
            fallback: true,
            template_name: requestedTemplateName,
            session_failure_reason: String(failedDetail),
            details: templateData,
          }),
          { status: 422, headers: jsonHeaders }
        );
      }

      // Skip media after template fallback — session file API won't work
      console.log('WhatsApp template fallback sent to', cleanPhone, '— skipping media (session-only API)');
      const mediaSkipped = mediaUrls.length;

      return new Response(
        JSON.stringify({
          success: true,
          delivery_status: 'template_fallback',
          method: 'template',
          fallback: true,
          template_name: requestedTemplateName,
          session_failure_reason: String(failedDetail),
          media_sent_count: 0,
          media_failed_count: 0,
          media_skipped_count: mediaSkipped,
          warnings: [
            `Your report text was not delivered. A generic template greeting was sent instead. Reason: ${failedDetail}`,
            ...(mediaSkipped > 0 ? [`${mediaSkipped} photo(s) were not sent (requires active session).`] : []),
          ],
          data: templateData,
        }),
        { headers: jsonHeaders }
      );
    }

    if (!sessionResponse.ok || sessionData?.result === false) {
      return new Response(
        JSON.stringify({
          error: 'api_error',
          delivery_status: 'blocked',
          status: sessionResponse.status,
          message: `WATI API returned ${sessionResponse.status} ${sessionResponse.statusText}`,
          details: sessionData,
        }),
        { status: sessionResponse.ok ? 422 : sessionResponse.status, headers: jsonHeaders }
      );
    }

    // Send media after session message
    const media = await sendMediaFiles();

    console.log('WhatsApp session message sent to', cleanPhone);
    return new Response(
      JSON.stringify({
        success: true,
        delivery_status: 'session_sent',
        method: 'session',
        media_sent_count: media.sent,
        media_failed_count: media.failed,
        warnings: media.failed > 0 ? [`${media.failed} photo(s) failed to send`] : [],
        data: sessionData,
      }),
      { headers: jsonHeaders }
    );
  } catch (error) {
    console.error('Error in send-whatsapp:', error);
    return new Response(
      JSON.stringify({ error: 'network_error', delivery_status: 'blocked', message: error.message }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
