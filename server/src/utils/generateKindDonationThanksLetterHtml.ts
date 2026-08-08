export interface KindDonationThanksLetterData {
  donorName: string;
  itemDescription?: string;
  letterDate?: string | Date;
}

function formatLetterDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

export function generateKindDonationThanksLetterHtml(data: KindDonationThanksLetterData): string {
  const letterDate = formatLetterDate(data.letterDate || new Date());
  const donorName = data.donorName.trim() || 'Donor';

  return `
    <div style="font-family: 'Times New Roman', Georgia, serif; max-width: 700px; margin: 0 auto; padding: 30px 40px; color: #222; background: #fff;">
      <p style="font-size: 14px; margin: 0 0 20px;"><strong>Date:</strong> ${letterDate}</p>
      <p style="font-size: 14px; margin: 0 0 16px;">Dear Mr./Ms. <strong>${donorName}</strong>,</p>
      <p style="font-size: 14px; line-height: 1.8; margin: 10px 0;">
        Thank you for your generous in-kind donation to M.S. Chellamuthu Trust and Research Foundation.
      </p>
      <p style="font-size: 14px; line-height: 1.8; margin: 10px 0;">
        Your thoughtful contribution is deeply appreciated and will make a meaningful difference in the lives of the residents under our care. Through your kindness, you are helping us provide comfort, dignity, and hope to individuals who depend on our support each day.
      </p>
      <p style="font-size: 14px; line-height: 1.8; margin: 10px 0;">
        Your generosity reflects a compassionate heart and a commitment to making a positive impact in the lives of those in need. Every contribution, regardless of its size or nature, strengthens our mission and enables us to continue serving our residents with love, care, and respect.
      </p>
      <p style="font-size: 14px; line-height: 1.8; margin: 10px 0;">
        We are truly grateful for your trust in our organization and for choosing to partner with us in this noble cause. Your support inspires us to continue our work with renewed dedication and reminds our residents that they are valued and cared for by compassionate individuals like you.
      </p>
      <p style="font-size: 14px; line-height: 1.8; margin: 10px 0;">
        On behalf of our residents, our staff, and the management of M.S. Chellamuthu Trust and Research Foundation, we extend our heartfelt appreciation for your generosity.
      </p>
      <p style="font-size: 14px; line-height: 1.8; margin: 10px 0;">
        We look forward to your continued association in bringing hope and happiness to those we serve.
      </p>
      <p style="font-size: 14px; line-height: 1.8; margin: 10px 0;">
        Thank you once again for your kindness and unwavering support.
      </p>
      <p style="font-size: 14px; margin: 20px 0 0;">With sincere gratitude,</p>
      <p style="font-size: 14px; font-weight: bold; margin: 8px 0 0;">
        M.S. Chellamuthu Trust and Research Foundation
      </p>
    </div>
  `;
}

export function generateKindDonationThanksLetterText(data: KindDonationThanksLetterData): string {
  const letterDate = formatLetterDate(data.letterDate || new Date());
  const donorName = data.donorName.trim() || 'Donor';

  return `Date: ${letterDate}

Dear Mr./Ms. ${donorName},

Thank you for your generous in-kind donation to M.S. Chellamuthu Trust and Research Foundation.

Your thoughtful contribution is deeply appreciated and will make a meaningful difference in the lives of the residents under our care. Through your kindness, you are helping us provide comfort, dignity, and hope to individuals who depend on our support each day.

Your generosity reflects a compassionate heart and a commitment to making a positive impact in the lives of those in need. Every contribution, regardless of its size or nature, strengthens our mission and enables us to continue serving our residents with love, care, and respect.

We are truly grateful for your trust in our organization and for choosing to partner with us in this noble cause. Your support inspires us to continue our work with renewed dedication and reminds our residents that they are valued and cared for by compassionate individuals like you.

On behalf of our residents, our staff, and the management of M.S. Chellamuthu Trust and Research Foundation, we extend our heartfelt appreciation for your generosity.

We look forward to your continued association in bringing hope and happiness to those we serve.

Thank you once again for your kindness and unwavering support.

With sincere gratitude,
M.S. Chellamuthu Trust and Research Foundation`;
}
