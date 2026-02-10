-- Update handle_new_user function to generate unique usernames
-- Format: {name}-{6-char-uuid} e.g., francorizzo-a1b2c3

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  uuid_suffix TEXT;
BEGIN
  -- Extract base username from email (remove dots, lowercase)
  base_username := LOWER(REPLACE(SPLIT_PART(NEW.email, '@', 1), '.', ''));

  -- Get first 6 characters of UUID (lowercase, no hyphens)
  uuid_suffix := LOWER(REPLACE(LEFT(NEW.id::TEXT, 8), '-', ''));

  -- Combine: username-abc123
  final_username := base_username || '-' || LEFT(uuid_suffix, 6);

  INSERT INTO public.profiles (id, email, username, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    final_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Existing users keep their current usernames.
-- This only affects new signups going forward.
