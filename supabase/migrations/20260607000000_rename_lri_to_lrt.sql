-- Update farms category from 'LRI' to 'LRT'
UPDATE farms SET category = 'LRT' WHERE category = 'LRI';

-- Update hatcheries modules array to replace 'LRI' with 'LRT'
UPDATE hatcheries 
SET modules = array_replace(modules, 'LRI', 'LRT') 
WHERE 'LRI' = ANY(modules);
