alter table public.site_notifications
  add column if not exists cta_label text,
  add column if not exists cta_url   text;
