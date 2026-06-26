
-- Create bank_transactions table
CREATE TABLE public.bank_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trust_id uuid NOT NULL REFERENCES public.trusts(id) ON DELETE CASCADE,
  transaction_date date NOT NULL,
  amount numeric NOT NULL,
  reference_number text,
  narration text,
  payment_mode text NOT NULL DEFAULT 'NEFT',
  remarks text,
  status text NOT NULL DEFAULT 'unidentified',
  assigned_donor_id uuid REFERENCES public.profiles(id),
  assigned_category_id uuid REFERENCES public.categories(id),
  assigned_need_id uuid REFERENCES public.needs(id),
  assigned_by uuid REFERENCES public.profiles(id),
  assigned_at timestamptz,
  reconciled_by uuid REFERENCES public.profiles(id),
  reconciled_at timestamptz,
  source text NOT NULL DEFAULT 'manual',
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

-- RLS: Finance users can manage transactions in their trust
CREATE POLICY "Finance can manage transactions in their trust"
ON public.bank_transactions
FOR ALL
TO authenticated
USING (
  (trust_id IN (SELECT profiles.trust_id FROM profiles WHERE profiles.id = auth.uid()))
  AND has_role(auth.uid(), 'finance'::app_role)
);

-- RLS: Admins can view and update transactions in their trust
CREATE POLICY "Admins can view transactions in their trust"
ON public.bank_transactions
FOR SELECT
TO authenticated
USING (
  (trust_id IN (SELECT profiles.trust_id FROM profiles WHERE profiles.id = auth.uid()))
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update transactions in their trust"
ON public.bank_transactions
FOR UPDATE
TO authenticated
USING (
  (trust_id IN (SELECT profiles.trust_id FROM profiles WHERE profiles.id = auth.uid()))
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- RLS: Super admins can manage all
CREATE POLICY "Super admins can manage all bank transactions"
ON public.bank_transactions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));
