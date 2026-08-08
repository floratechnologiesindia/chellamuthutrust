import { useState } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useCreateKindDonation } from '@/hooks/useKindDonations';
import { GenerateInvoiceDialog } from './GenerateInvoiceDialog';
import {
  DonorClassificationFields,
  emptyDonorClassification,
  type DonorClassificationValues,
} from '@/components/donor/DonorClassificationFields';
import type { InvoiceData } from './InvoicePreview';

const ITEM_TYPES = [
  'Food Items',
  'Clothing',
  'Books & Stationery',
  'Medical Supplies',
  'Furniture',
  'Electronics',
  'Toys & Games',
  'Household Items',
  'Other',
];

interface WalkinKindDonationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  homeId: string;
  trustId: string;
  homeName: string;
}

export function WalkinKindDonationDialog({
  open,
  onOpenChange,
  homeId,
  trustId,
  homeName,
}: WalkinKindDonationDialogProps) {
  const createMutation = useCreateKindDonation();
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceData, setInvoiceData] = useState<Omit<InvoiceData, 'receiptNumber'> | null>(null);

  const [donorInfo, setDonorInfo] = useState<DonorClassificationValues>(emptyDonorClassification());

  const [formData, setFormData] = useState({
    donor_name: '',
    item_type: '',
    item_description: '',
    quantity: '1',
    estimated_value: '',
    notes: '',
  });

  const resetForm = () => {
    setDonorInfo(emptyDonorClassification());
    setFormData({
      donor_name: '',
      item_type: '',
      item_description: '',
      quantity: '1',
      estimated_value: '',
      notes: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.item_type) {
      toast.error('Please select an item type');
      return;
    }

    try {
      await createMutation.mutateAsync({
        trust_id: trustId,
        home_id: homeId,
        donor_name: donorInfo.donor_name || formData.donor_name || 'Walk-in Donor',
        donor_address: donorInfo.donor_address || null,
        donor_pan: donorInfo.donor_pan || null,
        donor_phone: donorInfo.donor_phone || null,
        donor_email: donorInfo.donor_email || null,
        donor_frequency: donorInfo.donor_frequency,
        item_type: formData.item_type,
        item_description: formData.item_description || null,
        quantity: formData.quantity ? parseInt(formData.quantity) : 1,
        estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
        received_date: format(new Date(), 'yyyy-MM-dd'),
        notes: formData.notes || null,
        delivery_mode: 'SELF_DELIVERY',
        status: 'RECEIVED',
      });

      toast.success('Kind donation recorded successfully');

      // Prepare invoice data
      const estValue = formData.estimated_value ? parseFloat(formData.estimated_value) : 0;
      setInvoiceData({
        date: format(new Date(), 'yyyy-MM-dd'),
        donorName: donorInfo.donor_name || formData.donor_name || 'Walk-in Donor',
        donorPhone: donorInfo.donor_phone || undefined,
        donorAddress: donorInfo.donor_address || undefined,
        panNumber: donorInfo.donor_pan || undefined,
        description: `${formData.item_type}${formData.item_description ? ' - ' + formData.item_description : ''} (Qty: ${formData.quantity || 1})`,
        amount: estValue,
        homeName,
        donationType: 'kind_donation',
      });

      onOpenChange(false);
      resetForm();
      setShowInvoice(true);
    } catch (error) {
      toast.error('Failed to record donation');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Accept Walk-in Kind Donation</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <DonorClassificationFields
              values={{
                ...donorInfo,
                donor_name: donorInfo.donor_name || formData.donor_name,
              }}
              onChange={(patch) => {
                setDonorInfo((prev) => ({ ...prev, ...patch }));
                if (patch.donor_name !== undefined) {
                  setFormData((prev) => ({ ...prev, donor_name: patch.donor_name || '' }));
                }
              }}
            />
            <div className="space-y-2">
              <Label>Item Type *</Label>
              <Select value={formData.item_type} onValueChange={(v) => setFormData({ ...formData, item_type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select item type" />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Item Description</Label>
              <Input
                value={formData.item_description}
                onChange={(e) => setFormData({ ...formData, item_description: e.target.value })}
                placeholder="e.g., 50 kg rice, 20 blankets"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label>Est. Value (₹)</Label>
                <Input
                  type="number"
                  value={formData.estimated_value}
                  onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes"
                rows={2}
              />
            </div>
            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Recording...' : 'Record & Generate Receipt'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {invoiceData && (
        <GenerateInvoiceDialog
          open={showInvoice}
          onOpenChange={setShowInvoice}
          invoiceData={invoiceData}
        />
      )}
    </>
  );
}
