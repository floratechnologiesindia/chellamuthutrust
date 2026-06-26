import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Mail, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SendMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  donorName: string;
  donorPhone?: string | null;
  donorEmail?: string | null;
}

const SendMessageDialog = ({ open, onOpenChange, donorName, donorPhone, donorEmail }: SendMessageDialogProps) => {
  const [sendWhatsApp, setSendWhatsApp] = useState(!!donorPhone);
  const [sendEmail, setSendEmail] = useState(!!donorEmail);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const sendWhatsAppMessage = async (phone: string, msg: string): Promise<{ success: boolean; method: string; errorDetail?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          phone,
          message: msg.trim(),
          template_name: 'new_template',
          template_params: [],
        },
      });

      if (error) {
        // Edge function invocation error
        return { success: false, method: 'session', errorDetail: error.message || 'Network error' };
      }

      // The edge function now returns delivery_blocked with a human-readable message
      if (data?.error) {
        const detail = data.message || data.details?.info || 'Unknown error';
        return { success: false, method: data.method || 'unknown', errorDetail: detail };
      }

      return {
        success: true,
        method: data?.method === 'template' ? 'template' : 'session',
      };
    } catch {
      return { success: false, method: 'session', errorDetail: 'Network error' };
    }
  };

  const handleSend = async () => {
    if (!message.trim()) {
      toast({ title: 'Please enter a message', variant: 'destructive' });
      return;
    }
    if (!sendWhatsApp && !sendEmail) {
      toast({ title: 'Please select at least one channel', variant: 'destructive' });
      return;
    }
    if (sendEmail && !subject.trim()) {
      toast({ title: 'Please enter a subject for the email', variant: 'destructive' });
      return;
    }

    setSending(true);
    const results: string[] = [];
    const failures: string[] = [];

    try {
      if (sendWhatsApp && donorPhone) {
        const wa = await sendWhatsAppMessage(donorPhone, message);
        if (wa.success) {
          const label = wa.method === 'template' ? 'WhatsApp (template greeting)' : 'WhatsApp';
          results.push(label);
        } else {
          failures.push(`WhatsApp: ${wa.errorDetail}`);
        }
      }

      if (sendEmail && donorEmail) {
        const { error } = await supabase.functions.invoke('send-donor-report', {
          body: {
            donor_email: donorEmail,
            donor_name: donorName,
            subject: subject.trim(),
            message_body: message.trim(),
          },
        });
        if (error) {
          failures.push('Email');
        } else {
          results.push('Email');
        }
      }

      if (results.length > 0) {
        toast({ title: `Message sent via ${results.join(' & ')}` });
      }
      if (failures.length > 0) {
        toast({
          title: 'Delivery failed',
          description: failures.join('\n'),
          variant: 'destructive',
        });
      }
      if (results.length > 0) {
        onOpenChange(false);
        setSubject('');
        setMessage('');
      }
    } catch {
      toast({ title: 'Failed to send message', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Message to {donorName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {donorPhone && (
              <Badge variant="outline" className="gap-1">
                <MessageSquare className="h-3 w-3" /> {donorPhone}
              </Badge>
            )}
            {donorEmail && (
              <Badge variant="outline" className="gap-1">
                <Mail className="h-3 w-3" /> {donorEmail}
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            <Label>Send via</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={sendWhatsApp}
                  onCheckedChange={(c) => setSendWhatsApp(!!c)}
                  disabled={!donorPhone}
                />
                <span className={!donorPhone ? 'text-muted-foreground' : ''}>
                  WhatsApp {!donorPhone && '(no phone)'}
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={sendEmail}
                  onCheckedChange={(c) => setSendEmail(!!c)}
                  disabled={!donorEmail}
                />
                <span className={!donorEmail ? 'text-muted-foreground' : ''}>
                  Email {!donorEmail && '(no email)'}
                </span>
              </label>
            </div>
          </div>

          {sendEmail && (
            <div className="space-y-1">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Email subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Type your message here..."
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Note: If the donor hasn't messaged your WhatsApp number in the last 24 hours, a pre-approved template greeting (with their name) will be sent instead of your typed message.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SendMessageDialog;
