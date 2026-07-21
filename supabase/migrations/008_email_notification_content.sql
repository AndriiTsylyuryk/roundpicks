-- Add separate email content fields to site_notifications
-- Falls back to title/body when email-specific fields are null
ALTER TABLE public.site_notifications
  ADD COLUMN IF NOT EXISTS email_subject text,
  ADD COLUMN IF NOT EXISTS email_html   text;
