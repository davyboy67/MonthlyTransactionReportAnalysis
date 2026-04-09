BEGIN;
CREATE TABLE IF NOT EXISTS budget (
  budget_id INT PRIMARY KEY NOT NULL GENERATED ALWAYS AS IDENTITY,
  user_id INT,
  CONSTRAINT fk_budget_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  budget_month DATE NOT NULL,
  notes VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);
CREATE TABLE IF NOT EXISTS budget_category (
  category_id INT PRIMARY KEY NOT NULL GENERATED ALWAYS AS IDENTITY,
  budget_id INT,
  CONSTRAINT fk_budget FOREIGN KlEY (budget_id) REFERENCES budget(budget_id) ON DELETE CASCADE,
  category_name VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL
);
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_name = 'reportanalysis'
    AND column_name = 'budget_id'
) THEN
ALTER TABLE reportanalysis
ADD COLUMN budget_id INT,
  ADD CONSTRAINT fk_reportanalysis_budget FOREIGN KEY (budget_id) REFERENCES budget(budget_id) ON DELETE
SET NULL;
END IF;
END $$;
COMMIT;