-- ============================================================
-- SMM Panel - Initial Database Schema
-- ============================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_crypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'customer', 'reseller');
CREATE TYPE order_status AS ENUM ('pending', 'processing', 'completed', 'cancelled', 'failed', 'refunded');
CREATE TYPE transaction_type AS ENUM ('deposit', 'deduction', 'refund', 'adjustment');
CREATE TYPE payment_status AS ENUM ('pending', 'verified', 'rejected', 'refunded');
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE platform_type AS ENUM ('facebook', 'instagram', 'tiktok', 'linkedin', 'youtube', 'twitter');
CREATE TYPE supplier_status AS ENUM ('active', 'inactive', 'suspended');

-- ============================================================
-- USERS & PROFILES
-- ============================================================

-- Profiles extend Supabase auth.users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  username TEXT UNIQUE,
  phone TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'customer',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_email_verified BOOLEAN NOT NULL DEFAULT false,
  referral_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  referred_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_username ON public.profiles(username);

-- ============================================================
-- WALLETS
-- ============================================================

CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'PHP',
  total_deposited NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_spent NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_refunded NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT balance_non_negative CHECK (balance >= 0)
);

CREATE INDEX idx_wallets_user_id ON public.wallets(user_id);

CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  type transaction_type NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  balance_before NUMERIC(12, 2) NOT NULL,
  balance_after NUMERIC(12, 2) NOT NULL,
  reference_id UUID, -- order_id or payment_record_id
  reference_type TEXT, -- 'order' | 'payment' | 'manual'
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT amount_non_zero CHECK (amount != 0)
);

CREATE INDEX idx_wallet_transactions_wallet_id ON public.wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_created_at ON public.wallet_transactions(created_at DESC);

-- ============================================================
-- PLATFORMS & SERVICES
-- ============================================================

CREATE TABLE public.platforms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug platform_type NOT NULL UNIQUE,
  icon_url TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform_id UUID NOT NULL REFERENCES public.platforms(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  base_price NUMERIC(10, 4) NOT NULL,
  min_quantity INTEGER NOT NULL DEFAULT 100,
  max_quantity INTEGER NOT NULL DEFAULT 100000,
  unit TEXT NOT NULL DEFAULT 'followers',
  average_speed TEXT, -- e.g. "1000/day"
  estimated_days INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  requires_url BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_services_platform_id ON public.services(platform_id);
CREATE INDEX idx_services_is_active ON public.services(is_active);

-- ============================================================
-- SUPPLIERS
-- ============================================================

CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  api_endpoint TEXT,
  api_key_encrypted TEXT, -- stored encrypted, never in frontend
  status supplier_status NOT NULL DEFAULT 'active',
  balance NUMERIC(12, 2),
  currency TEXT DEFAULT 'USD',
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.supplier_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  supplier_service_id TEXT, -- the supplier's own ID for this service
  supplier_price NUMERIC(10, 4),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(supplier_id, service_id)
);

-- ============================================================
-- ORDERS
-- ============================================================

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL UNIQUE DEFAULT 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 99999)::TEXT, 5, '0'),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  service_id UUID NOT NULL REFERENCES public.services(id),
  platform_id UUID NOT NULL REFERENCES public.platforms(id),
  supplier_id UUID REFERENCES public.suppliers(id),
  supplier_order_id TEXT, -- supplier's tracking ID
  target_url TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10, 4) NOT NULL,
  total_price NUMERIC(12, 2) NOT NULL,
  status order_status NOT NULL DEFAULT 'pending',
  start_count INTEGER, -- count before service
  current_count INTEGER, -- for tracking progress
  remains INTEGER, -- remaining to complete
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_service_id ON public.orders(service_id);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX idx_orders_order_number ON public.orders(order_number);

-- ============================================================
-- PAYMENT RECORDS
-- ============================================================

CREATE TABLE public.payment_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id),
  reference_number TEXT NOT NULL UNIQUE,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PHP',
  payment_method TEXT NOT NULL, -- 'gcash', 'maya', 'bank_transfer', etc.
  sender_name TEXT,
  sender_account TEXT,
  proof_url TEXT,
  status payment_status NOT NULL DEFAULT 'pending',
  verified_by UUID REFERENCES public.profiles(id),
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT amount_positive CHECK (amount > 0)
);

CREATE INDEX idx_payment_records_user_id ON public.payment_records(user_id);
CREATE INDEX idx_payment_records_status ON public.payment_records(status);
CREATE INDEX idx_payment_records_reference_number ON public.payment_records(reference_number);

-- ============================================================
-- RESELLER PRICING
-- ============================================================

CREATE TABLE public.reseller_prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reseller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  wholesale_price NUMERIC(10, 4) NOT NULL, -- price reseller pays
  retail_price NUMERIC(10, 4) NOT NULL, -- price reseller charges
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(reseller_id, service_id)
);

CREATE INDEX idx_reseller_prices_reseller_id ON public.reseller_prices(reseller_id);
CREATE INDEX idx_reseller_prices_service_id ON public.reseller_prices(service_id);

-- ============================================================
-- SUPPORT TICKETS
-- ============================================================

CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number TEXT NOT NULL UNIQUE DEFAULT 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 9999)::TEXT, 4, '0'),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  order_id UUID REFERENCES public.orders(id),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status ticket_status NOT NULL DEFAULT 'open',
  priority ticket_priority NOT NULL DEFAULT 'medium',
  assigned_to UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);

CREATE TABLE public.ticket_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  message TEXT NOT NULL,
  is_staff BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ticket_replies_ticket_id ON public.ticket_replies(ticket_id);

-- ============================================================
-- AUDIT LOGS
-- ============================================================

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES public.profiles(id),
  actor_email TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor_id ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_logs_resource_type ON public.audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_records_updated_at BEFORE UPDATE ON public.payment_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reseller_prices_updated_at BEFORE UPDATE ON public.reseller_prices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create wallet when profile is created
CREATE OR REPLACE FUNCTION create_wallet_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.wallets (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION create_wallet_for_new_user();

-- Handle new Supabase auth user → create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, is_email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email_confirmed_at IS NOT NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Wallet credit (atomic, with transaction logging)
CREATE OR REPLACE FUNCTION credit_wallet(
  p_user_id UUID,
  p_amount NUMERIC,
  p_type transaction_type,
  p_description TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL
)
RETURNS public.wallet_transactions AS $$
DECLARE
  v_wallet public.wallets;
  v_transaction public.wallet_transactions;
BEGIN
  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
  END IF;

  UPDATE public.wallets
  SET
    balance = balance + p_amount,
    total_deposited = CASE WHEN p_type = 'deposit' THEN total_deposited + p_amount ELSE total_deposited END,
    total_refunded = CASE WHEN p_type = 'refund' THEN total_refunded + p_amount ELSE total_refunded END
  WHERE user_id = p_user_id;

  INSERT INTO public.wallet_transactions (
    wallet_id, user_id, type, amount, balance_before, balance_after,
    description, reference_id, reference_type
  ) VALUES (
    v_wallet.id, p_user_id, p_type, p_amount, v_wallet.balance, v_wallet.balance + p_amount,
    p_description, p_reference_id, p_reference_type
  )
  RETURNING * INTO v_transaction;

  RETURN v_transaction;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Wallet debit (atomic, checks balance)
CREATE OR REPLACE FUNCTION debit_wallet(
  p_user_id UUID,
  p_amount NUMERIC,
  p_description TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL
)
RETURNS public.wallet_transactions AS $$
DECLARE
  v_wallet public.wallets;
  v_transaction public.wallet_transactions;
BEGIN
  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
  END IF;

  IF v_wallet.balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance. Current: %, Required: %', v_wallet.balance, p_amount;
  END IF;

  UPDATE public.wallets
  SET
    balance = balance - p_amount,
    total_spent = total_spent + p_amount
  WHERE user_id = p_user_id;

  INSERT INTO public.wallet_transactions (
    wallet_id, user_id, type, amount, balance_before, balance_after,
    description, reference_id, reference_type
  ) VALUES (
    v_wallet.id, p_user_id, 'deduction', -p_amount, v_wallet.balance, v_wallet.balance - p_amount,
    p_description, p_reference_id, p_reference_type
  )
  RETURNING * INTO v_transaction;

  RETURN v_transaction;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reseller_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_services ENABLE ROW LEVEL SECURITY;

-- Helper function for role check
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles RLS
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid() AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (get_user_role() = 'admin');
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "Service role bypass" ON public.profiles FOR ALL USING (auth.role() = 'service_role');

-- Wallets RLS
CREATE POLICY "Users can view own wallet" ON public.wallets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can view all wallets" ON public.wallets FOR SELECT USING (get_user_role() = 'admin');
CREATE POLICY "Service role bypass" ON public.wallets FOR ALL USING (auth.role() = 'service_role');

-- Wallet transactions RLS
CREATE POLICY "Users can view own transactions" ON public.wallet_transactions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can view all transactions" ON public.wallet_transactions FOR SELECT USING (get_user_role() = 'admin');
CREATE POLICY "Service role bypass" ON public.wallet_transactions FOR ALL USING (auth.role() = 'service_role');

-- Orders RLS
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own orders" ON public.orders FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT USING (get_user_role() = 'admin');
CREATE POLICY "Admins can update all orders" ON public.orders FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "Service role bypass" ON public.orders FOR ALL USING (auth.role() = 'service_role');

-- Payment records RLS
CREATE POLICY "Users can view own payments" ON public.payment_records FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own payments" ON public.payment_records FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can view all payments" ON public.payment_records FOR SELECT USING (get_user_role() = 'admin');
CREATE POLICY "Admins can update all payments" ON public.payment_records FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "Service role bypass" ON public.payment_records FOR ALL USING (auth.role() = 'service_role');

-- Support tickets RLS
CREATE POLICY "Users can view own tickets" ON public.support_tickets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own tickets" ON public.support_tickets FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can view all tickets" ON public.support_tickets FOR SELECT USING (get_user_role() = 'admin');
CREATE POLICY "Admins can update all tickets" ON public.support_tickets FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "Service role bypass" ON public.support_tickets FOR ALL USING (auth.role() = 'service_role');

-- Ticket replies RLS
CREATE POLICY "Users can view ticket replies" ON public.ticket_replies FOR SELECT USING (EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid()));
CREATE POLICY "Users can insert ticket replies" ON public.ticket_replies FOR INSERT WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid()));
CREATE POLICY "Admins can view all replies" ON public.ticket_replies FOR SELECT USING (get_user_role() = 'admin');
CREATE POLICY "Admins can insert replies" ON public.ticket_replies FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "Service role bypass" ON public.ticket_replies FOR ALL USING (auth.role() = 'service_role');

-- Platforms (public read)
CREATE POLICY "Anyone can view active platforms" ON public.platforms FOR SELECT USING (is_active = true OR get_user_role() = 'admin');
CREATE POLICY "Admins can manage platforms" ON public.platforms FOR ALL USING (get_user_role() = 'admin');

-- Services (public read for active)
CREATE POLICY "Anyone can view active services" ON public.services FOR SELECT USING (is_active = true OR get_user_role() = 'admin');
CREATE POLICY "Admins can manage services" ON public.services FOR ALL USING (get_user_role() = 'admin');

-- Suppliers (admin only)
CREATE POLICY "Admins can manage suppliers" ON public.suppliers FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Service role bypass" ON public.suppliers FOR ALL USING (auth.role() = 'service_role');

-- Supplier services (admin only)
CREATE POLICY "Admins can manage supplier services" ON public.supplier_services FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Service role bypass" ON public.supplier_services FOR ALL USING (auth.role() = 'service_role');

-- Reseller prices
CREATE POLICY "Resellers can view own prices" ON public.reseller_prices FOR SELECT USING (reseller_id = auth.uid());
CREATE POLICY "Admins can manage all reseller prices" ON public.reseller_prices FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Service role bypass" ON public.reseller_prices FOR ALL USING (auth.role() = 'service_role');

-- Audit logs (admin read-only)
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT USING (get_user_role() = 'admin');
CREATE POLICY "Service role bypass" ON public.audit_logs FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- SEED DATA
-- ============================================================

-- Insert default platforms
INSERT INTO public.platforms (name, slug, description, display_order) VALUES
  ('Facebook', 'facebook', 'Grow your Facebook presence', 1),
  ('Instagram', 'instagram', 'Boost your Instagram engagement', 2),
  ('TikTok', 'tiktok', 'Accelerate your TikTok growth', 3),
  ('LinkedIn', 'linkedin', 'Professional network growth', 4),
  ('YouTube', 'youtube', 'Grow your YouTube channel', 5),
  ('X (Twitter)', 'twitter', 'Expand your Twitter reach', 6);

-- Insert sample services (platform-compliant only)
WITH platform_ids AS (
  SELECT id, slug FROM public.platforms
)
INSERT INTO public.services (platform_id, name, description, category, base_price, min_quantity, max_quantity, unit, average_speed, estimated_days) VALUES
  -- Facebook
  ((SELECT id FROM platform_ids WHERE slug = 'facebook'), 'Facebook Page Likes', 'Authorized page promotion via Facebook Ads', 'Promotion', 0.0150, 100, 50000, 'likes', '1000/day', 7),
  ((SELECT id FROM platform_ids WHERE slug = 'facebook'), 'Facebook Post Reach', 'Boosted post reach via Facebook Ads', 'Advertising', 0.0120, 1000, 100000, 'reach', '10000/day', 3),
  ((SELECT id FROM platform_ids WHERE slug = 'facebook'), 'Facebook Event Promotion', 'Event promotion via Facebook Ads Manager', 'Advertising', 0.0200, 500, 50000, 'reach', '5000/day', 5),
  -- Instagram
  ((SELECT id FROM platform_ids WHERE slug = 'instagram'), 'Instagram Followers', 'Real follower growth via Meta Ads', 'Growth', 0.0180, 100, 100000, 'followers', '1000/day', 10),
  ((SELECT id FROM platform_ids WHERE slug = 'instagram'), 'Instagram Story Views', 'Story promotion via Meta Ads', 'Engagement', 0.0080, 1000, 500000, 'views', '50000/day', 2),
  ((SELECT id FROM platform_ids WHERE slug = 'instagram'), 'Instagram Reels Promotion', 'Reels promotion via Meta Ads', 'Advertising', 0.0100, 1000, 200000, 'views', '20000/day', 3),
  -- TikTok
  ((SELECT id FROM platform_ids WHERE slug = 'tiktok'), 'TikTok Followers', 'Creator program and authorized promotions', 'Growth', 0.0200, 100, 100000, 'followers', '500/day', 14),
  ((SELECT id FROM platform_ids WHERE slug = 'tiktok'), 'TikTok Video Views', 'TikTok Ads video promotion', 'Advertising', 0.0050, 1000, 1000000, 'views', '100000/day', 2),
  ((SELECT id FROM platform_ids WHERE slug = 'tiktok'), 'TikTok Spark Ads', 'Authorized spark ads promotion', 'Advertising', 0.0300, 500, 50000, 'reach', '10000/day', 5),
  -- LinkedIn
  ((SELECT id FROM platform_ids WHERE slug = 'linkedin'), 'LinkedIn Page Followers', 'LinkedIn Campaign Manager promotion', 'Growth', 0.0500, 50, 10000, 'followers', '100/day', 7),
  ((SELECT id FROM platform_ids WHERE slug = 'linkedin'), 'LinkedIn Post Impressions', 'LinkedIn Ads post promotion', 'Advertising', 0.0300, 500, 100000, 'impressions', '10000/day', 3),
  -- YouTube
  ((SELECT id FROM platform_ids WHERE slug = 'youtube'), 'YouTube Subscribers', 'YouTube Ads promotion for channel growth', 'Growth', 0.0300, 100, 50000, 'subscribers', '500/day', 10),
  ((SELECT id FROM platform_ids WHERE slug = 'youtube'), 'YouTube Video Views', 'YouTube Ads in-stream promotion', 'Advertising', 0.0100, 1000, 500000, 'views', '50000/day', 3),
  ((SELECT id FROM platform_ids WHERE slug = 'youtube'), 'YouTube Shorts Promotion', 'YouTube Ads Shorts promotion', 'Advertising', 0.0080, 1000, 300000, 'views', '100000/day', 2),
  -- Twitter/X
  ((SELECT id FROM platform_ids WHERE slug = 'twitter'), 'X Followers', 'X Ads authorized promotion', 'Growth', 0.0200, 100, 50000, 'followers', '500/day', 10),
  ((SELECT id FROM platform_ids WHERE slug = 'twitter'), 'X Post Impressions', 'X Ads tweet promotion', 'Advertising', 0.0050, 1000, 500000, 'impressions', '50000/day', 2);

-- Insert mock supplier for development
INSERT INTO public.suppliers (name, api_endpoint, status, notes) VALUES
  ('Mock Fulfillment Provider', 'https://mock-api.example.com/v2', 'active', 'Development mock supplier - does not make real API calls');
