-- BigQuery View: v_pillar_target_vs_actual
-- Purpose: Evaluates creator content pillar balance (target allocation vs actual published share)
-- Governed by SQL Metric Safety Rule: Explicit SAFE_DIVIDE and declared NULL / COALESCE handling

CREATE OR REPLACE VIEW `{{projectId}}.{{datasetId}}.v_pillar_target_vs_actual` AS
WITH latest_persona AS (
  SELECT
    handle,
    version,
    pillars_json
  FROM `{{projectId}}.{{datasetId}}.persona_versions`
  QUALIFY ROW_NUMBER() OVER(PARTITION BY handle ORDER BY version DESC) = 1
),
configured_pillars AS (
  SELECT
    lp.handle AS author_handle,
    JSON_VALUE(pillar, '$.id') AS pillar_id,
    JSON_VALUE(pillar, '$.name') AS pillar_name,
    CAST(JSON_VALUE(pillar, '$.weight') AS FLOAT64) AS target_weight_pct
  FROM latest_persona lp,
  UNNEST(JSON_EXTRACT_ARRAY(lp.pillars_json)) AS pillar
),
recent_tweets AS (
  SELECT
    author_handle,
    pillar_id,
    tweet_id,
    impressions,
    bookmarks,
    profile_clicks,
    retweets
  FROM `{{projectId}}.{{datasetId}}.tweet_events`
  WHERE created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
),
author_totals AS (
  SELECT
    author_handle,
    COUNT(tweet_id) AS author_total_tweets
  FROM recent_tweets
  GROUP BY author_handle
),
pillar_aggregates AS (
  SELECT
    rt.author_handle,
    rt.pillar_id,
    COUNT(rt.tweet_id) AS published_count,
    COALESCE(SUM(rt.impressions), 0) AS total_impressions,
    COALESCE(SUM(rt.bookmarks), 0) AS total_bookmarks,
    COALESCE(SUM(rt.profile_clicks), 0) AS total_profile_clicks,
    COALESCE(SUM(rt.retweets), 0) AS total_retweets
  FROM recent_tweets rt
  GROUP BY rt.author_handle, rt.pillar_id
)
SELECT
  cp.author_handle,
  cp.pillar_id,
  cp.pillar_name,
  cp.target_weight_pct,
  COALESCE(pa.published_count, 0) AS published_count,
  
  -- Actual publishing share: 0.0% if author has published tweets elsewhere but none for this pillar
  -- NULL only if author has 0 published tweets total (no baseline distribution)
  ROUND(
    COALESCE(
      SAFE_DIVIDE(
        pa.published_count * 100.0,
        at.author_total_tweets
      ),
      IF(at.author_total_tweets > 0, 0.0, NULL)
    ),
    1
  ) AS actual_share_pct,
  
  -- Skew: actual_share - target_weight (NULL if no tweets published by author)
  ROUND(
    SAFE_SUBTRACT(
      COALESCE(
        SAFE_DIVIDE(pa.published_count * 100.0, at.author_total_tweets),
        IF(at.author_total_tweets > 0, 0.0, NULL)
      ),
      cp.target_weight_pct
    ),
    1
  ) AS skew_pct,

  -- Pillar Intent Score: NULL if total impressions = 0
  ROUND(
    SAFE_DIVIDE(
      (pa.total_bookmarks * 3) + (pa.total_profile_clicks * 2) + pa.total_retweets,
      pa.total_impressions
    ) * 100,
    2
  ) AS pillar_intent_score,

  -- Allocation Health Status
  CASE
    WHEN at.author_total_tweets IS NULL OR at.author_total_tweets = 0 THEN 'NO_DATA'
    WHEN (COALESCE(SAFE_DIVIDE(pa.published_count * 100.0, at.author_total_tweets), 0.0) - cp.target_weight_pct) < -10.0 THEN 'UNDER_ALLOCATED'
    WHEN (COALESCE(SAFE_DIVIDE(pa.published_count * 100.0, at.author_total_tweets), 0.0) - cp.target_weight_pct) > 10.0 THEN 'OVER_ALLOCATED'
    ELSE 'ON_TARGET'
  END AS allocation_status

FROM configured_pillars cp
LEFT JOIN author_totals at ON cp.author_handle = at.author_handle
LEFT JOIN pillar_aggregates pa ON cp.author_handle = pa.author_handle AND cp.pillar_id = pa.pillar_id;
