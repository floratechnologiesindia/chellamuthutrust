const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertTwoDigits(num: number): string {
  if (num < 20) return ones[num];
  return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
}

function convertThreeDigits(num: number): string {
  if (num >= 100) {
    return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' ' + convertTwoDigits(num % 100) : '');
  }
  return convertTwoDigits(num);
}

function amountToWords(amount: number): string {
  if (amount === 0) return 'Zero Rupees Only';
  const abs = Math.abs(Math.floor(amount));
  if (abs === 0) return 'Zero Rupees Only';
  let result = '';
  const crore = Math.floor(abs / 10000000);
  if (crore > 0) result += convertTwoDigits(crore) + ' Crore ';
  const lakh = Math.floor((abs % 10000000) / 100000);
  if (lakh > 0) result += convertTwoDigits(lakh) + ' Lakh ';
  const thousand = Math.floor((abs % 100000) / 1000);
  if (thousand > 0) result += convertTwoDigits(thousand) + ' Thousand ';
  const remainder = abs % 1000;
  if (remainder > 0) result += convertThreeDigits(remainder);
  return result.trim() + ' Rupees Only';
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

export interface ReceiptTextData {
  receiptNumber: string;
  date: string;
  donorName: string;
  donorAddress?: string;
  amount: number;
  paymentMode?: string;
  paymentDate?: string;
  description?: string;
  homeName?: string;
}

export function generateReceiptText(data: ReceiptTextData): string {
  const paymentMode = data.paymentMode || 'Online';
  const paymentDate = data.paymentDate ? formatDateText(data.paymentDate) : formatDateText(data.date);

  return `--- DONATION RECEIPT ---
M.S. CHELLAMUTHU TRUST & RESEARCH FOUNDATION
Regn.No.400/1992 | PAN: AAATM1310P

Receipt No: ${data.receiptNumber}
Date: ${formatDateText(data.date)}

Received with thanks from: ${data.donorName}
${data.donorAddress ? `Address: ${data.donorAddress}` : ''}
Amount: ${formatCurrencyText(data.amount)} (${amountToWords(data.amount)})
Payment Mode: ${paymentMode}
Payment Date: ${paymentDate}
Purpose: ${data.description || 'Voluntary Contribution'}${data.homeName ? ` (For: ${data.homeName})` : ''}

Exempted u/s 80G(5) of Income Tax Act, 1961
Order No: CIT(E)/MDS/80G/143/2023-24
URN: AAATM1310PF20214

For M.S. Chellamuthu Trust & Research Foundation`;
}
