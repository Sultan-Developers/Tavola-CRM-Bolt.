-- ============================================================
-- Tavola CRM — Full Schema Restoration (on top of MVP)
-- Extends existing 5 tables; creates 4 new tables.
-- ============================================================

-- ───────────────────────────────────────────────
-- 1. EXTEND EXISTING TABLES
-- ───────────────────────────────────────────────

-- profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- businesses
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- subscriptions
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'monthly';
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS starts_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS ends_at timestamptz;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
-- Migrate trial_ends_at → ends_at (MVP → full schema)
UPDATE public.subscriptions SET ends_at = trial_ends_at WHERE trial_ends_at IS NOT NULL AND ends_at IS NULL;
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS trial_ends_at;

-- customers
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS consent_status text NOT NULL DEFAULT 'unknown';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- campaigns
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'custom';
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS message_template text;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS sent_at timestamptz;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS recipient_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
-- Migrate message → message_template
UPDATE public.campaigns SET message_template = message WHERE message_template IS NULL;
ALTER TABLE public.campaigns DROP COLUMN IF EXISTS message;

-- ───────────────────────────────────────────────
-- 2. CREATE NEW TABLES
-- ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.customer_tags (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name         text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id, name)
);

CREATE TABLE IF NOT EXISTS public.customer_tag_relations (
  customer_id  uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  tag_id       uuid NOT NULL REFERENCES public.customer_tags(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, tag_id)
);

CREATE TABLE IF NOT EXISTS public.payments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  subscription_id  uuid REFERENCES public.subscriptions(id),
  plan             text NOT NULL DEFAULT 'monthly',
  amount           numeric(10,2) NOT NULL,
  currency         text NOT NULL DEFAULT 'INR',
  screenshot_url   text,
  status           text NOT NULL DEFAULT 'pending',
  upi_ref          text,
  notes            text,
  reviewed_by      uuid REFERENCES public.profiles(id),
  reviewed_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  business_id  uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  action       text NOT NULL,
  entity_type  text NOT NULL,
  entity_id    uuid,
  metadata     jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ───────────────────────────────────────────────
-- 3. INDEXES
-- ───────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS businesses_owner_id_unique ON public.businesses(owner_id);
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_business_id_unique ON public.subscriptions(business_id);
CREATE INDEX IF NOT EXISTS customers_business_id_idx ON public.customers(business_id);
CREATE INDEX IF NOT EXISTS customers_deleted_at_idx ON public.customers(deleted_at);
CREATE INDEX IF NOT EXISTS campaigns_business_id_idx ON public.campaigns(business_id);
CREATE INDEX IF NOT EXISTS payments_business_id_idx ON public.payments(business_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON public.payments(status);
CREATE INDEX IF NOT EXISTS audit_logs_actor_id_idx ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS audit_logs_business_id_idx ON public.audit_logs(business_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs(created_at DESC);

-- ───────────────────────────────────────────────
-- 4. HELPER FUNCTION
-- ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

-- ───────────────────────────────────────────────
-- 5. RLS POLICIES
-- ───────────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT
  TO authenticated USING (auth.uid() = id OR public.check_is_admin());
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id OR public.check_is_admin())
  WITH CHECK (auth.uid() = id OR public.check_is_admin());
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE
  TO authenticated USING (auth.uid() = id OR public.check_is_admin());

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "businesses_select" ON public.businesses;
CREATE POLICY "businesses_select" ON public.businesses FOR SELECT
  TO authenticated USING (owner_id = auth.uid() OR public.check_is_admin());
DROP POLICY IF EXISTS "businesses_insert" ON public.businesses;
CREATE POLICY "businesses_insert" ON public.businesses FOR INSERT
  TO authenticated WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS "businesses_update" ON public.businesses;
CREATE POLICY "businesses_update" ON public.businesses FOR UPDATE
  TO authenticated USING (owner_id = auth.uid() OR public.check_is_admin())
  WITH CHECK (owner_id = auth.uid() OR public.check_is_admin());
DROP POLICY IF EXISTS "businesses_delete" ON public.businesses;
CREATE POLICY "businesses_delete" ON public.businesses FOR DELETE
  TO authenticated USING (owner_id = auth.uid() OR public.check_is_admin());

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscriptions_select" ON public.subscriptions;
CREATE POLICY "subscriptions_select" ON public.subscriptions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
    OR public.check_is_admin()
  );
DROP POLICY IF EXISTS "subscriptions_insert" ON public.subscriptions;
CREATE POLICY "subscriptions_insert" ON public.subscriptions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
    OR public.check_is_admin()
  );
DROP POLICY IF EXISTS "subscriptions_update" ON public.subscriptions;
CREATE POLICY "subscriptions_update" ON public.subscriptions FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
    OR public.check_is_admin()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
    OR public.check_is_admin()
  );
DROP POLICY IF EXISTS "subscriptions_delete" ON public.subscriptions;
CREATE POLICY "subscriptions_delete" ON public.subscriptions FOR DELETE
  TO authenticated USING (public.check_is_admin());

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customers_select" ON public.customers;
CREATE POLICY "customers_select" ON public.customers FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
    OR public.check_is_admin()
  );
DROP POLICY IF EXISTS "customers_insert" ON public.customers;
CREATE POLICY "customers_insert" ON public.customers FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "customers_update" ON public.customers;
CREATE POLICY "customers_update" ON public.customers FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "customers_delete" ON public.customers;
CREATE POLICY "customers_delete" ON public.customers FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
  );

ALTER TABLE public.customer_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customer_tags_select" ON public.customer_tags;
CREATE POLICY "customer_tags_select" ON public.customer_tags FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
    OR public.check_is_admin()
  );
DROP POLICY IF EXISTS "customer_tags_insert" ON public.customer_tags;
CREATE POLICY "customer_tags_insert" ON public.customer_tags FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "customer_tags_update" ON public.customer_tags;
CREATE POLICY "customer_tags_update" ON public.customer_tags FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "customer_tags_delete" ON public.customer_tags;
CREATE POLICY "customer_tags_delete" ON public.customer_tags FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
  );

ALTER TABLE public.customer_tag_relations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ctr_select" ON public.customer_tag_relations;
CREATE POLICY "ctr_select" ON public.customer_tag_relations FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      JOIN public.businesses b ON b.id = c.business_id
      WHERE c.id = customer_id AND b.owner_id = auth.uid()
    ) OR public.check_is_admin()
  );
DROP POLICY IF EXISTS "ctr_insert" ON public.customer_tag_relations;
CREATE POLICY "ctr_insert" ON public.customer_tag_relations FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customers c
      JOIN public.businesses b ON b.id = c.business_id
      WHERE c.id = customer_id AND b.owner_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "ctr_delete" ON public.customer_tag_relations;
CREATE POLICY "ctr_delete" ON public.customer_tag_relations FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      JOIN public.businesses b ON b.id = c.business_id
      WHERE c.id = customer_id AND b.owner_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "ctr_update" ON public.customer_tag_relations;
CREATE POLICY "ctr_update" ON public.customer_tag_relations FOR UPDATE
  TO authenticated USING (false) WITH CHECK (false);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "campaigns_select" ON public.campaigns;
CREATE POLICY "campaigns_select" ON public.campaigns FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
    OR public.check_is_admin()
  );
DROP POLICY IF EXISTS "campaigns_insert" ON public.campaigns;
CREATE POLICY "campaigns_insert" ON public.campaigns FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "campaigns_update" ON public.campaigns;
CREATE POLICY "campaigns_update" ON public.campaigns FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "campaigns_delete" ON public.campaigns;
CREATE POLICY "campaigns_delete" ON public.campaigns FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
  );

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payments_select" ON public.payments;
CREATE POLICY "payments_select" ON public.payments FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
    OR public.check_is_admin()
  );
DROP POLICY IF EXISTS "payments_insert" ON public.payments;
CREATE POLICY "payments_insert" ON public.payments FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "payments_update" ON public.payments;
CREATE POLICY "payments_update" ON public.payments FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
    OR public.check_is_admin()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
    OR public.check_is_admin()
  );
DROP POLICY IF EXISTS "payments_delete" ON public.payments;
CREATE POLICY "payments_delete" ON public.payments FOR DELETE
  TO authenticated USING (public.check_is_admin());

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
CREATE POLICY "audit_logs_select" ON public.audit_logs FOR SELECT
  TO authenticated USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
    OR public.check_is_admin()
  );
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_insert" ON public.audit_logs FOR INSERT
  TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "audit_logs_update" ON public.audit_logs;
CREATE POLICY "audit_logs_update" ON public.audit_logs FOR UPDATE
  TO authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "audit_logs_delete" ON public.audit_logs;
CREATE POLICY "audit_logs_delete" ON public.audit_logs FOR DELETE
  TO authenticated USING (false);

-- ───────────────────────────────────────────────
-- 6. STORAGE BUCKET
-- ───────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-screenshots', 'payment-screenshots', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "payment_screenshots_insert" ON storage.objects;
CREATE POLICY "payment_screenshots_insert" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'payment-screenshots');
DROP POLICY IF EXISTS "payment_screenshots_select" ON storage.objects;
CREATE POLICY "payment_screenshots_select" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'payment-screenshots');

-- ───────────────────────────────────────────────
-- 7. TRIGGERS
-- ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'business_owner')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_businesses_updated_at ON public.businesses;
CREATE TRIGGER set_businesses_updated_at
  BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_customers_updated_at ON public.customers;
CREATE TRIGGER set_customers_updated_at
  BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_campaigns_updated_at ON public.campaigns;
CREATE TRIGGER set_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_payments_updated_at ON public.payments;
CREATE TRIGGER set_payments_updated_at
  BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_customer_tags_updated_at ON public.customer_tags;
CREATE TRIGGER set_customer_tags_updated_at
  BEFORE UPDATE ON public.customer_tags FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
