import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Camera, UtensilsCrossed, Package, Heart, CheckCircle2, MessageCircle, Mail, Receipt, FileText, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { foodSlotLegacySendBlockReason } from '@/lib/foodEventMediaUtils';
import { generateThanksLetterHtml } from '@/lib/generateThanksLetterHtml';
import { generateReceiptHtml } from '@/lib/generateReceiptHtml';
import { generateThanksLetterText } from '@/lib/generateThanksLetterText';
import { generateReceiptText } from '@/lib/generateReceiptText';
import { generateReceiptNumber } from '@/lib/formatters';

export interface SelectedWorkItem {
  id: string;
  type: 'food_slot' | 'kind_donation' | 'need' | 'task';
  title: string;
  donorId: string | null;
  donorName: string;
  home: string;
  date: string;
  value?: number;
  photos: string[];
  reportSentAt?: string | null;
  legacySendBlocked?: boolean;
}

interface SendToDonorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: SelectedWorkItem[];
  onSendComplete?: () => void;
}

type SendMedium = 'whatsapp' | 'email' | 'both';

export function SendToDonorDialog({
  open,
  onOpenChange,
  selectedItems,
  onSendComplete,
}: SendToDonorDialogProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendMedium, setSendMedium] = useState<SendMedium>('email');
  const [deselectedPhotos, setDeselectedPhotos] = useState<Set<string>>(new Set());
  const [includeReceipt, setIncludeReceipt] = useState(true);
  const [includeThanksLetter, setIncludeThanksLetter] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');

  const togglePhoto = (url: string) => {
    setDeselectedPhotos(prev => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  };

  const isPhotoSelected = (url: string) => !deselectedPhotos.has(url);

  // Group items by donor
  const donorGroups = useMemo(() => {
    const groups = new Map<string, { donorId: string; donorName: string; items: SelectedWorkItem[] }>();

    selectedItems.forEach(item => {
      if (!item.donorId) return;
      const key = item.donorId;
      if (!groups.has(key)) {
        groups.set(key, { donorId: item.donorId, donorName: item.donorName, items: [] });
      }
      groups.get(key)!.items.push(item);
    });

    return Array.from(groups.values());
  }, [selectedItems]);

  const getItemIcon = (type: SelectedWorkItem['type']) => {
    switch (type) {
      case 'food_slot':
        return <UtensilsCrossed className="h-3.5 w-3.5 text-orange-600 shrink-0" />;
      case 'kind_donation':
        return <Package className="h-3.5 w-3.5 text-blue-600 shrink-0" />;
      case 'need':
        return <Heart className="h-3.5 w-3.5 text-pink-600 shrink-0" />;
      case 'task':
        return <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />;
    }
  };

  const buildHtmlEmailBody = (
    group: { donorId: string; donorName: string; items: SelectedWorkItem[] },
    donorProfile: { email: string; name: string; address?: string; phone?: string } | null
  ): string => {
    const filteredItems = group.items.map(item => ({
      ...item,
      photos: item.photos.filter(url => isPhotoSelected(url)),
    }));

    const totalAmount = filteredItems.reduce((sum, item) => sum + (item.value || 0), 0);
    const allPhotos = filteredItems.flatMap(item => item.photos);
    const firstItem = filteredItems[0];

    let htmlParts: string[] = [];

    // 1. Thanks Letter
    if (includeThanksLetter && totalAmount > 0) {
      htmlParts.push(generateThanksLetterHtml({
        donorName: donorProfile?.name || group.donorName,
        amount: totalAmount,
        paymentMode: 'Online',
        paymentDate: firstItem?.date,
        description: firstItem?.title,
        homeName: firstItem?.home,
      }));
      htmlParts.push('<hr style="border: none; border-top: 3px solid #1a237e; margin: 30px 0;" />');
    }

    // 2. Receipt
    if (includeReceipt && totalAmount > 0) {
      const donationType = firstItem?.type === 'food_slot' ? 'food_slot' as const
        : firstItem?.type === 'kind_donation' ? 'kind_donation' as const
        : firstItem?.type === 'need' ? 'need' as const
        : 'donation' as const;

      htmlParts.push(generateReceiptHtml({
        receiptNumber: generateReceiptNumber(),
        date: firstItem?.date || new Date().toISOString(),
        donorName: donorProfile?.name || group.donorName,
        donorAddress: donorProfile?.address,
        donorPhone: donorProfile?.phone,
        donorEmail: donorProfile?.email,
        description: filteredItems.map(i => i.title).join(', '),
        amount: totalAmount,
        homeName: firstItem?.home,
        donationType,
        paymentMode: 'Online',
        paymentDate: firstItem?.date,
      }));
      htmlParts.push('<hr style="border: none; border-top: 3px solid #1a237e; margin: 30px 0;" />');
    }

    // 3. Completion Photos
    if (allPhotos.length > 0) {
      htmlParts.push(`
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a237e; font-size: 18px; margin-bottom: 16px;">📷 Completion Photos</h2>
          <div style="display: flex; flex-wrap: wrap; gap: 10px;">
            ${allPhotos.map(url => `<img src="${url}" alt="Completion photo" style="width: 280px; height: 200px; object-fit: cover; border-radius: 8px; border: 1px solid #ddd;" />`).join('')}
          </div>
        </div>
      `);
    }

    // 4. Personal Message
    if (message) {
      htmlParts.push(`
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; background: #f8f9fa; border-radius: 8px; margin-top: 20px;">
          <h3 style="color: #333; font-size: 16px; margin: 0 0 10px;">Message from Admin</h3>
          <p style="color: #555; line-height: 1.6; white-space: pre-line; margin: 0;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
        </div>
      `);
    }

    // Items summary (always include)
    const itemsSummary = filteredItems.map(item =>
      `<li style="margin-bottom: 8px;">
        <strong>${item.title}</strong> — ${item.home}
        (${format(new Date(item.date), 'MMM d, yyyy')}${item.value ? ` ₹${item.value.toLocaleString()}` : ''})
      </li>`
    ).join('');

    htmlParts.push(`
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
        <h3 style="color: #1a237e; font-size: 16px; margin-bottom: 10px;">Completed Work Summary</h3>
        <ul style="color: #555; line-height: 1.8; padding-left: 20px;">${itemsSummary}</ul>
      </div>
    `);

    // Footer
    htmlParts.push(`
      <div style="text-align: center; padding: 20px; font-size: 12px; color: #999; border-top: 1px solid #eee; margin-top: 20px;">
        This email was sent from MS Chellamuthu Trust Management System.
      </div>
    `);

    return `<div style="background: #ffffff;">${htmlParts.join('')}</div>`;
  };

  const alreadySentItems = selectedItems.filter(i => i.reportSentAt);

  const handleSend = async () => {
    if (donorGroups.length === 0) {
      toast.error('No donors found in selected items.');
      return;
    }

    const blockedFood = selectedItems.filter((i) => i.type === 'food_slot' && i.legacySendBlocked);
    if (blockedFood.length > 0) {
      toast.error(foodSlotLegacySendBlockReason());
      return;
    }

    if (alreadySentItems.length > 0 && !window.confirm(
      `${alreadySentItems.length} item(s) were already sent earlier. Do you want to resend?`
    )) {
      return;
    }

    setSending(true);
    let emailFailures = 0;
    let notificationSuccesses = 0;
    let whatsappFailures = 0;
    let whatsappSuccesses = 0;
    let whatsappSkipped = 0;

    try {
      for (const group of donorGroups) {
        // Filter photos based on selection
        const filteredItems = group.items.map(item => ({
          ...item,
          photos: item.photos.filter(url => isPhotoSelected(url)),
        }));

        const itemLines = filteredItems.map(item =>
          `• ${item.title} — ${item.home} (${format(new Date(item.date), 'MMM d, yyyy')}${item.value ? ` ₹${item.value.toLocaleString()}` : ''})`
        ).join('\n');

        const totalPhotos = filteredItems.reduce((sum, item) => sum + item.photos.length, 0);
        const photoList = totalPhotos > 0 ? `\n\n${totalPhotos} completion photo(s) attached.` : '';
        const fullMessage = `Completed Work Report:\n\n${itemLines}${photoList}${message ? `\n\nMessage from Admin: ${message}` : ''}`;

        // Send via Email (notification + actual email)
        if (sendMedium === 'email' || sendMedium === 'both') {
          // In-app notification
          const { error } = await supabase.from('notifications').insert({
            user_id: group.donorId,
            type: 'work_completed' as const,
            title: 'Completed Work Report',
            message: fullMessage,
          });
          if (error) throw error;
          notificationSuccesses++;

          // Send actual email via edge function
          const { data: donorProfile } = await supabase
            .from('profiles')
            .select('email, name, address, phone')
            .eq('id', group.donorId)
            .single();

          if (donorProfile?.email) {
            const htmlBody = buildHtmlEmailBody(group, donorProfile);

            const { error: emailError } = await supabase.functions.invoke('send-donor-report', {
              body: {
                donor_email: donorProfile.email,
                donor_name: donorProfile.name || group.donorName,
                subject: 'Completed Work Report & Donation Receipt - MS Chellamuthu Trust',
                message_body: fullMessage,
                html_body: htmlBody,
              },
            });
            if (emailError) {
              console.error('Failed to send email:', emailError);
              emailFailures++;
            }
          }
        }

        // Send via WhatsApp
        if (sendMedium === 'whatsapp' || sendMedium === 'both') {
          const { data: profile } = await supabase
            .from('profiles')
            .select('phone, name, address')
            .eq('id', group.donorId)
            .single();

          if (profile?.phone) {
            const allPhotos = filteredItems.flatMap(item => item.photos);
            const totalAmount = filteredItems.reduce((sum, item) => sum + (item.value || 0), 0);
            const firstItem = filteredItems[0];

            // Build rich WhatsApp message with plain-text thanks letter & receipt
            let whatsappParts: string[] = [];

            if (includeThanksLetter && totalAmount > 0) {
              whatsappParts.push(generateThanksLetterText({
                donorName: profile.name || group.donorName,
                amount: totalAmount,
                paymentMode: 'Online',
                paymentDate: firstItem?.date,
                description: firstItem?.title,
                homeName: firstItem?.home,
              }));
            }

            if (includeReceipt && totalAmount > 0) {
              whatsappParts.push(generateReceiptText({
                receiptNumber: generateReceiptNumber(),
                date: firstItem?.date || new Date().toISOString(),
                donorName: profile.name || group.donorName,
                donorAddress: profile.address || undefined,
                amount: totalAmount,
                paymentMode: 'Online',
                paymentDate: firstItem?.date,
                description: filteredItems.map(i => i.title).join(', '),
                homeName: firstItem?.home,
              }));
            }

            whatsappParts.push(`--- COMPLETED WORK ---\n${itemLines}`);

            if (allPhotos.length > 0) {
              whatsappParts.push(`📷 Photos:\n${allPhotos.map((url, i) => `${i + 1}. ${url}`).join('\n')}`);
            }

            if (message) {
              whatsappParts.push(`Message from Admin: ${message}`);
            }

            const whatsappMessage = whatsappParts.join('\n\n');

            const { data: whatsappData, error: whatsappError } = await supabase.functions.invoke('send-whatsapp', {
              body: {
                phone: profile.phone,
                message: whatsappMessage,
              },
            });
            if (whatsappError || (whatsappData && whatsappData.error)) {
              console.error('WhatsApp send failed:', whatsappError || whatsappData);
              whatsappFailures++;
            } else if (whatsappData?.delivery_status === 'template_fallback') {
              // Template fallback means the full report was NOT delivered
              console.warn('WhatsApp fell back to template:', whatsappData.warnings);
              whatsappFailures++;
              const reason = whatsappData.session_failure_reason || 'Session expired';
              toast.warning(`WhatsApp report not delivered to ${group.donorName}. Only a generic greeting was sent. Reason: ${reason}. Previous send (if any) remains recorded.`, { duration: 10000 });
            } else {
              whatsappSuccesses++;
              // Show warnings about media failures
              if (whatsappData?.warnings?.length > 0) {
                toast.warning(whatsappData.warnings.join(' '), { duration: 6000 });
              }
            }
          } else {
            whatsappSkipped++;
          }
        }
      }

      // Show appropriate toast based on results
      const parts: string[] = [];
      
      if (sendMedium === 'email' || sendMedium === 'both') {
        if (emailFailures > 0 && notificationSuccesses > 0) {
          parts.push(`In-app notification sent to ${notificationSuccesses} donor(s), but email delivery failed.`);
        } else if (emailFailures > 0) {
          parts.push('Email delivery failed.');
        } else if (notificationSuccesses > 0) {
          parts.push(`Email sent to ${notificationSuccesses} donor(s).`);
        }
      }

      if (sendMedium === 'whatsapp' || sendMedium === 'both') {
        if (whatsappSuccesses > 0) {
          parts.push(`WhatsApp sent to ${whatsappSuccesses} donor(s).`);
        }
        if (whatsappFailures > 0) {
          const isResend = alreadySentItems.length > 0;
          parts.push(`WhatsApp ${isResend ? 'resend ' : ''}failed for ${whatsappFailures} donor(s).${isResend ? ' Previous delivery remains recorded.' : ''}`);
        }
        if (whatsappSkipped > 0) {
          parts.push(`${whatsappSkipped} donor(s) skipped — no phone number.`);
        }
      }

      const hasFailures = emailFailures > 0 || whatsappFailures > 0;
      const hasSuccesses = notificationSuccesses > 0 || whatsappSuccesses > 0;
      const summary = parts.join(' ');

      if (hasFailures && hasSuccesses) {
        toast.warning(summary, { duration: 8000 });
      } else if (hasFailures && !hasSuccesses) {
        toast.error(summary || 'Failed to send report.');
      } else {
        toast.success(summary || 'Report sent successfully!');
      }

      // Only mark items as sent if at least one channel truly delivered the report
      const emailSucceeded = (sendMedium === 'email' || sendMedium === 'both') && emailFailures === 0 && notificationSuccesses > 0;
      const whatsappSucceeded = (sendMedium === 'whatsapp' || sendMedium === 'both') && whatsappSuccesses > 0;
      const shouldMarkSent = emailSucceeded || whatsappSucceeded;

      if (shouldMarkSent) {
        const tableMap: Record<string, string> = {
          food_slot: 'food_slots',
          kind_donation: 'kind_donations',
          need: 'needs',
          task: 'tasks',
        };
        const grouped = new Map<string, string[]>();
        for (const item of selectedItems) {
          if (item.type === 'food_slot') continue;
          const table = tableMap[item.type];
          if (!grouped.has(table)) grouped.set(table, []);
          grouped.get(table)!.push(item.id);
        }
        const now = new Date().toISOString();
        for (const [table, ids] of grouped) {
          await supabase.from(table as any).update({ report_sent_at: now } as any).in('id', ids);
        }
      }

      onSendComplete?.();
      setMessage('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error sending report:', error);
      toast.error('Failed to send report');
    } finally {
      setSending(false);
    }
  };

  const itemsWithoutDonor = selectedItems.filter(i => !i.donorId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Report to Donor
          </DialogTitle>
          <DialogDescription>
            Review completed work and send to the associated donor(s)
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[55vh] pr-4">
          <div className="space-y-4">
            {/* Donor groups with inline photos */}
            {donorGroups.map(group => (
              <div key={group.donorId} className="border rounded-lg p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{group.donorName}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {group.items.length} item(s)
                  </span>
                </div>
                <div className="space-y-3">
                  {group.items.map(item => (
                    <div key={item.id} className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        {getItemIcon(item.type)}
                        <span className="truncate font-medium">{item.title}</span>
                        <span className="text-muted-foreground">— {item.home}</span>
                        <span className="text-muted-foreground ml-auto shrink-0">
                          {format(new Date(item.date), 'MMM d')}
                        </span>
                        {item.value && (
                          <span className="font-medium shrink-0">₹{item.value.toLocaleString()}</span>
                        )}
                      </div>
                      {/* Inline photos for this item with selection */}
                      {item.photos.length > 0 && (
                        <div className="flex gap-2 pl-6 overflow-x-auto">
                          {item.photos.map((url, idx) => (
                            <div 
                              key={idx} 
                              className={cn(
                                'relative h-16 w-16 rounded-md overflow-hidden shrink-0 cursor-pointer border-2 transition-all',
                                isPhotoSelected(url) ? 'border-primary' : 'border-muted opacity-40'
                              )}
                              onClick={() => togglePhoto(url)}
                            >
                              <img src={url} alt="" className="w-full h-full object-cover" />
                              {isPhotoSelected(url) && (
                                <div className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                                  <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                                </div>
                              )}
                            </div>
                          ))}
                          <div className="flex items-center">
                            <Camera className="h-3 w-3 text-muted-foreground mr-1" />
                            <span className="text-xs text-muted-foreground">
                              {item.photos.filter(u => isPhotoSelected(u)).length}/{item.photos.length}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Already sent warning */}
            {alreadySentItems.length > 0 && (
              <div className="border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 rounded-lg p-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  {alreadySentItems.length} item(s) were already sent before. Sending again will update the sent timestamp.
                </p>
              </div>
            )}

            {/* Items without donor warning */}
            {itemsWithoutDonor.length > 0 && (
              <div className="border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  {itemsWithoutDonor.length} item(s) skipped — no linked donor
                </p>
              </div>
            )}

            {/* Include Receipt & Thanks Letter checkboxes */}
            <div className="space-y-3 border rounded-lg p-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="include-receipt"
                  checked={includeReceipt}
                  onCheckedChange={(checked) => setIncludeReceipt(checked === true)}
                />
                <Label htmlFor="include-receipt" className="flex items-center gap-2 cursor-pointer font-normal">
                  <Receipt className="h-4 w-4 text-primary" />
                  Include Donation Receipt
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="include-thanks"
                  checked={includeThanksLetter}
                  onCheckedChange={(checked) => setIncludeThanksLetter(checked === true)}
                />
                <Label htmlFor="include-thanks" className="flex items-center gap-2 cursor-pointer font-normal">
                  <FileText className="h-4 w-4 text-primary" />
                  Include Thanks Letter
                </Label>
              </div>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label>Personal Message (optional)</Label>
              <Textarea
                placeholder="Add a note for the donor..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>

          </div>
        </ScrollArea>

        {/* Communication Medium - pinned outside scroll */}
        <div className="space-y-3 pt-3 border-t">
          <Label>Send via</Label>
          <RadioGroup value={sendMedium} onValueChange={(v) => setSendMedium(v as SendMedium)} className="flex gap-4">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="whatsapp" id="medium-whatsapp" />
              <Label htmlFor="medium-whatsapp" className="flex items-center gap-1.5 cursor-pointer font-normal">
                <MessageCircle className="h-4 w-4 text-green-600" />
                WhatsApp
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="email" id="medium-email" />
              <Label htmlFor="medium-email" className="flex items-center gap-1.5 cursor-pointer font-normal">
                <Mail className="h-4 w-4 text-blue-600" />
                Email
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="both" id="medium-both" />
              <Label htmlFor="medium-both" className="flex items-center gap-1.5 cursor-pointer font-normal">
                Both
              </Label>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="outline"
            disabled={donorGroups.length === 0}
            onClick={async () => {
              const group = donorGroups[0];
              if (!group) return;
              const { data: donorProfile } = await supabase
                .from('profiles')
                .select('email, name, address, phone')
                .eq('id', group.donorId)
                .single();
              const html = buildHtmlEmailBody(group, donorProfile);
              setPreviewHtml(html);
              setShowPreview(true);
            }}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview Email
          </Button>
          <Button onClick={handleSend} disabled={sending || donorGroups.length === 0}>
            <Send className="h-4 w-4 mr-2" />
            {sending ? 'Sending...' : `Send to ${donorGroups.length} Donor(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Email Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Email Preview
            </DialogTitle>
            <DialogDescription>
              This is how the email will appear to the donor
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 border rounded-lg overflow-hidden">
            <iframe
              srcDoc={previewHtml}
              className="w-full h-full border-0"
              title="Email Preview"
              sandbox=""
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
