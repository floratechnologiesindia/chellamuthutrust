import type { ThanksLetterTextData } from './generateThanksLetterText.js';

function formatDateForLetter(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

function formatCurrencyForLetter(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function generateRefNumber(): string {
  const year = new Date().getFullYear();
  const seq = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `MSCT&RF/RMD/${seq}/${year}`;
}

export function generateThanksLetterHtml(data: ThanksLetterTextData): string {
  const today = formatDateForLetter(new Date());
  const refNo = generateRefNumber();
  const paymentDate = data.paymentDate ? formatDateForLetter(data.paymentDate) : today;
  const paymentMode = data.paymentMode || 'Online';

  return `
    <div style="font-family: 'Times New Roman', Georgia, serif; max-width: 700px; margin: 0 auto; padding: 30px 40px; color: #222; background: #fff;">
      <div style="text-align: center; margin-bottom: 10px;">
        <h1 style="font-size: 22px; font-weight: bold; color: #1a237e; letter-spacing: 1px; margin: 0;">
          M.S. CHELLAMUTHU TRUST &amp; RESEARCH FOUNDATION
        </h1>
        <p style="font-size: 11px; color: #1a237e; margin: 2px 0;">Regn.No.400/1992</p>
        <p style="font-size: 12px; color: #1a237e; font-style: italic; margin: 2px 0;">
          Promoting Mental Health – Rebuilding Lives
        </p>
      </div>
      <hr style="border: none; border-top: 2px solid #1a237e; margin: 10px 0;" />
      <div style="display: flex; justify-content: space-between; margin: 16px 0; font-size: 13px;">
        <div><strong>Ref No:</strong> ${refNo}</div>
        <div><strong>Date:</strong> ${today}</div>
      </div>
      <p style="font-size: 14px; margin: 20px 0 10px;">
        Dear Mr./Mrs./Ms. <strong>${data.donorName}</strong>,
      </p>
      <p style="font-size: 14px; line-height: 1.8; margin: 10px 0;">
        Warm greetings from M.S. Chellamuthu Trust &amp; Research Foundation!
      </p>
      <p style="font-size: 14px; line-height: 1.8; margin: 10px 0;">
        We sincerely acknowledge and thank you for your generous donation of
        <strong>${formatCurrencyForLetter(data.amount)}</strong>
        made via <strong>${paymentMode}</strong>
        on <strong>${paymentDate}</strong>
        towards <strong>${data.description || 'our cause'}${data.homeName ? ` at ${data.homeName}` : ''}</strong>.
      </p>
      <p style="font-size: 14px; line-height: 1.8; margin: 10px 0;">
        Your kind contribution will go a long way in supporting the welfare and rehabilitation of
        the mentally challenged individuals under our care. Your generosity is deeply valued and
        makes a meaningful difference in their lives.
      </p>
      <p style="font-size: 14px; line-height: 1.8; margin: 10px 0;">
        Please find enclosed the <strong>Donation Receipt</strong> for your records. The donation
        is eligible for tax exemption under Section 80G(5) of the Income Tax Act, 1961.
      </p>
      <p style="font-size: 14px; line-height: 1.8; margin: 10px 0;">
        We look forward to your continued support and patronage.
      </p>
      <p style="font-size: 14px; margin: 10px 0;">With warm regards,</p>
      <div style="margin-top: 30px;">
        <p style="font-size: 14px; font-weight: bold; margin: 0;">Mrs. R. Rajkumari</p>
        <p style="font-size: 13px; color: #555; margin: 2px 0;">Executive Director</p>
        <p style="font-size: 13px; color: #555; margin: 2px 0;">M.S. Chellamuthu Trust &amp; Research Foundation</p>
      </div>
      <hr style="border: none; border-top: 1px solid #ccc; margin: 20px 0;" />
      <div style="font-size: 11px; color: #666; text-align: center; line-height: 1.6;">
        <p style="margin: 2px 0;">No.5, Ramasubramanian Nagar, K.Pudur, Madurai – 625 007</p>
        <p style="margin: 2px 0;">Ph: 0452-2530851 | Email: mschellamuthutrust@gmail.com</p>
        <p style="margin: 6px 0; font-style: italic; color: #1a237e;">
          Exempt u/s 80G(5) of Income Tax Act, 1961 | PAN: AAATM1310P
        </p>
      </div>
    </div>
  `;
}
