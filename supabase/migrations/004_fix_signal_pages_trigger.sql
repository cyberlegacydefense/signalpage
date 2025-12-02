-- Fix the trigger for signal_pages table
-- The table uses 'last_edited_at' but the trigger was trying to update 'updated_at'

-- Create a new function specifically for last_edited_at
CREATE OR REPLACE FUNCTION public.update_last_edited_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_edited_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the old trigger
DROP TRIGGER IF EXISTS update_signal_pages_last_edited_at ON public.signal_pages;

-- Create new trigger with correct function
CREATE TRIGGER update_signal_pages_last_edited_at
  BEFORE UPDATE ON public.signal_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_last_edited_at();
