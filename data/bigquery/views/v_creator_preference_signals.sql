-- BigQuery View: v_creator_preference_signals
-- Purpose: Aggregates creator interaction, hook swapping, and approval velocity telemetry
-- Governed by SQL Metric Safety Rule: Explicit SAFE_DIVIDE and declared NULL / COALESCE handling

CREATE OR REPLACE VIEW `{{projectId}}.{{datasetId}}.v_creator_preference_signals` AS
WITH author_events AS (
  SELECT
    author_handle,
    event_type,
    draft_id,
    is_hook_swapped,
    selected_hook_archetype,
    time_in_queue_seconds
  FROM `{{projectId}}.{{datasetId}}.draft_lifecycle_events`
  WHERE created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
),
draft_summaries AS (
  SELECT
    author_handle,
    COUNT(DISTINCT draft_id) AS total_drafts,
    COUNT(DISTINCT IF(event_type = 'APPROVED', draft_id, NULL)) AS approved_drafts,
    COUNT(DISTINCT IF(event_type = 'DISMISSED', draft_id, NULL)) AS dismissed_drafts,
    COUNT(DISTINCT IF(is_hook_swapped = TRUE, draft_id, NULL)) AS hook_swapped_drafts,
    AVG(IF(event_type = 'APPROVED', time_in_queue_seconds, NULL)) AS avg_approval_latency_seconds
  FROM author_events
  GROUP BY author_handle
),
top_selected_archetype AS (
  SELECT
    author_handle,
    selected_hook_archetype AS preferred_archetype
  FROM author_events
  WHERE selected_hook_archetype IS NOT NULL
  GROUP BY author_handle, selected_hook_archetype
  QUALIFY ROW_NUMBER() OVER(PARTITION BY author_handle ORDER BY COUNT(1) DESC) = 1
)
SELECT
  ds.author_handle,
  ds.total_drafts,
  ds.approved_drafts,
  ds.dismissed_drafts,
  ds.hook_swapped_drafts,
  tsa.preferred_archetype,

  -- Hook Swap Rate: 0.0% if drafts created but none swapped; NULL if 0 drafts
  ROUND(
    COALESCE(
      SAFE_DIVIDE(ds.hook_swapped_drafts * 100.0, ds.total_drafts),
      IF(ds.total_drafts > 0, 0.0, NULL)
    ),
    1
  ) AS hook_swap_rate_pct,

  -- Approval Rate: 0.0% if drafts created but none approved; NULL if 0 drafts
  ROUND(
    COALESCE(
      SAFE_DIVIDE(ds.approved_drafts * 100.0, ds.total_drafts),
      IF(ds.total_drafts > 0, 0.0, NULL)
    ),
    1
  ) AS approval_rate_pct,

  -- Average Time in Queue before Approval: NULL if no approved drafts
  ROUND(ds.avg_approval_latency_seconds, 0) AS avg_time_to_approval_seconds,

  -- Editorial Engagement Category
  CASE
    WHEN ds.total_drafts IS NULL OR ds.total_drafts = 0 THEN 'NO_DRAFTS'
    WHEN SAFE_DIVIDE(ds.hook_swapped_drafts * 100.0, ds.total_drafts) >= 40.0 THEN 'ACTIVE_CURATOR'
    WHEN SAFE_DIVIDE(ds.hook_swapped_drafts * 100.0, ds.total_drafts) >= 15.0 THEN 'SELECTIVE_EDITOR'
    ELSE 'DEFAULT_ACCEPTING'
  END AS creator_curation_style

FROM draft_summaries ds
LEFT JOIN top_selected_archetype tsa ON ds.author_handle = tsa.author_handle;
