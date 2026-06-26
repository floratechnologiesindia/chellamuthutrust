
-- Create enums for various status types
CREATE TYPE public.home_type AS ENUM ('children_home', 'old_age_home', 'mixed', 'others');
CREATE TYPE public.resident_category AS ENUM ('child', 'old_age', 'others');
CREATE TYPE public.resident_status AS ENUM ('active', 'moved_out', 'deceased');
CREATE TYPE public.need_status AS ENUM ('OPEN', 'PARTIAL', 'FULLY_SPONSORED', 'COMPLETED', 'CANCELLED');
CREATE TYPE public.help_mode AS ENUM ('ONE_TIME', 'RECURRING');
CREATE TYPE public.recurring_frequency AS ENUM ('monthly', 'quarterly', 'yearly', 'none');
CREATE TYPE public.donation_type AS ENUM ('ONE_TIME', 'RECURRING');
CREATE TYPE public.payment_mode AS ENUM ('online', 'offline', 'in_kind');
CREATE TYPE public.donation_status AS ENUM ('PLEDGED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'OVERDUE');
CREATE TYPE public.occasion_type AS ENUM ('birthday', 'ancestor_remembrance', 'festival', 'other');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE public.task_status AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE public.notification_type AS ENUM ('donation_reminder', 'new_need_posted', 'task_assigned', 'task_due', 'recurring_payment_due');

-- 1. TRUSTS TABLE
CREATE TABLE public.trusts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  registration_number TEXT,
  description TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'India',
  pincode TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  image_url TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.trusts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage trusts" ON public.trusts FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can view their trust" ON public.trusts FOR SELECT USING (
  id IN (SELECT trust_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Public can view trusts" ON public.trusts FOR SELECT USING (true);

-- 2. HOMES TABLE
CREATE TABLE public.homes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_id UUID REFERENCES public.trusts(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type public.home_type NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'India',
  pincode TEXT NOT NULL,
  capacity_children INTEGER DEFAULT 0,
  capacity_old_age INTEGER DEFAULT 0,
  primary_warden_id UUID REFERENCES public.profiles(id),
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.homes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage homes" ON public.homes FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can manage homes in their trust" ON public.homes FOR ALL USING (
  trust_id IN (SELECT trust_id FROM public.profiles WHERE id = auth.uid()) AND public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Wardens can view their home" ON public.homes FOR SELECT USING (
  id IN (SELECT home_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Public can view homes" ON public.homes FOR SELECT USING (true);

-- 3. RESIDENTS TABLE
CREATE TABLE public.residents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID REFERENCES public.homes(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  category public.resident_category NOT NULL,
  special_needs TEXT,
  photo_url TEXT,
  status public.resident_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage residents" ON public.residents FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can manage residents in their trust" ON public.residents FOR ALL USING (
  home_id IN (SELECT id FROM public.homes WHERE trust_id IN (SELECT trust_id FROM public.profiles WHERE id = auth.uid()))
  AND public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Wardens can manage residents in their home" ON public.residents FOR ALL USING (
  home_id IN (SELECT home_id FROM public.profiles WHERE id = auth.uid()) AND public.has_role(auth.uid(), 'warden')
);
CREATE POLICY "Public can view residents" ON public.residents FOR SELECT USING (true);

-- 4. CATEGORIES TABLE
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage categories" ON public.categories FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Public can view categories" ON public.categories FOR SELECT USING (true);

-- 5. SUBCATEGORIES TABLE
CREATE TABLE public.subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage subcategories" ON public.subcategories FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Public can view subcategories" ON public.subcategories FOR SELECT USING (true);

-- 6. NEEDS TABLE
CREATE TABLE public.needs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID REFERENCES public.homes(id) ON DELETE CASCADE NOT NULL,
  trust_id UUID REFERENCES public.trusts(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.categories(id) NOT NULL,
  subcategory_id UUID REFERENCES public.subcategories(id),
  date DATE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit TEXT NOT NULL,
  help_mode public.help_mode NOT NULL DEFAULT 'ONE_TIME',
  recurring_frequency public.recurring_frequency DEFAULT 'none',
  recurring_end_date DATE,
  description TEXT,
  max_sponsors_allowed INTEGER DEFAULT 1,
  current_sponsors_count INTEGER DEFAULT 0,
  status public.need_status DEFAULT 'OPEN',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.needs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage needs" ON public.needs FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can manage needs in their trust" ON public.needs FOR ALL USING (
  trust_id IN (SELECT trust_id FROM public.profiles WHERE id = auth.uid()) AND public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Wardens can manage needs in their home" ON public.needs FOR ALL USING (
  home_id IN (SELECT home_id FROM public.profiles WHERE id = auth.uid()) AND public.has_role(auth.uid(), 'warden')
);
CREATE POLICY "Public can view open needs" ON public.needs FOR SELECT USING (true);

-- 7. DONATIONS TABLE
CREATE TABLE public.donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID REFERENCES public.profiles(id) NOT NULL,
  need_id UUID REFERENCES public.needs(id),
  trust_id UUID REFERENCES public.trusts(id) NOT NULL,
  home_id UUID REFERENCES public.homes(id) NOT NULL,
  sponsorship_type public.donation_type NOT NULL DEFAULT 'ONE_TIME',
  amount_pledged DECIMAL(12,2) NOT NULL,
  payment_mode public.payment_mode NOT NULL DEFAULT 'online',
  in_kind_details TEXT,
  start_date DATE NOT NULL,
  next_due_date DATE,
  last_paid_date DATE,
  status public.donation_status DEFAULT 'PLEDGED',
  occasion_type public.occasion_type,
  occasion_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage donations" ON public.donations FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can view donations in their trust" ON public.donations FOR SELECT USING (
  trust_id IN (SELECT trust_id FROM public.profiles WHERE id = auth.uid()) AND public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Wardens can view donations in their home" ON public.donations FOR SELECT USING (
  home_id IN (SELECT home_id FROM public.profiles WHERE id = auth.uid()) AND public.has_role(auth.uid(), 'warden')
);
CREATE POLICY "Donors can manage their own donations" ON public.donations FOR ALL USING (donor_id = auth.uid());

-- 8. DONATION_PAYMENTS TABLE
CREATE TABLE public.donation_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id UUID REFERENCES public.donations(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.donation_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage payments" ON public.donation_payments FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can view payments in their trust" ON public.donation_payments FOR SELECT USING (
  donation_id IN (SELECT id FROM public.donations WHERE trust_id IN (SELECT trust_id FROM public.profiles WHERE id = auth.uid()))
  AND public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Donors can view their payments" ON public.donation_payments FOR SELECT USING (
  donation_id IN (SELECT id FROM public.donations WHERE donor_id = auth.uid())
);

-- 9. TASKS TABLE
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_by UUID REFERENCES public.profiles(id) NOT NULL,
  assigned_to UUID REFERENCES public.profiles(id) NOT NULL,
  trust_id UUID REFERENCES public.trusts(id),
  home_id UUID REFERENCES public.homes(id),
  related_need_id UUID REFERENCES public.needs(id),
  related_donor_id UUID REFERENCES public.profiles(id),
  priority public.task_priority DEFAULT 'medium',
  status public.task_status DEFAULT 'OPEN',
  due_date DATE NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all tasks" ON public.tasks FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can manage tasks in their trust" ON public.tasks FOR ALL USING (
  trust_id IN (SELECT trust_id FROM public.profiles WHERE id = auth.uid()) AND public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Users can view and update assigned tasks" ON public.tasks FOR ALL USING (assigned_to = auth.uid());

-- 10. NOTIFICATIONS TABLE
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type public.notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notifications" ON public.notifications FOR ALL USING (user_id = auth.uid());

-- 11. KIND_DONATIONS TABLE
CREATE TABLE public.kind_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID REFERENCES public.profiles(id),
  donor_name TEXT,
  trust_id UUID REFERENCES public.trusts(id) NOT NULL,
  home_id UUID REFERENCES public.homes(id) NOT NULL,
  item_type TEXT NOT NULL,
  item_description TEXT,
  quantity INTEGER DEFAULT 1,
  estimated_value DECIMAL(12,2),
  received_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.kind_donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage kind donations" ON public.kind_donations FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can manage kind donations in their trust" ON public.kind_donations FOR ALL USING (
  trust_id IN (SELECT trust_id FROM public.profiles WHERE id = auth.uid()) AND public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Wardens can manage kind donations in their home" ON public.kind_donations FOR ALL USING (
  home_id IN (SELECT home_id FROM public.profiles WHERE id = auth.uid()) AND public.has_role(auth.uid(), 'warden')
);

-- 12. CORPUS_FUND_CONTRIBUTIONS TABLE
CREATE TABLE public.corpus_fund_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID REFERENCES public.profiles(id),
  donor_name TEXT,
  trust_id UUID REFERENCES public.trusts(id) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  contribution_date DATE NOT NULL,
  purpose TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.corpus_fund_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage corpus funds" ON public.corpus_fund_contributions FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can view corpus funds in their trust" ON public.corpus_fund_contributions FOR SELECT USING (
  trust_id IN (SELECT trust_id FROM public.profiles WHERE id = auth.uid()) AND public.has_role(auth.uid(), 'admin')
);

-- Add updated_at triggers to all tables
CREATE TRIGGER update_trusts_updated_at BEFORE UPDATE ON public.trusts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_homes_updated_at BEFORE UPDATE ON public.homes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_residents_updated_at BEFORE UPDATE ON public.residents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_needs_updated_at BEFORE UPDATE ON public.needs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_donations_updated_at BEFORE UPDATE ON public.donations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories
INSERT INTO public.categories (key, label, description, icon) VALUES
('food', 'Food & Nutrition', 'Daily meals, special dietary needs, groceries', 'utensils'),
('education', 'Education', 'School fees, books, supplies, tutoring', 'graduation-cap'),
('medical', 'Medical & Health', 'Healthcare, medicines, medical equipment', 'heart-pulse'),
('clothing', 'Clothing', 'Clothes, footwear, uniforms', 'shirt'),
('infrastructure', 'Infrastructure', 'Building repairs, furniture, equipment', 'building'),
('utilities', 'Utilities', 'Electricity, water, internet bills', 'zap'),
('recreation', 'Recreation', 'Sports, entertainment, celebrations', 'gamepad-2'),
('other', 'Other', 'Miscellaneous needs', 'more-horizontal');
