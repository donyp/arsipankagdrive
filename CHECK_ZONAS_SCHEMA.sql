-- Check zonas table structure to find the data type mismatch
SELECT 
    column_name,
    data_type,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'zonas'
ORDER BY 
    ordinal_position;
