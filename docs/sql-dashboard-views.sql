-- Run all of these in the Supabase SQL editor.
-- security_invoker = true means each view runs as the calling user (respects RLS).

-- 1. Team progress for the admin+ capsule chart
CREATE OR REPLACE VIEW v_team_progress
WITH (security_invoker = true) AS
SELECT
  t.id           AS team_id,
  t.name         AS team_name,
  t.sort_order,
  COUNT(wi.id)   AS total,
  COUNT(wi.id) FILTER (WHERE wi.status = 'done') AS done_count,
  CASE WHEN COUNT(wi.id) = 0 THEN 0
       ELSE ROUND(100.0 * COUNT(wi.id) FILTER (WHERE wi.status = 'done') / COUNT(wi.id))
  END            AS pct
FROM teams t
LEFT JOIN work_items wi
  ON wi.team_id = t.id
 AND wi.type = 'initiative'
 AND wi.approval_status = 'approved'
GROUP BY t.id, t.name, t.sort_order
ORDER BY pct DESC;

GRANT SELECT ON v_team_progress TO authenticated;

-- 2. Member progress for the team_leader capsule chart (scoped to my_team())
CREATE OR REPLACE VIEW v_member_progress
WITH (security_invoker = true) AS
SELECT
  p.id              AS profile_id,
  p.full_name,
  COUNT(wia.work_item_id) AS total,
  COUNT(wia.work_item_id) FILTER (WHERE wi.status = 'done') AS done_count,
  CASE WHEN COUNT(wia.work_item_id) = 0 THEN 0
       ELSE ROUND(100.0 * COUNT(wia.work_item_id) FILTER (WHERE wi.status = 'done') / COUNT(wia.work_item_id))
  END               AS pct
FROM profiles p
LEFT JOIN work_item_assignees wia ON wia.user_id = p.id
LEFT JOIN work_items wi
  ON wi.id = wia.work_item_id
 AND wi.type IN ('initiative', 'task')
 AND wi.approval_status = 'approved'
WHERE p.team_id = my_team()
GROUP BY p.id, p.full_name
ORDER BY pct DESC;

GRANT SELECT ON v_member_progress TO authenticated;

-- 3. Health signals — single row, four counts, for admin+
CREATE OR REPLACE VIEW v_health_signals
WITH (security_invoker = true) AS
SELECT
  (SELECT COUNT(*) FROM (
     SELECT wia.user_id
     FROM work_item_assignees wia
     JOIN work_items wi ON wi.id = wia.work_item_id
     WHERE wi.type = 'initiative'
       AND wi.approval_status = 'approved'
       AND wi.status NOT IN ('done', 'cancelled')
     GROUP BY wia.user_id
     HAVING COUNT(*) > 2
   ) sub)                                                  AS overloaded_people,
  (SELECT COUNT(*) FROM work_items
   WHERE classification = 'experiment'
     AND start_date IS NOT NULL
     AND start_date < now() - interval '3 months'
     AND status NOT IN ('done', 'cancelled'))              AS stale_experiments,
  (SELECT COUNT(*) FROM work_items wi2
   WHERE wi2.type = 'initiative'
     AND wi2.approval_status = 'approved'
     AND wi2.status NOT IN ('done', 'cancelled')
     AND NOT EXISTS (
       SELECT 1 FROM work_item_assignees WHERE work_item_id = wi2.id
     ))                                                    AS unassigned_initiatives,
  (SELECT COUNT(*) FROM work_items
   WHERE status = 'cancelled'
     AND updated_at > now() - interval '6 months')        AS recently_cancelled;

GRANT SELECT ON v_health_signals TO authenticated;

-- 4. Approval latency — median days from created_at to approved_at
CREATE OR REPLACE VIEW v_approval_latency
WITH (security_invoker = true) AS
SELECT
  COALESCE(
    ROUND(
      PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (approved_at::timestamptz - created_at::timestamptz)) / 86400
      )::numeric, 1
    ), 0
  )               AS median_days,
  COUNT(*)        AS approved_count,
  (SELECT COUNT(*) FROM work_items WHERE approval_status = 'pending') AS pending_count
FROM work_items
WHERE approval_status = 'approved'
  AND approved_at IS NOT NULL;

GRANT SELECT ON v_approval_latency TO authenticated;

-- 5. Cycle time by item level — for reports page
CREATE OR REPLACE VIEW v_cycle_time
WITH (security_invoker = true) AS
WITH base AS (
  SELECT
    type,
    CASE WHEN approved_at IS NOT NULL
         THEN EXTRACT(EPOCH FROM (approved_at::timestamptz - created_at::timestamptz)) / 86400
    END AS days_to_approve,
    CASE WHEN completed_at IS NOT NULL AND approved_at IS NOT NULL
         THEN EXTRACT(EPOCH FROM (completed_at::timestamptz - approved_at::timestamptz)) / 86400
    END AS days_to_done
  FROM work_items
)
SELECT
  type,
  COUNT(*) FILTER (WHERE days_to_approve IS NOT NULL)  AS approved_count,
  COALESCE(ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY days_to_approve)::numeric, 1), 0) AS median_days_to_approve,
  COALESCE(ROUND(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY days_to_approve)::numeric, 1), 0) AS p90_days_to_approve,
  COUNT(*) FILTER (WHERE days_to_done IS NOT NULL)     AS done_count,
  COALESCE(ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY days_to_done)::numeric, 1), 0)    AS median_days_to_done,
  COALESCE(ROUND(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY days_to_done)::numeric, 1), 0)    AS p90_days_to_done
FROM base
GROUP BY type;

GRANT SELECT ON v_cycle_time TO authenticated;

-- 6. Monthly throughput — items completed per month per type
CREATE OR REPLACE VIEW v_monthly_throughput
WITH (security_invoker = true) AS
SELECT
  DATE_TRUNC('month', completed_at)::date AS month,
  type,
  COUNT(*)                                AS completed
FROM work_items
WHERE status = 'done' AND completed_at IS NOT NULL
GROUP BY 1, 2
ORDER BY 1;

GRANT SELECT ON v_monthly_throughput TO authenticated;

-- 7. Per-person load — active initiatives per profile, with over-allocation flag
CREATE OR REPLACE VIEW v_person_load
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.full_name,
  p.team_id,
  t.name          AS team_name,
  COUNT(wia.work_item_id)          AS active_initiatives,
  COUNT(wia.work_item_id) > 2      AS over_allocated
FROM profiles p
LEFT JOIN teams t ON t.id = p.team_id
LEFT JOIN work_item_assignees wia ON wia.user_id = p.id
LEFT JOIN work_items wi
  ON wi.id = wia.work_item_id
 AND wi.type = 'initiative'
 AND wi.approval_status = 'approved'
 AND wi.status NOT IN ('done', 'cancelled')
GROUP BY p.id, p.full_name, p.team_id, t.name
ORDER BY active_initiatives DESC;

GRANT SELECT ON v_person_load TO authenticated;

-- 8. Classification mix over time — for reports page
CREATE OR REPLACE VIEW v_classification_mix
WITH (security_invoker = true) AS
SELECT
  DATE_TRUNC('month', created_at)::date AS month,
  classification,
  COUNT(*)                              AS count
FROM work_items
WHERE type = 'initiative' AND classification IS NOT NULL
GROUP BY 1, 2
ORDER BY 1;

GRANT SELECT ON v_classification_mix TO authenticated;

-- 9. Meeting hours per person per week — for reports page
CREATE OR REPLACE VIEW v_meeting_hours
WITH (security_invoker = true) AS
SELECT
  p.id            AS profile_id,
  p.full_name,
  p.team_id,
  DATE_TRUNC('week', m.starts_at)::date AS week,
  ROUND(
    SUM(EXTRACT(EPOCH FROM (m.ends_at::timestamptz - m.starts_at::timestamptz)) / 3600)::numeric
  , 1)            AS hours
FROM meeting_attendees ma
JOIN meetings m ON m.id = ma.meeting_id
JOIN profiles p ON p.id = ma.user_id
WHERE m.status != 'cancelled'
  AND ma.user_id IS NOT NULL
GROUP BY p.id, p.full_name, p.team_id, DATE_TRUNC('week', m.starts_at)::date;

GRANT SELECT ON v_meeting_hours TO authenticated;
