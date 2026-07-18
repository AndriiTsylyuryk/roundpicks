-- Add opt-in flag and email for "keep me posted" / coming-soon email list
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS keep_me_posted boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS keep_posted_email text;
