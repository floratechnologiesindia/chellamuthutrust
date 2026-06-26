import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Upload, X, Loader2, CheckCircle2, Receipt, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/formatters';

export interface CompletionReportData {
  id: string;
  title: string;
  date: string;
  amount?: number;
  donorName?: string;
  type: 'food_slot' | 'kind_donation';
}

interface CompletionReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemData: CompletionReportData;
  onComplete: (reportData: { notes: string; photoUrls: string[] }) => Promise<void>;
  onGenerateInvoice?: () => void;
  trustId?: string;
}

export function CompletionReportDialog({
  open,
  onOpenChange,
  itemData,
  onComplete,
  onGenerateInvoice,
  trustId,
}: CompletionReportDialogProps) {
  const [notes, setNotes] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [reportSaved, setReportSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [reportSentToAdmin, setReportSentToAdmin] = useState(false);
  const [isSendingToAdmin, setIsSendingToAdmin] = useState(false);

  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/tiff'];

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter(f => ALLOWED_IMAGE_TYPES.includes(f.type));
    const rejectedFiles = Array.from(files).filter(f => !ALLOWED_IMAGE_TYPES.includes(f.type));

    if (rejectedFiles.length > 0) {
      toast.error('Only image files (JPG, PNG, WEBP) are allowed. GIFs and PDFs are not supported.');
    }

    if (validFiles.length === 0) return;

    setIsUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of validFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${itemData.type}-${itemData.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${itemData.type}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('completion-reports')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('completion-reports')
          .getPublicUrl(filePath);

        if (urlData?.publicUrl) {
          uploadedUrls.push(urlData.publicUrl);
        }
      }

      setPhotoUrls(prev => [...prev, ...uploadedUrls]);
      if (uploadedUrls.length > 0) {
        toast.success(`Uploaded ${uploadedUrls.length} photo(s)`);
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      toast.error('Failed to upload photos');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removePhoto = (urlToRemove: string) => {
    setPhotoUrls(prev => prev.filter(url => url !== urlToRemove));
  };

  const handleSubmit = async () => {
    if (!confirmed) {
      toast.error('Please confirm the completion');
      return;
    }

    setIsSubmitting(true);
    try {
      await onComplete({ notes, photoUrls });
      setReportSaved(true);
    } catch (error) {
      console.error('Error saving report:', error);
      toast.error('Failed to save completion report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendToAdmin = async () => {
    if (!trustId) {
      toast.error('Trust information not available');
      return;
    }

    setIsSendingToAdmin(true);
    try {
      const { data: adminUsers } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['admin', 'super_admin']);

      if (adminUsers && adminUsers.length > 0) {
        const { data: trustProfiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('trust_id', trustId)
          .in('id', adminUsers.map(u => u.user_id));

        const adminIds = trustProfiles?.map(p => p.id) || [];
        const superAdminIds = adminUsers
          .filter(u => u.role === 'super_admin')
          .map(u => u.user_id);

        const allAdminIds = [...new Set([...adminIds, ...superAdminIds])];

        const typeLabel = itemData.type === 'food_slot' ? 'Food Slot' : 'Kind Donation';
        const notifications = allAdminIds.map(adminId => ({
          user_id: adminId,
          type: 'task_assigned' as const,
          title: `${typeLabel} Completed`,
          message: `Completion report filed for "${itemData.title}" on ${formatDate(itemData.date)}.${notes ? ` Notes: ${notes}` : ''}`,
          is_read: false,
        }));

        if (notifications.length > 0) {
          await supabase.from('notifications').insert(notifications);
        }
      }

      setReportSentToAdmin(true);
    } catch (error) {
      console.error('Failed to send report to admin:', error);
      toast.error('Failed to send report to admin');
    } finally {
      setIsSendingToAdmin(false);
    }
  };

  const handleGenerateInvoice = () => {
    if (onGenerateInvoice) {
      onGenerateInvoice();
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    setNotes('');
    setConfirmed(false);
    setPhotoUrls([]);
    setReportSaved(false);
    setReportSentToAdmin(false);
    onOpenChange(false);
  };

  const typeLabel = itemData.type === 'food_slot' ? 'Food Slot' : 'Kind Donation';
  const confirmationText = itemData.type === 'food_slot' 
    ? 'I confirm the meal was served successfully'
    : 'I confirm the donation was received';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Completion Report</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Item Summary */}
          <div className="p-3 bg-muted rounded-lg space-y-1">
            <div className="flex items-center justify-between">
              <Badge variant="outline">{typeLabel}</Badge>
              <span className="text-sm text-muted-foreground">{formatDate(itemData.date)}</span>
            </div>
            <h4 className="font-medium">{itemData.title}</h4>
            {itemData.amount && (
              <p className="text-sm text-muted-foreground">{formatCurrency(itemData.amount)}</p>
            )}
            {itemData.donorName && (
              <p className="text-sm">Sponsored by: <span className="font-medium">{itemData.donorName}</span></p>
            )}
          </div>

          {/* Photo Upload Section */}
          <div className="space-y-2">
            <Label>Upload Photos (Proof of Completion)</Label>
            
            {/* Photo Previews */}
            {photoUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {photoUrls.map((url, index) => (
                  <div key={index} className="relative aspect-square rounded-md overflow-hidden border">
                    <img src={url} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                    {!reportSaved && (
                      <button
                        onClick={() => removePhoto(url)}
                        className="absolute top-1 right-1 p-1 bg-background/80 rounded-full hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Upload Button */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUploading || reportSaved}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Add Photos
                  </>
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/bmp,image/tiff"
                multiple
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={isUploading || reportSaved}
              />
              <span className="text-xs text-muted-foreground">
                {photoUrls.length} photo(s) uploaded
              </span>
            </div>
          </div>

          {/* Notes Section */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes / Feedback</Label>
            <Textarea
              id="notes"
              placeholder={itemData.type === 'food_slot' 
                ? "E.g., Meals served to 45 residents. Special dietary requests accommodated..."
                : "E.g., Items received in good condition. Verified quantity..."
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              disabled={reportSaved}
            />
          </div>

          {/* Confirmation Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="confirm" 
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked as boolean)}
              disabled={reportSaved}
            />
            <Label htmlFor="confirm" className="text-sm cursor-pointer">
              {confirmationText}
            </Label>
          </div>

          {/* Success State */}
          {reportSaved && !reportSentToAdmin && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Report saved! Send it to admin for review.</span>
            </div>
          )}
          {reportSentToAdmin && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Report sent to admin successfully!</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            {reportSaved ? 'Close' : 'Cancel'}
          </Button>
          
          {!reportSaved ? (
            <Button 
              onClick={handleSubmit} 
              disabled={!confirmed || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Report'
              )}
            </Button>
          ) : (
            <>
              {trustId && !reportSentToAdmin && (
                <Button 
                  onClick={handleSendToAdmin} 
                  disabled={isSendingToAdmin}
                  variant="secondary"
                >
                  {isSendingToAdmin ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Report to Admin
                    </>
                  )}
                </Button>
              )}
              {onGenerateInvoice && (
                <Button onClick={handleGenerateInvoice}>
                  <Receipt className="h-4 w-4 mr-2" />
                  Generate Invoice
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
