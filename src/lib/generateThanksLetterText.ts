export interface ThanksLetterTextData {
  donorName: string;
  amount: number;
  paymentMode?: string;
  paymentDate?: string;
  description?: string;
  homeName?: string;
}

function formatDateText(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

function formatCurrencyText(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function generateThanksLetterText(data: ThanksLetterTextData): string {
  const today = formatDateText(new Date());
  const paymentDate = data.paymentDate ? formatDateText(data.paymentDate) : today;
  const paymentMode = data.paymentMode || 'Online';

  const towards = `${data.description || 'our cause'}${data.homeName ? ` at ${data.homeName}` : ''}`;

  return `--- THANKS LETTER ---
M.S. CHELLAMUTHU TRUST & RESEARCH FOUNDATION
Regn.No.400/1992 | PAN: AAATM1310P

Date: ${today}

Dear Mr./Mrs./Ms. ${data.donorName},

Thank you for your generous donation of ${formatCurrencyText(data.amount)} made via ${paymentMode} on ${paymentDate} towards ${towards}.

Your kind contribution supports the welfare and rehabilitation of the mentally challenged individuals under our care.

Exempt u/s 80G(5) of Income Tax Act, 1961.

With warm regards,
Mrs. R. Rajkumari
Executive Director
M.S. Chellamuthu Trust & Research Foundation
Ph: 0452-2530851 | mschellamuthutrust@gmail.com`;
}
