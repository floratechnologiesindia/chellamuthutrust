import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface HomeDonation {
  home_id: string;
  home_name: string;
  amount: number;
}

interface ParsedDonor {
  name: string;
  phone?: string;
  email?: string;
  pan_number?: string;
  aadhar_number?: string;
  address?: string;
  referred_by?: string;
  donor_category?: string;
  notes?: string;
  home_donations: HomeDonation[];
  occasion?: string;
  total_donation: number;
}

interface UploadResult {
  created: number;
  skipped: number;
  errors: string[];
  total: number;
}

interface HomeRecord {
  id: string;
  name: string;
}

interface BulkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Alias mapping: Excel shorthand → DB home name
const HOME_ALIASES: Record<string, string> = {
  'MI Home (MDU)': 'Home for Mentally Ill - Madurai',
  'MI Home (ERW)': 'Home for Mentally Ill - Ervadi',
  'MI Home (Bodhi)': 'MSCT&RF Central Office & Bodhi',
  'MI Home (PLN)': 'Home for Adult Persons with Mental Ill - Palani',
  'MR Home (MDU)': 'Home for Adult MR',
  'Aakaash': 'AAKAASH - Special School',
  'Bodhi': 'MSCT&RF Central Office & Bodhi',
  'VTC': 'Shakthi Press - VTC for Mentally Ill',
  'Halfway Home': 'Halfway Home',
  'Happy Schooling': 'Happy Schooling',
  'ECRC': 'Emergency Care & Recovery Centre (ECRC)',
  'CBR': 'Community Based Rehabilitation',
  'De-Addiction': 'De-Addiction Centre - 30 Bedded',
  'MSCIMH': 'MS Chellamuthu Institute of Mental Health',
  'Magilchi Chennai': 'Magilchi - Chennai',
  'Magilchi Madurai': 'Magilchi Madurai',
  'Sunshine': 'Sunshine Children Home',
};

// Standard donor columns (non-home columns)
const STANDARD_COLUMNS = [
  'Name', 'Phone', 'E.Mail', 'PAN', 'Aadhar',
  'Donor Name & Address', 'Referred through', 'Donor Category', 'Remarks if any',
];

function mapCategoryLabel(cat: string | undefined): string {
  if (!cat) return 'Public';
  const lower = cat.toLowerCase();
  if (lower.includes('csr') || lower.includes('institution')) return 'CSR';
  if (lower.includes('monthly')) return 'Monthly';
  if (lower.includes('annual') || lower.includes('yearly')) return 'Yearly';
  return 'Public';
}

export function BulkUploadDialog({ open, onOpenChange }: BulkUploadDialogProps) {
  const [parsedDonors, setParsedDonors] = useState<ParsedDonor[]>([]);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [homes, setHomes] = useState<HomeRecord[]>([]);
  const [unmatchedColumns, setUnmatchedColumns] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Fetch homes when dialog opens
  useEffect(() => {
    if (open) {
      supabase.from('homes').select('id, name').order('name').then(({ data }) => {
        if (data) setHomes(data);
      });
    }
  }, [open]);

  const reset = () => {
    setParsedDonors([]);
    setFileName('');
    setUploading(false);
    setProgress(0);
    setResult(null);
    setUnmatchedColumns([]);
  };

  // Build a lookup: lowercased name/alias → home record
  const buildHomeLookup = (): Map<string, HomeRecord> => {
    const lookup = new Map<string, HomeRecord>();
    for (const home of homes) {
      lookup.set(home.name.toLowerCase(), home);
    }
    for (const [alias, dbName] of Object.entries(HOME_ALIASES)) {
      const home = homes.find(h => h.name === dbName);
      if (home) {
        lookup.set(alias.toLowerCase(), home);
      }
    }
    return lookup;
  };

  const handleDownloadTemplate = () => {
    try {
      const row1: Record<string, any> = {
        'Name': 'Rajesh Kumar',
        'Phone': '9876543210',
        'E.Mail': 'rajesh@example.com',
        'PAN': 'ABCDE1234F',
        'Aadhar': '1234 5678 9012',
        'Donor Name & Address': 'Rajesh Kumar, 12 Gandhi Nagar, Madurai',
        'Referred through': 'Mr. Shankar',
        'Donor Category': 'Monthly Regular Donor',
        'Remarks if any': 'Preferred contact: phone',
      };
      const row2: Record<string, any> = {
        'Name': 'ABC Corp Pvt Ltd',
        'Phone': '9123456789',
        'E.Mail': 'csr@abccorp.com',
        'PAN': 'ZZZZZ9999Z',
        'Aadhar': '',
        'Donor Name & Address': 'ABC Corp, Tech Park, Chennai',
        'Referred through': '',
        'Donor Category': 'CSR / Institutions',
        'Remarks if any': 'CSR annual contribution',
      };

      const ws = XLSX.utils.json_to_sheet([row1, row2]);
      const colWidths = [
        { wch: 25 }, { wch: 15 }, { wch: 25 }, { wch: 14 }, { wch: 18 },
        { wch: 40 }, { wch: 20 }, { wch: 28 }, { wch: 30 },
      ];
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Donor Template');

      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Bulk_Donor_Upload_Template.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Template download failed:', error);
      toast({ title: 'Error', description: 'Failed to generate template. Please try again.', variant: 'destructive' });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setResult(null);
    setUnmatchedColumns([]);

    const homeLookup = buildHomeLookup();

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

      if (rows.length === 0) {
        setParsedDonors([]);
        return;
      }

      // Identify which columns are home columns
      const allColumns = Object.keys(rows[0]);
      const standardLower = new Set([
        ...STANDARD_COLUMNS.map(c => c.toLowerCase()),
        'occasion', 'trust welfare', 'date',
      ]);

      const homeColumnMap: { colName: string; home: HomeRecord }[] = [];
      const unmatched: string[] = [];

      for (const col of allColumns) {
        if (standardLower.has(col.toLowerCase())) continue;
        if (col.toLowerCase() === 'occasion') continue;

        const home = homeLookup.get(col.toLowerCase());
        if (home) {
          homeColumnMap.push({ colName: col, home });
        } else {
          // Check if it looks like a donation column (not standard)
          const isNumericInAnyRow = rows.some(r => {
            const v = parseFloat(String(r[col] || '0'));
            return v > 0;
          });
          if (isNumericInAnyRow) {
            unmatched.push(col);
          }
        }
      }

      setUnmatchedColumns(unmatched);

      const donors: ParsedDonor[] = [];
      const seenPhones = new Set<string>();

      for (const row of rows) {
        const name = String(row['Name'] || row['name'] || '').trim();
        if (!name || name === 'NIL' || name === '') continue;

        const phone = String(row['Phone'] || row['phone'] || '').trim().replace(/[^0-9+]/g, '');
        const email = String(row['E.Mail'] || row['Email'] || row['email'] || '').trim();

        if (phone && phone !== '' && phone !== 'NIL') {
          if (seenPhones.has(phone)) continue;
          seenPhones.add(phone);
        }

        const donorNameAddress = String(row['Donor Name & Address'] || '').trim();
        let address = '';
        if (donorNameAddress && donorNameAddress !== 'NIL') {
          const parts = donorNameAddress.split(/[,\n]/);
          if (parts.length > 1) {
            address = parts.slice(1).join(', ').trim();
          }
        }

        // Parse home donations
        const homeDonations: HomeDonation[] = [];
        for (const { colName, home } of homeColumnMap) {
          const val = parseFloat(String(row[colName] || '0'));
          if (val > 0) {
            // Check if this home_id already exists (e.g. Bodhi alias)
            const existing = homeDonations.find(d => d.home_id === home.id);
            if (existing) {
              existing.amount += val;
            } else {
              homeDonations.push({ home_id: home.id, home_name: home.name, amount: val });
            }
          }
        }

        const totalDonation = homeDonations.reduce((sum, d) => sum + d.amount, 0);

        donors.push({
          name,
          phone: phone && phone !== 'NIL' && phone !== '' ? phone : undefined,
          email: email && email !== 'NIL' && email !== '' ? email : undefined,
          pan_number: cleanField(row['PAN']),
          aadhar_number: cleanField(row['Aadhar']),
          address: address || undefined,
          referred_by: cleanField(row['Referred through']),
          donor_category: cleanField(row['Donor Category']),
          notes: cleanField(row['Remarks if any'] || row['Remarks']),
          home_donations: homeDonations,
          occasion: cleanField(row['Occasion']),
          total_donation: totalDonation,
        });
      }

      setParsedDonors(donors);
    };
    reader.readAsBinaryString(file);
  };

  const cleanField = (val: any): string | undefined => {
    if (val === undefined || val === null) return undefined;
    const s = String(val).trim();
    if (s === '' || s === 'NIL' || s === 'nil') return undefined;
    return s;
  };

  const handleUpload = async () => {
    if (parsedDonors.length === 0) return;

    setUploading(true);
    setProgress(0);

    const { data: trusts } = await supabase.from('trusts').select('id').limit(1);
    const trustId = trusts?.[0]?.id;
    if (!trustId) {
      toast({ title: 'Error', description: 'No trust found in the system', variant: 'destructive' });
      setUploading(false);
      return;
    }

    const BATCH_SIZE = 20;
    const batches = [];
    for (let i = 0; i < parsedDonors.length; i += BATCH_SIZE) {
      batches.push(parsedDonors.slice(i, i + BATCH_SIZE));
    }

    let totalCreated = 0;
    let totalSkipped = 0;
    const totalErrors: string[] = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i].map(d => ({
        name: d.name,
        phone: d.phone,
        email: d.email,
        pan_number: d.pan_number,
        aadhar_number: d.aadhar_number,
        address: d.address,
        referred_by: d.referred_by,
        donor_category: d.donor_category,
        notes: d.notes,
        occasion: d.occasion,
        trust_id: trustId,
        home_donations: d.home_donations.map(hd => ({ home_id: hd.home_id, amount: hd.amount })),
      }));

      const { data: res, error } = await supabase.functions.invoke('bulk-upload-donors', {
        body: { donors: batch },
      });

      if (error) {
        totalErrors.push(error.message);
      } else if (res) {
        if (res.created) totalCreated += res.created;
        if (res.skipped) totalSkipped += res.skipped;
        if (res.errors?.length) totalErrors.push(...res.errors);
      }

      setProgress(Math.round(((i + 1) / batches.length) * 100));
    }

    setResult({ created: totalCreated, skipped: totalSkipped, errors: totalErrors, total: parsedDonors.length });
    setUploading(false);
    queryClient.invalidateQueries({ queryKey: ['donors'] });

    if (totalCreated > 0) {
      toast({ title: 'Upload Complete', description: `${totalCreated} donors created successfully` });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!uploading) { onOpenChange(v); if (!v) reset(); } }}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bulk Upload Donors
          </DialogTitle>
          <DialogDescription>
            Upload an Excel file (.xlsx/.xls) to import donor profiles with per-home donations.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* File Input */}
            <div className="flex items-center gap-3 flex-wrap">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <Upload className="h-4 w-4 mr-2" />
                {fileName || 'Select Excel File'}
              </Button>
              <Button variant="secondary" onClick={handleDownloadTemplate} disabled={homes.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
              {parsedDonors.length > 0 && (
                <Badge variant="secondary">{parsedDonors.length} unique donors found</Badge>
              )}
            </div>

            {/* Unmatched columns warning */}
            {unmatchedColumns.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800">
                <AlertCircle className="h-4 w-4 inline mr-1" />
                Unmatched home columns (skipped): {unmatchedColumns.join(', ')}
              </div>
            )}

            {/* Preview Table */}
            {parsedDonors.length > 0 && (
              <ScrollArea className="flex-1 border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Total Donation</TableHead>
                      <TableHead>PAN</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedDonors.slice(0, 100).map((d, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">{d.name}</TableCell>
                        <TableCell>{d.phone || '-'}</TableCell>
                        <TableCell><Badge variant="outline">{mapCategoryLabel(d.donor_category)}</Badge></TableCell>
                        <TableCell className="font-semibold">
                          {d.total_donation > 0 ? `₹${d.total_donation.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell>{d.pan_number || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {parsedDonors.length > 100 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Showing first 100 of {parsedDonors.length} donors
                  </p>
                )}
              </ScrollArea>
            )}

            {/* Progress */}
            {uploading && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-muted-foreground text-center">Uploading... {progress}%</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { onOpenChange(false); reset(); }} disabled={uploading}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={parsedDonors.length === 0 || uploading}>
                <Upload className="h-4 w-4 mr-2" />
                Upload {parsedDonors.length} Donors
              </Button>
            </div>
          </div>
        ) : (
          /* Results */
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-green-700">{result.created}</p>
                <p className="text-sm text-green-600">Created</p>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-200">
                <AlertCircle className="h-6 w-6 text-amber-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-amber-700">{result.skipped}</p>
                <p className="text-sm text-amber-600">Skipped (duplicates)</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                <X className="h-6 w-6 text-red-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-red-700">{result.errors.length}</p>
                <p className="text-sm text-red-600">Errors</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <ScrollArea className="max-h-32 border rounded-md p-3">
                {result.errors.map((err, i) => (
                  <p key={i} className="text-sm text-destructive">{err}</p>
                ))}
              </ScrollArea>
            )}

            <div className="flex justify-end">
              <Button onClick={() => { onOpenChange(false); reset(); }}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
