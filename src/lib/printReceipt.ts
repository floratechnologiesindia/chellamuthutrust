/** Open print dialog for receipt HTML rendered inside a container element. */
export function printReceiptElement(container: HTMLElement, receiptNumber: string): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print your receipt');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt - ${receiptNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: Georgia, serif;
            padding: 20mm;
            background: white;
            color: black;
          }
          .invoice-preview { max-width: 170mm; margin: 0 auto; font-size: 14px; }
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .justify-center { justify-content: center; }
          .items-center { align-items: center; }
          .items-end { align-items: flex-end; }
          .text-center { text-align: center; }
          .mb-1 { margin-bottom: 0.25rem; }
          .mb-2 { margin-bottom: 0.5rem; }
          .h-20 { height: 5rem; }
          .w-20 { width: 5rem; }
          .object-contain { object-fit: contain; }
          hr { border: none; margin: 8px 0; }
          p { margin: 0; }
          @media print {
            body { padding: 0; }
            @page { margin: 15mm; }
          }
        </style>
      </head>
      <body>
        ${container.innerHTML}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}
