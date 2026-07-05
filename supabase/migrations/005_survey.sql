-- Track whether user has completed the launch survey (once-only prompt)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_surveyed boolean NOT NULL DEFAULT false;

-- Survey responses table
CREATE TABLE IF NOT EXISTS public.survey_responses (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enjoyed_most        text[]      NOT NULL DEFAULT '{}',
  enjoyed_most_other  text,
  frustrating         text,
  want_events         text[]      NOT NULL DEFAULT '{}',
  want_events_other   text,
  improvement         text,
  chat_opt_in         boolean     NOT NULL DEFAULT false,
  chat_email          text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CHECK (cardinality(enjoyed_most) BETWEEN 1 AND 2),
  CHECK (cardinality(want_events) >= 0)
);

ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

-- Users can insert their own response
CREATE POLICY "Users can insert own survey response"
  ON public.survey_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own response
CREATE POLICY "Users can view own survey response"
  ON public.survey_responses FOR SELECT
  USING (auth.uid() = user_id);

-- Grant table-level access
GRANT ALL ON public.survey_responses TO service_role;
GRANT INSERT, SELECT ON public.survey_responses TO authenticated;
