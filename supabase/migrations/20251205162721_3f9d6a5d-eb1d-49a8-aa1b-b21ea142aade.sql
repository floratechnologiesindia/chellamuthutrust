-- Function to create notification for task assignment
CREATE OR REPLACE FUNCTION public.notify_task_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only notify if task is being assigned (new record or assignee changed)
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
      NEW.assigned_to,
      'task_assigned',
      'New Task Assigned',
      'You have been assigned a new task: ' || NEW.title
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for task assignment
DROP TRIGGER IF EXISTS on_task_assigned ON public.tasks;
CREATE TRIGGER on_task_assigned
  AFTER INSERT OR UPDATE OF assigned_to ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_assigned();

-- Function to create notification when task is due today
CREATE OR REPLACE FUNCTION public.notify_task_due()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notify if due date is set to today
  IF NEW.due_date = CURRENT_DATE AND NEW.status NOT IN ('COMPLETED', 'CANCELLED') THEN
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
      NEW.assigned_to,
      'task_due',
      'Task Due Today',
      'Your task "' || NEW.title || '" is due today'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Function to notify admins and wardens when a new need is posted
CREATE OR REPLACE FUNCTION public.notify_new_need_posted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  donor_record RECORD;
  category_label TEXT;
  home_name TEXT;
BEGIN
  -- Get category and home names for the notification message
  SELECT label INTO category_label FROM public.categories WHERE id = NEW.category_id;
  SELECT name INTO home_name FROM public.homes WHERE id = NEW.home_id;

  -- Notify all donors about new needs (they can filter on their end)
  FOR donor_record IN 
    SELECT DISTINCT p.id 
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE ur.role = 'donor'
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
      donor_record.id,
      'new_need_posted',
      'New Sponsorship Opportunity',
      'A new ' || COALESCE(category_label, 'need') || ' need has been posted at ' || COALESCE(home_name, 'a care home')
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Trigger for new need posted
DROP TRIGGER IF EXISTS on_need_posted ON public.needs;
CREATE TRIGGER on_need_posted
  AFTER INSERT ON public.needs
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_need_posted();

-- Function to check and notify for recurring payment due (to be called by edge function)
CREATE OR REPLACE FUNCTION public.check_recurring_payment_due()
RETURNS TABLE(
  donation_id UUID,
  donor_id UUID,
  home_name TEXT,
  amount NUMERIC,
  next_due_date DATE,
  days_until_due INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id AS donation_id,
    d.donor_id,
    h.name AS home_name,
    d.amount_pledged AS amount,
    d.next_due_date,
    (d.next_due_date - CURRENT_DATE)::INTEGER AS days_until_due
  FROM public.donations d
  JOIN public.homes h ON h.id = d.home_id
  WHERE d.sponsorship_type = 'RECURRING'
    AND d.status = 'ACTIVE'
    AND d.next_due_date IS NOT NULL
    AND d.next_due_date <= CURRENT_DATE + INTERVAL '3 days'
    AND d.next_due_date >= CURRENT_DATE;
END;
$$;

-- Function to check for overdue recurring payments
CREATE OR REPLACE FUNCTION public.check_overdue_payments()
RETURNS TABLE(
  donation_id UUID,
  donor_id UUID,
  home_name TEXT,
  amount NUMERIC,
  next_due_date DATE,
  days_overdue INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id AS donation_id,
    d.donor_id,
    h.name AS home_name,
    d.amount_pledged AS amount,
    d.next_due_date,
    (CURRENT_DATE - d.next_due_date)::INTEGER AS days_overdue
  FROM public.donations d
  JOIN public.homes h ON h.id = d.home_id
  WHERE d.sponsorship_type = 'RECURRING'
    AND d.status = 'ACTIVE'
    AND d.next_due_date IS NOT NULL
    AND d.next_due_date < CURRENT_DATE;
END;
$$;