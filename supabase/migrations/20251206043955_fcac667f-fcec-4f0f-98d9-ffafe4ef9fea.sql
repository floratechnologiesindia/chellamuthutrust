-- Add monetary and product tracking columns to needs table
ALTER TABLE needs ADD COLUMN IF NOT EXISTS required_amount NUMERIC DEFAULT 0;
ALTER TABLE needs ADD COLUMN IF NOT EXISTS collected_amount NUMERIC DEFAULT 0;
ALTER TABLE needs ADD COLUMN IF NOT EXISTS required_product_qty INTEGER DEFAULT 0;
ALTER TABLE needs ADD COLUMN IF NOT EXISTS fulfilled_product_qty INTEGER DEFAULT 0;
ALTER TABLE needs ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE needs ADD COLUMN IF NOT EXISTS product_unit TEXT DEFAULT 'pieces';
ALTER TABLE needs ADD COLUMN IF NOT EXISTS donation_mode TEXT DEFAULT 'MONEY_ONLY' CHECK (donation_mode IN ('MONEY_ONLY', 'PRODUCT_ONLY', 'BOTH'));
ALTER TABLE needs ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id);
ALTER TABLE needs ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Add need_id and delivery tracking to kind_donations table
ALTER TABLE kind_donations ADD COLUMN IF NOT EXISTS need_id UUID REFERENCES needs(id);
ALTER TABLE kind_donations ADD COLUMN IF NOT EXISTS delivery_mode TEXT DEFAULT 'SELF_DELIVERY' CHECK (delivery_mode IN ('SELF_DELIVERY', 'COURIER', 'TRUST_PICKUP'));
ALTER TABLE kind_donations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PLEDGED' CHECK (status IN ('PLEDGED', 'DELIVERED', 'RECEIVED', 'VERIFIED'));

-- Create function to update need money collected amount
CREATE OR REPLACE FUNCTION public.update_need_money_collected()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.need_id IS NOT NULL THEN
    UPDATE needs 
    SET collected_amount = COALESCE(collected_amount, 0) + NEW.amount_pledged,
        status = CASE 
          WHEN COALESCE(collected_amount, 0) + NEW.amount_pledged >= COALESCE(required_amount, 0) 
               AND COALESCE(required_amount, 0) > 0 THEN 'FULLY_SPONSORED'::need_status
          WHEN COALESCE(collected_amount, 0) + NEW.amount_pledged > 0 THEN 'PARTIAL'::need_status
          ELSE status
        END,
        current_sponsors_count = COALESCE(current_sponsors_count, 0) + 1
    WHERE id = NEW.need_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create function to update need product fulfilled quantity
CREATE OR REPLACE FUNCTION public.update_need_product_fulfilled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.need_id IS NOT NULL THEN
    UPDATE needs 
    SET fulfilled_product_qty = COALESCE(fulfilled_product_qty, 0) + COALESCE(NEW.quantity, 0),
        status = CASE 
          WHEN COALESCE(fulfilled_product_qty, 0) + COALESCE(NEW.quantity, 0) >= COALESCE(required_product_qty, 0) 
               AND COALESCE(required_product_qty, 0) > 0 THEN 'FULLY_SPONSORED'::need_status
          WHEN COALESCE(fulfilled_product_qty, 0) + COALESCE(NEW.quantity, 0) > 0 THEN 'PARTIAL'::need_status
          ELSE status
        END,
        current_sponsors_count = COALESCE(current_sponsors_count, 0) + 1
    WHERE id = NEW.need_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create triggers for auto-updating needs
DROP TRIGGER IF EXISTS on_donation_insert_update_need ON donations;
CREATE TRIGGER on_donation_insert_update_need
  AFTER INSERT ON donations
  FOR EACH ROW
  EXECUTE FUNCTION update_need_money_collected();

DROP TRIGGER IF EXISTS on_kind_donation_insert_update_need ON kind_donations;
CREATE TRIGGER on_kind_donation_insert_update_need
  AFTER INSERT ON kind_donations
  FOR EACH ROW
  EXECUTE FUNCTION update_need_product_fulfilled();