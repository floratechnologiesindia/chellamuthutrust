import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Plus, Trash2, IndianRupee, Calendar, Users, TrendingUp } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useTrusts } from '@/hooks/useReportData';
import { useCorpusFundContributions, useCreateCorpusFund, useDeleteCorpusFund, useCorpusFundStats } from '@/hooks/useCorpusFund';
import { amountToWords, formatDate, formatCurrency } from '@/lib/formatters';

const CONTRIBUTION_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'upi', label: 'UPI' },
  { value: 'neft', label: 'NEFT' },
  { value: 'rtgs', label: 'RTGS' },
  { value: 'online', label: 'Online Payment' },
];

export default function CorpusFund() {
  const [selectedTrust, setSelectedTrust] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const trustId = selectedTrust === 'all' ? null : selectedTrust;
  const { data: trusts } = useTrusts();
  const { data: contributions, isLoading } = useCorpusFundContributions(trustId);
  const { data: stats } = useCorpusFundStats(trustId);
  const createMutation = useCreateCorpusFund();
  const deleteMutation = useDeleteCorpusFund();

  const [formData, setFormData] = useState({
    trust_id: '',
    donor_name: '',
    amount: '',
    contribution_date: format(new Date(), 'yyyy-MM-dd'),
    purpose: '',
    notes: '',
    donor_address: '',
    donor_pan: '',
    contribution_mode: '',
    reference_number: '',
    declaration_agreed: false,
  });

  const amountInWords = useMemo(() => {
    const amount = parseFloat(formData.amount) || 0;
    return amountToWords(amount);
  }, [formData.amount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.trust_id || !formData.amount || !formData.contribution_date) {
      toast.error('Please fill in required fields');
      return;
    }

    if (!formData.declaration_agreed) {
      toast.error('Please agree to the declaration');
      return;
    }

    try {
      await createMutation.mutateAsync({
        trust_id: formData.trust_id,
        donor_name: formData.donor_name || null,
        amount: parseFloat(formData.amount),
        contribution_date: formData.contribution_date,
        purpose: formData.purpose || null,
        notes: formData.notes || null,
        donor_address: formData.donor_address || null,
        donor_pan: formData.donor_pan || null,
        contribution_mode: formData.contribution_mode || null,
        reference_number: formData.reference_number || null,
        declaration_agreed: formData.declaration_agreed,
        declaration_agreed_at: formData.declaration_agreed ? new Date().toISOString() : null,
      });
      toast.success('Corpus fund contribution added successfully');
      setIsDialogOpen(false);
      setFormData({
        trust_id: '',
        donor_name: '',
        amount: '',
        contribution_date: format(new Date(), 'yyyy-MM-dd'),
        purpose: '',
        notes: '',
        donor_address: '',
        donor_pan: '',
        contribution_mode: '',
        reference_number: '',
        declaration_agreed: false,
      });
    } catch (error) {
      toast.error('Failed to add contribution');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Contribution deleted');
    } catch (error) {
      toast.error('Failed to delete contribution');
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Corpus Fund</h1>
            <p className="text-muted-foreground">Manage corpus fund contributions</p>
          </div>
          <div className="flex gap-3">
            <Select value={selectedTrust} onValueChange={setSelectedTrust}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Trust" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Trusts</SelectItem>
                {trusts?.map((trust) => (
                  <SelectItem key={trust.id} value={trust.id}>{trust.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contribution
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Corpus Fund Contribution</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="trust">Trust *</Label>
                      <Select value={formData.trust_id} onValueChange={(v) => setFormData({ ...formData, trust_id: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Trust" />
                        </SelectTrigger>
                        <SelectContent>
                          {trusts?.map((trust) => (
                            <SelectItem key={trust.id} value={trust.id}>{trust.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="donor_name">Donor Name *</Label>
                      <Input
                        id="donor_name"
                        value={formData.donor_name}
                        onChange={(e) => setFormData({ ...formData, donor_name: e.target.value })}
                        placeholder="Enter donor name"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="amount">Amount (₹) *</Label>
                        <Input
                          id="amount"
                          type="number"
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                          placeholder="0"
                          min="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="date">Date *</Label>
                        <Input
                          id="date"
                          type="date"
                          value={formData.contribution_date}
                          onChange={(e) => setFormData({ ...formData, contribution_date: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="purpose">Purpose</Label>
                      <Input
                        id="purpose"
                        value={formData.purpose}
                        onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                        placeholder="e.g., Building fund, Education"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Additional notes"
                        rows={2}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Donor Declaration Section */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Donor Declaration for Corpus Contribution</h3>
                    
                    <div className="bg-muted/50 p-4 rounded-lg border text-sm leading-relaxed">
                      <p>
                        I/We hereby confirm that the sum of{' '}
                        <strong>
                          Rs. {formData.amount ? formatCurrency(parseFloat(formData.amount)).replace('₹', '') : '___'}
                        </strong>{' '}
                        (<strong>{formData.amount ? amountInWords : 'Rupees ___ only'}</strong>), 
                        contributed by me/us to <strong>M.S. Chellamuthu Trust and Research Foundation</strong> on{' '}
                        <strong>{formData.contribution_date ? formatDate(formData.contribution_date) : '_____ (date)'}</strong>, 
                        is made with specific direction that the said contribution shall form part of the{' '}
                        <strong>Trust Development Corpus Fund</strong> of the Trust.
                      </p>
                      <p className="mt-3">
                        I/We understand that the contribution will be treated as a corpus donation and accounted accordingly.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="donor_address">Address</Label>
                        <Textarea
                          id="donor_address"
                          value={formData.donor_address}
                          onChange={(e) => setFormData({ ...formData, donor_address: e.target.value })}
                          placeholder="Enter donor address"
                          rows={2}
                        />
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="donor_pan">PAN (if applicable)</Label>
                          <Input
                            id="donor_pan"
                            value={formData.donor_pan}
                            onChange={(e) => setFormData({ ...formData, donor_pan: e.target.value.toUpperCase() })}
                            placeholder="e.g., ABCDE1234F"
                            maxLength={10}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="contribution_mode">Mode of Contribution</Label>
                        <Select 
                          value={formData.contribution_mode} 
                          onValueChange={(v) => setFormData({ ...formData, contribution_mode: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select mode" />
                          </SelectTrigger>
                          <SelectContent>
                            {CONTRIBUTION_MODES.map((mode) => (
                              <SelectItem key={mode.value} value={mode.value}>{mode.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reference_number">Reference No.</Label>
                        <Input
                          id="reference_number"
                          value={formData.reference_number}
                          onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                          placeholder="Transaction/Cheque reference"
                        />
                      </div>
                    </div>

                    {/* Declaration Summary */}
                    <div className="bg-muted/30 p-4 rounded-lg border space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <span className="text-muted-foreground">Name of Donor:</span>
                        <span className="font-medium">{formData.donor_name || '-'}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <span className="text-muted-foreground">Address:</span>
                        <span className="font-medium">{formData.donor_address || '-'}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <span className="text-muted-foreground">PAN (if applicable):</span>
                        <span className="font-medium">{formData.donor_pan || '-'}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <span className="text-muted-foreground">Mode of Contribution & Ref No.:</span>
                        <span className="font-medium">
                          {formData.contribution_mode 
                            ? `${CONTRIBUTION_MODES.find(m => m.value === formData.contribution_mode)?.label || formData.contribution_mode}${formData.reference_number ? ` - ${formData.reference_number}` : ''}`
                            : '-'
                          }
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <span className="text-muted-foreground">Date:</span>
                        <span className="font-medium">{formData.contribution_date ? formatDate(formData.contribution_date) : '-'}</span>
                      </div>
                    </div>

                    {/* Digital Signature Checkbox */}
                    <div className="flex items-start space-x-3 pt-2">
                      <Checkbox
                        id="declaration_agreed"
                        checked={formData.declaration_agreed}
                        onCheckedChange={(checked) => 
                          setFormData({ ...formData, declaration_agreed: checked === true })
                        }
                      />
                      <Label 
                        htmlFor="declaration_agreed" 
                        className="text-sm font-medium leading-relaxed cursor-pointer"
                      >
                        <strong>I Agree</strong> (Digital Signature) - I confirm that all the information provided above is true and correct.
                      </Label>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={createMutation.isPending || !formData.declaration_agreed}
                  >
                    {createMutation.isPending ? 'Adding...' : 'Submit Contribution'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Corpus Fund</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats?.total?.toLocaleString() || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">This Year</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats?.thisYear?.toLocaleString() || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Contributions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.count || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Average Contribution</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{stats?.count ? Math.round(stats.total / stats.count).toLocaleString() : 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contributions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Contributions</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : contributions?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No corpus fund contributions found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Donor</TableHead>
                    <TableHead>Trust</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contributions?.map((contribution) => (
                    <TableRow key={contribution.id}>
                      <TableCell>{format(new Date(contribution.contribution_date), 'dd MMM yyyy')}</TableCell>
                      <TableCell>{contribution.donor_name || contribution.profiles?.name || 'Anonymous'}</TableCell>
                      <TableCell>{contribution.trusts?.name || '-'}</TableCell>
                      <TableCell>
                        {contribution.contribution_mode 
                          ? CONTRIBUTION_MODES.find(m => m.value === contribution.contribution_mode)?.label || contribution.contribution_mode 
                          : '-'
                        }
                      </TableCell>
                      <TableCell>{contribution.purpose || '-'}</TableCell>
                      <TableCell className="text-right font-medium">₹{Number(contribution.amount).toLocaleString()}</TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Contribution?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(contribution.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
