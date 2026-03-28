-- Function to efficiently get the latest population for an array of tanks
-- Returns pairs of (tank_id, current_population)
CREATE OR REPLACE FUNCTION get_active_tank_populations(p_tank_ids uuid[])
RETURNS TABLE(tank_id uuid, current_population numeric) AS $$
BEGIN
  RETURN QUERY
  WITH RankedLogs AS (
    SELECT 
      al.tank_id,
      al.activity_type,
      al.data,
      ROW_NUMBER() OVER (PARTITION BY al.tank_id ORDER BY al.created_at DESC) as rn
    FROM activity_logs al
    WHERE al.tank_id = ANY(p_tank_ids)
      AND al.activity_type IN ('Stocking', 'Observation', 'Harvest', 'Tank Shifting')
  )
  SELECT 
    rl.tank_id,
    CASE
      WHEN rl.activity_type = 'Stocking' THEN COALESCE((rl.data->>'tankStockingNumber')::numeric, 0)
      WHEN rl.activity_type = 'Observation' THEN COALESCE((rl.data->>'presentPopulation')::numeric, 0)
      WHEN rl.activity_type = 'Harvest' THEN COALESCE((rl.data->>'populationAfterHarvest')::numeric, 0)
      WHEN rl.activity_type = 'Tank Shifting' THEN 
        CASE 
          WHEN rl.data->>'isSource' = 'true' THEN COALESCE((rl.data->>'remainingInSource')::numeric, 0)
          WHEN rl.data->>'isDestination' = 'true' THEN COALESCE((rl.data->>'newPopulation')::numeric, 0)
          ELSE 0
        END
      ELSE 0
    END as current_population
  FROM RankedLogs rl
  WHERE rl.rn = 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
