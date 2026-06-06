-- Add star rating to feedback
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS rating smallint CHECK (rating BETWEEN 1 AND 5);
ALTER TABLE public.feedback ALTER COLUMN message DROP NOT NULL;

-- Allow users to read their own feedback (needed to check if already rated)
CREATE POLICY "Users can view own feedback"
  ON public.feedback FOR SELECT USING (auth.uid() = user_id);

-- Track whether user has submitted a rating (once-only prompt)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_rated boolean NOT NULL DEFAULT false;