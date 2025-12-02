-- Add policy to allow public access to jobs when viewing published signal pages
-- This is needed because the public page joins signal_pages with jobs

CREATE POLICY "Jobs are viewable for published pages"
ON public.jobs
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.signal_pages sp
    WHERE sp.job_id = jobs.id
    AND sp.is_published = true
  )
);
