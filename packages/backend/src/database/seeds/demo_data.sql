-- ============================================================================
-- Demo data seed  (user_id = 2, the "admin" demo account)
-- ----------------------------------------------------------------------------
-- Populates 5 months of fictional financial data (Jan–May 2026) so the demo
-- account is not empty. All values are made up. Safe to commit (no real data).
--
-- Re-runnable: it wipes user 2's existing reports/transactions/budgets first,
-- so running it again resets the demo to a clean state.
--
-- Run AFTER the demo user (user_id = 2) exists. Totals on reportanalysis are
-- recomputed from the transactions at the end, so they always agree with the
-- per-category breakdown.
-- ============================================================================

BEGIN;

-- 1. Clean any existing demo data (idempotent reset) -------------------------
DELETE FROM transaction WHERE user_id = 2;
DELETE FROM budget_category WHERE budget_id IN (SELECT budget_id FROM budget WHERE user_id = 2);
DELETE FROM budget WHERE user_id = 2;
DELETE FROM reportanalysis WHERE user_id = 2;

-- 2. One report per month (totals filled in at step 4) ------------------------
INSERT INTO reportanalysis (user_id, report_date, total_income, total_expenses, total_savings)
VALUES
  (2, '2026-01-31', 0, 0, 0),
  (2, '2026-02-28', 0, 0, 0),
  (2, '2026-03-31', 0, 0, 0),
  (2, '2026-04-30', 0, 0, 0),
  (2, '2026-05-31', 0, 0, 0);

-- 3. Transactions, linked to each month's report by report_date --------------
-- January
INSERT INTO transaction (report_analysis_id, user_id, date, description, amount, category, merchant, type)
SELECT r.id, 2, v.date, v.description, v.amount, v.category, v.merchant, v.type
FROM reportanalysis r
CROSS JOIN (VALUES
  ('2026-01-03'::date, 'Salary - Acme Corp',          32000.00, 'Income',        'Acme Corp',        'Income'),
  ('2026-01-05'::date, 'Checkers Groceries',           2480.30, 'Groceries',      'Checkers',         'Expense'),
  ('2026-01-12'::date, 'Woolworths Food',              1675.45, 'Groceries',      'Woolworths',       'Expense'),
  ('2026-01-08'::date, 'Engen Fuel',                   1450.00, 'Transport',      'Engen',            'Expense'),
  ('2026-01-15'::date, 'Eskom Electricity',            1850.00, 'Utilities',      'Eskom',            'Expense'),
  ('2026-01-18'::date, 'Nandos Dinner',                 420.00, 'Dining Out',     'Nandos',           'Expense'),
  ('2026-01-20'::date, 'Netflix + Spotify',             448.00, 'Subscriptions',  'Netflix',          'Expense'),
  ('2026-01-22'::date, 'Mr Price Clothing',            1320.00, 'Shopping',       'Mr Price',         'Expense'),
  ('2026-01-25'::date, 'Dis-Chem Pharmacy',             760.50, 'Health',         'Dis-Chem',         'Expense'),
  ('2026-01-28'::date, 'Discovery Insurance',          1980.00, 'Insurance',      'Discovery',        'Expense'),
  ('2026-01-30'::date, 'Monthly Account Fee',            65.00, 'Fees',           'FNB',              'Expense')
) AS v(date, description, amount, category, merchant, type)
WHERE r.user_id = 2 AND r.report_date = '2026-01-31';

-- February
INSERT INTO transaction (report_analysis_id, user_id, date, description, amount, category, merchant, type)
SELECT r.id, 2, v.date, v.description, v.amount, v.category, v.merchant, v.type
FROM reportanalysis r
CROSS JOIN (VALUES
  ('2026-02-03'::date, 'Salary - Acme Corp',          32000.00, 'Income',        'Acme Corp',        'Income'),
  ('2026-02-06'::date, 'Pick n Pay Groceries',         2890.15, 'Groceries',      'Pick n Pay',       'Expense'),
  ('2026-02-14'::date, 'Valentines Dinner',            1240.00, 'Dining Out',     'The Grill House',  'Expense'),
  ('2026-02-09'::date, 'Uber Trips',                    980.00, 'Transport',      'Uber',             'Expense'),
  ('2026-02-15'::date, 'City of Joburg Water',          720.00, 'Utilities',      'City of Joburg',   'Expense'),
  ('2026-02-17'::date, 'Ster-Kinekor Movies',           360.00, 'Entertainment',  'Ster-Kinekor',     'Expense'),
  ('2026-02-20'::date, 'Netflix + Spotify',             448.00, 'Subscriptions',  'Netflix',          'Expense'),
  ('2026-02-24'::date, 'Takealot Order',               2150.00, 'Shopping',       'Takealot',         'Expense'),
  ('2026-02-26'::date, 'Discovery Insurance',          1980.00, 'Insurance',      'Discovery',        'Expense'),
  ('2026-02-28'::date, 'Monthly Account Fee',            65.00, 'Fees',           'FNB',              'Expense')
) AS v(date, description, amount, category, merchant, type)
WHERE r.user_id = 2 AND r.report_date = '2026-02-28';

-- March
INSERT INTO transaction (report_analysis_id, user_id, date, description, amount, category, merchant, type)
SELECT r.id, 2, v.date, v.description, v.amount, v.category, v.merchant, v.type
FROM reportanalysis r
CROSS JOIN (VALUES
  ('2026-03-03'::date, 'Salary - Acme Corp',          33500.00, 'Income',        'Acme Corp',        'Income'),
  ('2026-03-07'::date, 'Checkers Groceries',           2610.80, 'Groceries',      'Checkers',         'Expense'),
  ('2026-03-11'::date, 'Engen Fuel',                   1520.00, 'Transport',      'Engen',            'Expense'),
  ('2026-03-13'::date, 'Eskom Electricity',            1990.00, 'Utilities',      'Eskom',            'Expense'),
  ('2026-03-16'::date, 'Udemy Course',                 1200.00, 'Education',      'Udemy',            'Expense'),
  ('2026-03-19'::date, 'Kauai Lunch',                   380.00, 'Dining Out',     'Kauai',            'Expense'),
  ('2026-03-21'::date, 'Netflix + Spotify',             448.00, 'Subscriptions',  'Netflix',          'Expense'),
  ('2026-03-24'::date, 'Sportsmans Warehouse',         1850.00, 'Shopping',       'Sportsmans WH',    'Expense'),
  ('2026-03-27'::date, 'Discovery Insurance',          1980.00, 'Insurance',      'Discovery',        'Expense'),
  ('2026-03-30'::date, 'Monthly Account Fee',            65.00, 'Fees',           'FNB',              'Expense')
) AS v(date, description, amount, category, merchant, type)
WHERE r.user_id = 2 AND r.report_date = '2026-03-31';

-- April
INSERT INTO transaction (report_analysis_id, user_id, date, description, amount, category, merchant, type)
SELECT r.id, 2, v.date, v.description, v.amount, v.category, v.merchant, v.type
FROM reportanalysis r
CROSS JOIN (VALUES
  ('2026-04-03'::date, 'Salary - Acme Corp',          33500.00, 'Income',        'Acme Corp',        'Income'),
  ('2026-04-06'::date, 'Woolworths Food',              3120.40, 'Groceries',      'Woolworths',       'Expense'),
  ('2026-04-10'::date, 'Uber Trips',                   1080.00, 'Transport',      'Uber',             'Expense'),
  ('2026-04-14'::date, 'Eskom Electricity',            2050.00, 'Utilities',      'Eskom',            'Expense'),
  ('2026-04-17'::date, 'Gym Membership',                650.00, 'Health',         'Virgin Active',    'Expense'),
  ('2026-04-19'::date, 'Cinema & Dinner',               890.00, 'Entertainment',  'Nu Metro',         'Expense'),
  ('2026-04-21'::date, 'Netflix + Spotify',             448.00, 'Subscriptions',  'Netflix',          'Expense'),
  ('2026-04-23'::date, 'Mr Price Home',                1240.00, 'Shopping',       'Mr Price',         'Expense'),
  ('2026-04-26'::date, 'Discovery Insurance',          1980.00, 'Insurance',      'Discovery',        'Expense'),
  ('2026-04-29'::date, 'Monthly Account Fee',            65.00, 'Fees',           'FNB',              'Expense')
) AS v(date, description, amount, category, merchant, type)
WHERE r.user_id = 2 AND r.report_date = '2026-04-30';

-- May
INSERT INTO transaction (report_analysis_id, user_id, date, description, amount, category, merchant, type)
SELECT r.id, 2, v.date, v.description, v.amount, v.category, v.merchant, v.type
FROM reportanalysis r
CROSS JOIN (VALUES
  ('2026-05-03'::date, 'Salary - Acme Corp',          33500.00, 'Income',        'Acme Corp',        'Income'),
  ('2026-05-05'::date, 'Checkers Groceries',           2745.60, 'Groceries',      'Checkers',         'Expense'),
  ('2026-05-09'::date, 'Engen Fuel',                   1600.00, 'Transport',      'Engen',            'Expense'),
  ('2026-05-13'::date, 'Eskom Electricity',            2120.00, 'Utilities',      'Eskom',            'Expense'),
  ('2026-05-16'::date, 'Spur Family Dinner',            720.00, 'Dining Out',     'Spur',             'Expense'),
  ('2026-05-18'::date, 'Netflix + Spotify',             448.00, 'Subscriptions',  'Netflix',          'Expense'),
  ('2026-05-20'::date, 'Apple Store',                  1499.00, 'Shopping',       'iStore',           'Expense'),
  ('2026-05-23'::date, 'Dis-Chem Pharmacy',             610.25, 'Health',         'Dis-Chem',         'Expense'),
  ('2026-05-27'::date, 'Discovery Insurance',          1980.00, 'Insurance',      'Discovery',        'Expense'),
  ('2026-05-29'::date, 'Monthly Account Fee',            65.00, 'Fees',           'FNB',              'Expense')
) AS v(date, description, amount, category, merchant, type)
WHERE r.user_id = 2 AND r.report_date = '2026-05-31';

-- 4. Recompute report totals from the transactions ---------------------------
UPDATE reportanalysis r SET
  total_income   = COALESCE((SELECT SUM(t.amount) FROM transaction t WHERE t.report_analysis_id = r.id AND t.type = 'Income'), 0),
  total_expenses = COALESCE((SELECT SUM(t.amount) FROM transaction t WHERE t.report_analysis_id = r.id AND t.type = 'Expense'), 0)
WHERE r.user_id = 2;

UPDATE reportanalysis
SET total_savings = total_income - total_expenses
WHERE user_id = 2;

-- 5. A budget per month with category targets --------------------------------
INSERT INTO budget (user_id, budget_month, notes, created_at, updated_at)
VALUES
  (2, '2026-01-01', 'Demo budget', NOW(), NULL),
  (2, '2026-02-01', 'Demo budget', NOW(), NULL),
  (2, '2026-03-01', 'Demo budget', NOW(), NULL),
  (2, '2026-04-01', 'Demo budget', NOW(), NULL),
  (2, '2026-05-01', 'Demo budget', NOW(), NULL);

INSERT INTO budget_category (budget_id, category_name, amount)
SELECT b.budget_id, v.category_name, v.amount
FROM budget b
CROSS JOIN (VALUES
  ('Groceries',     5000.00),
  ('Dining Out',    1500.00),
  ('Transport',     2500.00),
  ('Utilities',     2500.00),
  ('Subscriptions',  600.00),
  ('Entertainment', 1000.00),
  ('Shopping',      3000.00),
  ('Health',        1500.00),
  ('Insurance',     2000.00)
) AS v(category_name, amount)
WHERE b.user_id = 2;

COMMIT;
