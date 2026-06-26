import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useUpdateNeed, type NeedWithRelations } from '@/hooks/useNeeds';
import { useNeedAttachments } from '@/hooks/useNeedAttachments';
import { supabase } from '@/integrations/supabase/client';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';
import { 
  FileText, 
  IndianRupee, 
  Package, 
  Upload, 
  X, 
  Loader2,
  Send,
  ImageIcon,
  Receipt
} from 'lucide-react';

interface SendReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  need: NeedWithRelations;
  onGenerateInvoice?: () => void;
}

export function SendReportDialog({ open, onOpenChange, need, onGenerateInvoice }: SendReportDialogProps) {
  const [notes, setNotes] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const updateNeed = useUpdateNeed();
  const { uploadFiles, uploading } = useNeedAttachments();
  
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const uploadedUrls = await uploadFiles(Array.from(files), 'photo', need.id);
    setPhotoUrls(prev => [...prev, ...uploadedUrls]);
  };
  
  const removePhoto = (urlToRemove: string) => {
    setPhotoUrls(prev => prev.filter(url => url !== urlToRemove));
  };
  
  const handleSubmit = async () => {
    if (!confirmed) {
      toast.error('Please confirm that the items were received');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Build fulfillment details
      const fulfillmentDetails = JSON.stringify({
        notes,
        photoUrls,
        reportedAt: new Date().toISOString(),
      });
      
      // Update the need with fulfillment details
      await updateNeed.mutateAsync({
        id: need.id,
        fulfillment_details: notes || 'Items received and verified',
        photo_urls: photoUrls.length > 0 ? photoUrls : need.photo_urls,
      });
      
      // Create notification for admins (if we have a creator)
      if (need.created_by) {
        const { error: notifError } = await supabase
          .from('notifications')
          .insert([{
            user_id: need.created_by,
            type: 'task_assigned' as const,
            title: 'Fulfillment Report Received',
            message: `Social Worker has confirmed receipt of "${need.description || need.product_name || 'items'}" at ${need.homes?.name || 'the home'}. ${notes ? `Notes: ${notes}` : ''}`,
          }]);
        
        if (notifError) {
          console.error('Failed to create notification:', notifError);
        }
      }
      
      toast.success('Report sent to admin successfully');
      onOpenChange(false);
      
      // Reset form
      setNotes('');
      setConfirmed(false);
      setPhotoUrls([]);
    } catch (error) {
      console.error('Failed to send report:', error);
      toast.error('Failed to send report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Send Fulfillment Report
          </DialogTitle>
          <DialogDescription>
            Confirm receipt and send a report to the admin about this fulfilled need.
          </DialogDescription>
        </DialogHeader>
        
        {/* Need Summary */}
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <Badge variant="outline">
              {need.categories?.label || 'General'}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {formatDate(need.date)}
            </span>
          </div>
          <p className="font-medium">{need.description || need.product_name || 'Need'}</p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {need.donation_mode === 'MONEY_ONLY' && need.collected_amount ? (
              <span className="flex items-center gap-1">
                <IndianRupee className="h-3 w-3" />
                {formatCurrency(need.collected_amount)} collected
              </span>
            ) : need.fulfilled_product_qty ? (
              <span className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                {need.fulfilled_product_qty} {need.product_unit} fulfilled
              </span>
            ) : null}
          </div>
        </div>
        
        {/* Photo Upload */}
        <div className="space-y-2">
          <Label>Attach Photos (optional)</Label>
          <div className="flex flex-wrap gap-2">
            {photoUrls.map((url, index) => (
              <div key={index} className="relative group">
                <img 
                  src={url} 
                  alt={`Proof ${index + 1}`} 
                  className="h-16 w-16 object-cover rounded border"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(url)}
                  className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            
            <label className="h-16 w-16 border-2 border-dashed rounded flex items-center justify-center cursor-pointer hover:bg-accent transition-colors">
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={uploading}
              />
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
              )}
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            Upload photos as proof of receipt
          </p>
        </div>
        
        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            placeholder="Add any notes about the received items, condition, or feedback..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>
        
        {/* Confirmation Checkbox */}
        <div className="flex items-start gap-3 p-3 border rounded-lg">
          <Checkbox
            id="confirm"
            checked={confirmed}
            onCheckedChange={(checked) => setConfirmed(checked === true)}
          />
          <div className="space-y-1">
            <Label htmlFor="confirm" className="cursor-pointer">
              I confirm that the items/funds have been received
            </Label>
            <p className="text-xs text-muted-foreground">
              This report will be sent to the admin for their records
            </p>
          </div>
        </div>

        {/* Generate Invoice Option */}
        {onGenerateInvoice && (
          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-200">Generate Receipt for Donor</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Create a receipt from MS Chellamuthu Trust
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onGenerateInvoice();
              }}
              className="border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50"
            >
              <Receipt className="h-4 w-4 mr-2" />
              Generate Invoice
            </Button>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!confirmed || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
