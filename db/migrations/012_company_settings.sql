-- Company-scoped settings storage. Values are migrated separately from the
-- legacy browser backup; applying this schema does not seed or overwrite them.
CREATE TABLE public.company_settings (
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  setting_key text NOT NULL CHECK (setting_key IN (
    'company', 'invoice', 'bank', 'international'
  )),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  source_record jsonb NOT NULL CHECK (jsonb_typeof(source_record) = 'object'),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, setting_key)
);

CREATE INDEX company_settings_company_idx ON public.company_settings(company_id);

COMMENT ON TABLE public.company_settings IS
  'Company-scoped settings. Legacy values are not seeded by this schema migration.';
COMMENT ON COLUMN public.company_settings.payload IS
  'Current settings object; may include sensitive bank or statutory fields. Do not log.';
COMMENT ON COLUMN public.company_settings.source_record IS
  'Last accepted source object retained to preserve unmapped settings fields.';
