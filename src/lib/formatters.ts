// Convert number to Indian currency words (Crore, Lakh, Thousand format)
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

export function amountToWords(amount: number): string {
  if (amount === 0) return 'Zero Rupees Only';
  
  const absAmount = Math.abs(Math.floor(amount));
  
  if (absAmount === 0) return 'Zero Rupees Only';

  let result = '';
  
  // Crore (10,000,000)
  const crore = Math.floor(absAmount / 10000000);
  if (crore > 0) {
    result += convertTwoDigits(crore) + ' Crore ';
  }
  
  // Lakh (100,000)
  const lakh = Math.floor((absAmount % 10000000) / 100000);
  if (lakh > 0) {
    result += convertTwoDigits(lakh) + ' Lakh ';
  }
  
  // Thousand (1,000)
  const thousand = Math.floor((absAmount % 100000) / 1000);
  if (thousand > 0) {
    result += convertTwoDigits(thousand) + ' Thousand ';
  }
  
  // Hundred and remainder
  const remainder = absAmount % 1000;
  if (remainder > 0) {
    result += convertThreeDigits(remainder);
  }
  
  return result.trim() + ' Rupees Only';
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

export function generateReceiptNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `RCP-${year}-${random}`;
}
