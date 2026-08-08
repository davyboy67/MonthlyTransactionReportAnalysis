-- Accounts can only be created by redeeming an invite, so this table is the sole signup
-- path: the owner mints a row, sends the raw token, redemption turns it into a users row.
-- Only the SHA-256 of the token is stored -- the raw value exists exactly once, in the
-- response to CreateInvite.
CREATE TABLE IF NOT EXISTS user_invites (
  id           SERIAL       PRIMARY KEY,
  token_hash   VARCHAR(64)  NOT NULL,
  email        VARCHAR(256) NOT NULL,
  first_name   VARCHAR(256) NOT NULL,
  last_name    VARCHAR(256) NOT NULL,
  created_by   INTEGER      NOT NULL REFERENCES users(user_id),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ  NOT NULL,
  redeemed_at  TIMESTAMPTZ  NULL
);

-- Every redemption probes by hash; unique because two invites sharing a token would make
-- "which invite was redeemed?" ambiguous.
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_invites_token_hash ON user_invites(token_hash);

-- Re-inviting an address expires its outstanding invites, which scans by email.
CREATE INDEX IF NOT EXISTS idx_user_invites_email ON user_invites(email);

-- Login resolves a user by email alone, so duplicates would make the account that answers a
-- login non-deterministic. Enforced now because invites create users programmatically.
-- Run these two checks first -- this index fails if the first returns rows, and mixed case
-- silently breaks login:
--   SELECT email, COUNT(*) FROM users GROUP BY 1 HAVING COUNT(*) > 1;
--   SELECT user_id, email FROM users WHERE email <> LOWER(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
