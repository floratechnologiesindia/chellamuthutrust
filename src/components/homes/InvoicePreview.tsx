import { formatCurrency, formatDate, amountToWords } from '@/lib/formatters';
import logoImage from '@/assets/logo.jpg';

export interface InvoiceData {
  receiptNumber: string;
  date: string;
  donorName: string;
  donorAddress?: string;
  donorPhone?: string;
  donorEmail?: string;
  description: string;
  amount: number;
  homeName?: string;
  donationType: 'need' | 'food_slot' | 'kind_donation' | 'corpus_fund' | 'donation';
  paymentMode?: string;
  referenceNumber?: string;
  paymentDate?: string;
}

interface InvoicePreviewProps {
  data: InvoiceData;
}

export function InvoicePreview({ data }: InvoicePreviewProps) {
  const getDonationPurpose = (type: InvoiceData['donationType']) => {
    switch (type) {
      case 'corpus_fund': return 'Corpus Fund';
      case 'food_slot': return 'Food Sponsorship';
      case 'kind_donation': return 'Kind Donation';
      case 'donation': return 'Voluntary Contribution';
      case 'need': return 'Requirement Sponsorship';
      default: return 'Voluntary Contribution';
    }
  };

  const paymentMode = data.paymentMode || 'Cash';
  const paymentModes = ['Cash', 'Cheque', 'D.D.No', 'NEFT'];

  return (
    <div className="invoice-preview bg-white text-black p-8 max-w-[210mm] mx-auto" style={{ fontFamily: 'Georgia, serif', fontSize: '14px' }}>
      {/* Header */}
      <div className="text-center mb-1">
        <div className="flex justify-center mb-2">
          <img
            src={logoImage}
            alt="MS Chellamuthu Trust"
            className="h-20 w-20 object-contain"
          />
        </div>
        <h1 className="receipt-title-main" style={{ fontSize: '20px', fontWeight: 'bold', color: '#1a237e', letterSpacing: '1px' }}>
          M.S. CHELLAMUTHU TRUST & RESEARCH FOUNDATION
        </h1>
        <p style={{ fontSize: '11px', color: '#1a237e' }}>Regn.No.400/1992</p>
        <p style={{ fontSize: '12px', color: '#1a237e', fontStyle: 'italic', marginTop: '2px' }}>
          Promoting Mental Health – Rebuilding Lives
        </p>
        <p style={{ fontSize: '11px', color: '#333', marginTop: '4px' }}>
          PAN NO: AAATM1310P
        </p>
        <p style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>
          No.5, Ramasubramanian Nagar, K.Pudur, Madurai – 625 007
        </p>
        <p style={{ fontSize: '11px', color: '#555' }}>
          Email: mschellamuthutrust@gmail.com
        </p>
      </div>

      <hr style={{ border: 'none', borderTop: '2px solid #1a237e', margin: '8px 0' }} />

      {/* Receipt Number / Title / Date Row */}
      <div className="flex justify-between items-center" style={{ margin: '12px 0' }}>
        <div style={{ fontSize: '13px' }}>
          <span style={{ fontWeight: 600 }}>No.</span>{' '}
          <span style={{ color: '#b71c1c', fontWeight: 'bold', fontFamily: 'monospace' }}>{data.receiptNumber}</span>
        </div>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#b71c1c', letterSpacing: '2px' }}>
          DONATION RECEIPT
        </div>
        <div style={{ fontSize: '13px' }}>
          <span style={{ fontWeight: 600 }}>Date:</span>{' '}
          {formatDate(data.date)}
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #ccc', margin: '8px 0' }} />

      {/* Donor Details */}
      <div style={{ lineHeight: '2.2', marginTop: '12px' }}>
        <p>
          Received with thanks from Mr./Mrs./Ms.{' '}
          <span style={{ fontWeight: 'bold', borderBottom: '1px dotted #333', paddingBottom: '1px' }}>
            {data.donorName}
          </span>
        </p>

        <p>
          Address:{' '}
          <span style={{ borderBottom: '1px dotted #333', paddingBottom: '1px' }}>
            {data.donorAddress || '—'}
          </span>
        </p>

        <p>
          a sum of Rupees{' '}
          <span style={{ fontWeight: 'bold', borderBottom: '1px dotted #333', paddingBottom: '1px' }}>
            {amountToWords(data.amount)}
          </span>
        </p>

        <p>
          by{' '}
          {paymentModes.map((mode, i) => (
            <span key={mode}>
              {i > 0 && ' / '}
              <span style={{
                fontWeight: paymentMode.toLowerCase() === mode.toLowerCase().replace('.no', '') || paymentMode.toLowerCase() === mode.toLowerCase() ? 'bold' : 'normal',
                textDecoration: paymentMode.toLowerCase() !== mode.toLowerCase().replace('.no', '') && paymentMode.toLowerCase() !== mode.toLowerCase() ? 'line-through' : 'none',
                color: paymentMode.toLowerCase() === mode.toLowerCase().replace('.no', '') || paymentMode.toLowerCase() === mode.toLowerCase() ? '#b71c1c' : '#999',
              }}>
                {mode}
              </span>
            </span>
          ))}
          {data.referenceNumber && (
            <span> No. <span style={{ fontWeight: 'bold' }}>{data.referenceNumber}</span></span>
          )}
          {' '}Dt.{' '}
          <span style={{ fontWeight: 'bold' }}>{formatDate(data.paymentDate || data.date)}</span>
        </p>

        <p>
          as{' '}
          <span style={{ fontWeight: 'bold', color: '#1a237e' }}>
            {getDonationPurpose(data.donationType)}
          </span>
          {data.description && (
            <span style={{ fontSize: '12px', color: '#555' }}> — {data.description}</span>
          )}
          {data.homeName && (
            <span style={{ fontSize: '12px', color: '#555' }}> (For: {data.homeName})</span>
          )}
        </p>
      </div>

      {/* Amount Box */}
      <div style={{
        textAlign: 'right',
        margin: '16px 0',
        padding: '8px 16px',
        border: '2px solid #1a237e',
        display: 'inline-block',
        float: 'right',
      }}>
        <span style={{ fontSize: '12px', fontWeight: 600 }}>Rs. </span>
        <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#b71c1c' }}>
          {formatCurrency(data.amount).replace('₹', '')}
        </span>
        <span style={{ fontSize: '12px' }}> /-</span>
      </div>

      <div style={{ clear: 'both' }} />

      {/* 80G Section */}
      <div style={{
        border: '1px solid #ccc',
        padding: '10px 14px',
        marginTop: '16px',
        fontSize: '11px',
        lineHeight: '1.6',
        backgroundColor: '#fafafa',
      }}>
        <p style={{ fontWeight: 'bold', color: '#1a237e', marginBottom: '4px' }}>
          Exempted from Income Tax under Sec 80G(5) of Income Tax Act, 1961
        </p>
        <p>Vide Order No. CIT(E)/MDS/80G/143/2023-24</p>
        <p>Date: 27.09.2023 &nbsp; Valid from: A.Y. 2024-25 onwards</p>
        <p>Unique Registration No: AAATM1310PF20214</p>
        <p style={{ marginTop: '6px', fontStyle: 'italic', color: '#555' }}>
          * Donation in cash exceeding Rs.2000/- will not qualify for deduction u/s 80G of IT Act.
        </p>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <p style={{
          fontStyle: 'italic',
          fontWeight: 'bold',
          color: '#1a237e',
          fontSize: '12px',
          letterSpacing: '0.5px',
          marginBottom: '20px',
        }}>
          "YOUR GENEROSITY BRIGHTENS THE WORLD OF THE MENTALLY DISABLED."
        </p>

        <div className="flex justify-between items-end" style={{ marginTop: '24px' }}>
          <div style={{ fontSize: '11px', color: '#888' }}>
            <p>This is a computer-generated receipt.</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '200px', borderTop: '1px solid #333', paddingTop: '6px' }}>
              <p style={{ fontSize: '11px', fontWeight: 600 }}>For M.S. Chellamuthu Trust</p>
              <p style={{ fontSize: '10px', color: '#555' }}>and Research Foundation</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
