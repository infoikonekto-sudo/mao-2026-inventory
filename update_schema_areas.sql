-- 1. Añadir department_id a presupuestos
ALTER TABLE budgets 
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id);

-- 2. Asegurar que department_id en cost_centers sea UUID referenciado a departments
-- Si la columna ya existe como texto (debido al selector anterior), es posible que arroje error
-- al convertir a UUID si contiene datos como "Académico".
-- Para evitar errores, puedes vaciar la columna antes de alterarla si no contiene datos críticos:
-- UPDATE cost_centers SET department_id = NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'cost_centers' AND column_name = 'department_id'
    ) THEN
        -- Intentar alterar el tipo (fallará si hay strings que no son uuid)
        -- Si falla, debes vaciar la columna manualmente primero.
        ALTER TABLE cost_centers 
        ALTER COLUMN department_id TYPE UUID USING department_id::uuid;
        
        -- Añadir la FK si no existe
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.table_constraints
            WHERE table_name = 'cost_centers' AND constraint_type = 'FOREIGN KEY' AND constraint_name = 'cost_centers_department_id_fkey'
        ) THEN
            ALTER TABLE cost_centers
            ADD CONSTRAINT cost_centers_department_id_fkey
            FOREIGN KEY (department_id) REFERENCES departments(id);
        END IF;
    ELSE
        -- Si no existe la creamos
        ALTER TABLE cost_centers 
        ADD COLUMN department_id UUID REFERENCES departments(id);
    END IF;
END $$;
