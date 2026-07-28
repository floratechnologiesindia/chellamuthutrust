import type { IReceiptInvoiceData } from '../models/Operations.js';

export type ReceiptHtmlData = IReceiptInvoiceData & { receiptNumber: string };

function formatDateForReceipt(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

function formatCurrencyForReceipt(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount).replace('₹', '');
}

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertTwoDigits(num: number): string {
  if (num < 20) return ones[num];
  return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ` ${ones[num % 10]}` : '');
}

function convertThreeDigits(num: number): string {
  if (num >= 100) {
    return `${ones[Math.floor(num / 100)]} Hundred${num % 100 !== 0 ? ` ${convertTwoDigits(num % 100)}` : ''}`;
  }
  return convertTwoDigits(num);
}

function amountToWords(amount: number): string {
  if (amount === 0) return 'Zero Rupees Only';
  const absAmount = Math.abs(Math.floor(amount));
  if (absAmount === 0) return 'Zero Rupees Only';
  let result = '';
  const crore = Math.floor(absAmount / 10000000);
  if (crore > 0) result += `${convertTwoDigits(crore)} Crore `;
  const lakh = Math.floor((absAmount % 10000000) / 100000);
  if (lakh > 0) result += `${convertTwoDigits(lakh)} Lakh `;
  const thousand = Math.floor((absAmount % 100000) / 1000);
  if (thousand > 0) result += `${convertTwoDigits(thousand)} Thousand `;
  const remainder = absAmount % 1000;
  if (remainder > 0) result += convertThreeDigits(remainder);
  return `${result.trim()} Rupees Only`;
}

function getDonationPurpose(type: ReceiptHtmlData['donationType']): string {
  switch (type) {
    case 'corpus_fund': return 'Corpus Fund';
    case 'food_slot': return 'Food Sponsorship';
    case 'kind_donation': return 'Kind Donation';
    case 'donation': return 'Voluntary Contribution';
    case 'need': return 'Requirement Sponsorship';
    default: return 'Voluntary Contribution';
  }
}

export function generateReceiptHtml(data: ReceiptHtmlData): string {
  const paymentMode = data.paymentMode || 'Cash';
  const paymentModes = ['Cash', 'Cheque', 'D.D.No', 'NEFT'];

  const paymentModesHtml = paymentModes.map((mode) => {
    const isActive = paymentMode.toLowerCase() === mode.toLowerCase().replace('.no', '')
      || paymentMode.toLowerCase() === mode.toLowerCase();
    return `<span style="font-weight: ${isActive ? 'bold' : 'normal'}; text-decoration: ${isActive ? 'none' : 'line-through'}; color: ${isActive ? '#b71c1c' : '#999'};">${mode}</span>`;
  }).join(' / ');

  const panAadharHtml = data.requires80g && (data.panNumber || data.aadharNumber)
    ? `<p style="margin: 6px 0 0;">
        ${data.panNumber ? `Donor PAN: <strong>${data.panNumber}</strong>` : ''}
        ${data.panNumber && data.aadharNumber ? ' · ' : ''}
        ${data.aadharNumber ? `Aadhaar: <strong>${data.aadharNumber}</strong>` : ''}
      </p>`
    : '';

  return `
    <div style="font-family: Georgia, serif; max-width: 700px; margin: 0 auto; padding: 30px; background: #fff; color: #000; font-size: 14px;">
      <div style="text-align: center; margin-bottom: 5px;">
        <h1 style="font-size: 20px; font-weight: bold; color: #1a237e; letter-spacing: 1px; margin: 0;">
          M.S. CHELLAMUTHU TRUST &amp; RESEARCH FOUNDATION
        </h1>
        <p style="font-size: 11px; color: #1a237e; margin: 2px 0;">Regn.No.400/1992</p>
        <p style="font-size: 12px; color: #1a237e; font-style: italic; margin: 2px 0;">
          Promoting Mental Health – Rebuilding Lives
        </p>
        <p style="font-size: 11px; color: #333; margin: 4px 0;">PAN NO: AAATM1310P</p>
        <p style="font-size: 11px; color: #555; margin: 2px 0;">
          No.5, Ramasubramanian Nagar, K.Pudur, Madurai – 625 007
        </p>
        <p style="font-size: 11px; color: #555; margin: 2px 0;">
          Email: mschellamuthutrust@gmail.com
        </p>
      </div>

      <hr style="border: none; border-top: 2px solid #1a237e; margin: 8px 0;" />

      <table style="width: 100%; margin: 12px 0;">
        <tr>
          <td style="font-size: 13px;">
            <strong>No.</strong>
            <span style="color: #b71c1c; font-weight: bold; font-family: monospace;">${data.receiptNumber}</span>
          </td>
          <td style="text-align: center; font-size: 18px; font-weight: bold; color: #b71c1c; letter-spacing: 2px;">
            DONATION RECEIPT
          </td>
          <td style="text-align: right; font-size: 13px;">
            <strong>Date:</strong> ${formatDateForReceipt(data.date)}
          </td>
        </tr>
      </table>

      <hr style="border: none; border-top: 1px solid #ccc; margin: 8px 0;" />

      <div style="line-height: 2.2; margin-top: 12px;">
        <p style="margin: 0;">
          Received with thanks from Mr./Mrs./Ms.
          <strong style="border-bottom: 1px dotted #333; padding-bottom: 1px;">${data.donorName}</strong>
        </p>
        <p style="margin: 0;">
          Address: <span style="border-bottom: 1px dotted #333; padding-bottom: 1px;">${data.donorAddress || '—'}</span>
        </p>
        <p style="margin: 0;">
          a sum of Rupees
          <strong style="border-bottom: 1px dotted #333; padding-bottom: 1px;">${amountToWords(data.amount)}</strong>
        </p>
        <p style="margin: 0;">
          by ${paymentModesHtml}
          ${data.referenceNumber ? ` No. <strong>${data.referenceNumber}</strong>` : ''}
          Dt. <strong>${formatDateForReceipt(data.paymentDate || data.date)}</strong>
        </p>
        <p style="margin: 0;">
          as <strong style="color: #1a237e;">${getDonationPurpose(data.donationType)}</strong>
          ${data.description ? `<span style="font-size: 12px; color: #555;"> — ${data.description}</span>` : ''}
          ${data.homeName ? `<span style="font-size: 12px; color: #555;"> (For: ${data.homeName})</span>` : ''}
        </p>
      </div>

      <div style="text-align: right; margin: 16px 0;">
        <span style="border: 2px solid #1a237e; padding: 8px 16px; display: inline-block;">
          <span style="font-size: 12px; font-weight: 600;">Rs. </span>
          <span style="font-size: 20px; font-weight: bold; color: #b71c1c;">${formatCurrencyForReceipt(data.amount)}</span>
          <span style="font-size: 12px;"> /-</span>
        </span>
      </div>

      <div style="border: 1px solid #ccc; padding: 10px 14px; margin-top: 16px; font-size: 11px; line-height: 1.6; background: #fafafa;">
        <p style="font-weight: bold; color: #1a237e; margin: 0 0 4px;">
          Exempted from Income Tax under Sec 80G(5) of Income Tax Act, 1961
        </p>
        <p style="margin: 0;">Vide Order No. CIT(E)/MDS/80G/143/2023-24</p>
        <p style="margin: 0;">Date: 27.09.2023 &nbsp; Valid from: A.Y. 2024-25 onwards</p>
        <p style="margin: 0;">Unique Registration No: AAATM1310PF20214</p>
        ${panAadharHtml}
        <p style="margin: 6px 0 0; font-style: italic; color: #555;">
          * Donation in cash exceeding Rs.2000/- will not qualify for deduction u/s 80G of IT Act.
        </p>
      </div>

      <div style="margin-top: 24px; text-align: center;">
        <p style="font-style: italic; font-weight: bold; color: #1a237e; font-size: 12px; letter-spacing: 0.5px; margin-bottom: 20px;">
          "YOUR GENEROSITY BRIGHTENS THE WORLD OF THE MENTALLY DISABLED."
        </p>
        <table style="width: 100%; margin-top: 24px;">
          <tr>
            <td style="font-size: 11px; color: #888; text-align: left; vertical-align: bottom;">
              This is a computer-generated receipt.
            </td>
            <td style="text-align: right; vertical-align: bottom;">
              <div style="width: 200px; border-top: 1px solid #333; padding-top: 6px; display: inline-block;">
                <p style="font-size: 11px; font-weight: 600; margin: 0;">For M.S. Chellamuthu Trust</p>
                <p style="font-size: 10px; color: #555; margin: 0;">and Research Foundation</p>
              </div>
            </td>
          </tr>
        </table>
      </div>
    </div>
  `;
}

export function generateReceiptEmailText(data: ReceiptHtmlData): string {
  return [
    `Dear ${data.donorName},`,
    '',
    `Thank you for your generous donation to MS Chellamuthu Trust.`,
    '',
    `Receipt No.: ${data.receiptNumber}`,
    `Amount: ₹${data.amount.toLocaleString('en-IN')}`,
    `Date: ${formatDateForReceipt(data.date)}`,
    data.description ? `Description: ${data.description}` : '',
    data.homeName ? `Home: ${data.homeName}` : '',
    '',
    'Your official receipt is attached below. You can also view it anytime in My Donations on the donor portal.',
    '',
    'Warm regards,',
    'MS Chellamuthu Trust & Research Foundation',
  ].filter(Boolean).join('\n');
}
