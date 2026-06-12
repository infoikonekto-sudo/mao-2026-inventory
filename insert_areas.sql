DO $$
DECLARE
    dept_names TEXT[] := ARRAY[
        'Recepción', 
        'Garita', 
        'Transportes', 
        'Admisiones', 
        'Recursos Humanos',
        'Pre Primaria', 
        'Secundaria Primaria', 
        'Superior Primaria', 
        'Elemental',
        'PAE Primaria', 
        'PAE Secundaria', 
        'Emociones Primaria', 
        'Emociones Secundaria',
        'Cafetería', 
        'Administración', 
        'Club MAO', 
        'Enfermería', 
        'Homeschool',
        'Contabilidad', 
        'Compras'
    ];
    d_name TEXT;
BEGIN
    FOREACH d_name IN ARRAY dept_names
    LOOP
        IF NOT EXISTS (SELECT 1 FROM departments WHERE name ILIKE d_name) THEN
            INSERT INTO departments (name) VALUES (d_name);
        END IF;
    END LOOP;
END $$;
