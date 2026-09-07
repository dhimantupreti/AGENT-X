-- BigQuery View: v_hook_archetype_roi
-- Purpose: Quantifies performance attribution across hook archetypes (INVERSION, HARD_DATA, DIRECT_QUESTION)
-- Governed by SQL Metric Safety Rule: Explicit SAFE_DIVIDE and declared NULL / COALESCE handling

CREATE OR REPLACE VIEW `{{projectId}}.{{datasetId}}.v_hook_archetype_roi` AS
WITH base_metrics AS (
  SELECT
    author_handle,
    COALESCE(hook_archetype, 'UNCLASSIFIED') AS hook_archetype,
    tweet_id,
    impressions,
    bookmarks,
    profile_clicks,
    retweets,
    estimated_hook_score,
    -- Individual post intent score (NULL if impressions = 0)
    SAFE_DIVIDE((bookmarks * 3) + (profile_clicks * 2) + retweets, impressions) * 100 AS post_intent_score
  FROM `{{projectId}}.{{datasetId}}.tweet_events`
  WHERE created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
)
SELECT
  author_handle,
  hook_archetype,
  COUNT(tweet_id) AS total_posts,
  COALESCE(SUM(impressions), 0) AS total_impressions,
  COALESCE(SUM(bookmarks), 0) AS total_bookmarks,
  COALESCE(SUM(profile_clicks), 0) AS total_profile_clicks,
  ROUND(AVG(estimated_hook_score), 1) AS avg_estimated_score,
  
  -- Solopreneur Intent Score: NULL if no impressions logged yet (avoid misleading 0)
  ROUND(
    SAFE_DIVIDE(
      (SUM(bookmarks) * 3) + (SUM(profile_clicks) * 2) + SUM(retweets),
      SUM(impressions)
    ) * 100,
    2
  ) AS intent_score,
  
  -- Bookmarks per 1,000 impressions: NULL if impressions = 0
  ROUND(
    SAFE_DIVIDE(SUM(bookmarks) * 1000.0, SUM(impressions)),
    1
  ) AS bookmarks_per_k_impressions,
  
  -- Super Hook Ratio: 0.0% if posts exist but none meet threshold (0 is correct product meaning)
  ROUND(
    COALESCE(
      SAFE_DIVIDE(
        COUNTIF(post_intent_score >= 8.0),
        COUNT(tweet_id)
      ) * 100,
      0.0
    ),
    1
  ) AS super_hook_percentage,

  -- Categorical Tier
  CASE
    WHEN SAFE_DIVIDE((SUM(bookmarks) * 3) + (SUM(profile_clicks) * 2) + SUM(retweets), SUM(impressions)) * 100 >= 8.0 THEN 'SUPER_HOOK'
    WHEN SAFE_DIVIDE((SUM(bookmarks) * 3) + (SUM(profile_clicks) * 2) + SUM(retweets), SUM(impressions)) * 100 >= 4.0 THEN 'SOLID_PERFORMER'
    WHEN SUM(impressions) > 0 THEN 'AVERAGE'
    ELSE 'INSUFFICIENT_DATA'
  END AS performance_tier
FROM base_metrics
GROUP BY author_handle, hook_archetype;
