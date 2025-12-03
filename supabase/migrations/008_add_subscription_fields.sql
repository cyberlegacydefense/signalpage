-- Add subscription and billing fields to profiles
ALTER TABLE public.profiles
ADD COLUMN stripe_customer_id TEXT,
ADD COLUMN subscription_tier TEXT DEFAULT 'free',
ADD COLUMN subscription_status TEXT DEFAULT 'active',
ADD COLUMN subscription_id TEXT,
ADD COLUMN is_free_user BOOLEAN DEFAULT false;

-- Create index for stripe customer lookups
CREATE INDEX idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);

-- Comment explaining the fields
COMMENT ON COLUMN public.profiles.stripe_customer_id IS 'Stripe customer ID';
COMMENT ON COLUMN public.profiles.subscription_tier IS 'free, pro, or premium';
COMMENT ON COLUMN public.profiles.subscription_status IS 'active, canceled, past_due, etc';
COMMENT ON COLUMN public.profiles.subscription_id IS 'Stripe subscription ID';
COMMENT ON COLUMN public.profiles.is_free_user IS 'If true, user has unlimited free access (bypasses Stripe)';
