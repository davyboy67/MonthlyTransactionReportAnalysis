ALTER TABLE users ADD COLUMN IF NOT EXISTS pay_day SMALLINT NOT NULL DEFAULT 26;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pay_day_check;
ALTER TABLE users ADD CONSTRAINT users_pay_day_check CHECK (pay_day BETWEEN 1 AND 31);

-- Keyed by calendar month, not by report: the Dec 2025 pay date both opens January's
-- cycle and closes December's, so both reports read the same row.
CREATE TABLE IF NOT EXISTS user_pay_day (
  user_id   INT      NOT NULL REFERENCES users(user_id),
  pay_month DATE     NOT NULL,
  pay_day   SMALLINT NOT NULL CHECK (pay_day BETWEEN 1 AND 31),
  PRIMARY KEY (user_id, pay_month)
);
