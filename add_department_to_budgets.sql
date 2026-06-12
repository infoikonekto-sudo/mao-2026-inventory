ALTER TABLE budgets ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id);
