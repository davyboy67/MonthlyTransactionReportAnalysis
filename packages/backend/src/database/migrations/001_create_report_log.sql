CREATE TABLE IF NOT EXISTS report_log (
  id                  SERIAL       PRIMARY KEY,
  report_analysis_id  INTEGER      NULL REFERENCES reportanalysis(id) ON DELETE SET NULL,
  generated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  email_sent          BOOLEAN      NOT NULL DEFAULT FALSE,
  email_sent_at       TIMESTAMPTZ  NULL,
  pdf_data            BYTEA        NULL
);

CREATE INDEX IF NOT EXISTS idx_report_log_report_analysis_id ON report_log(report_analysis_id);
