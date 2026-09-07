-- BigQuery View: v_hook_performance
-- Discovers high-performing hooks and topics to feed the AGENTX Safe Evolution Loop
-- Evaluated via BigQuery and monitored via Data Agent Kit

CREATE OR REPLACE VIEW `{{projectId}}.{{datasetId}}.v_hook_performance` AS
WITH metrics_calc AS (
  SELECT
    tweet_id,
    author_handle,
    pillar_id,
    content,
    SUBSTR(content, 1, 80) AS hook_excerpt,
    impressions,
    likes,
    retweets,
    replies,
    bookmarks,
    profile_clicks,
    engagement_rate,
    -- Solopreneur High Intent Ratio: (Bookmarks + Profile Clicks) / Impressions
    SAFE_DIVIDE((bookmarks * 3) + (profile_clicks * 2) + retweets, impressions) * 100 AS intent_score,
    created_at
  FROM `{{projectId}}.{{datasetId}}.tweet_events`
  WHERE created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
)
SELECT
  author_handle,
  pillar_id,
  tweet_id,
  hook_excerpt,
  impressions,
  bookmarks,
  intent_score,
  CASE
    WHEN intent_score >= 8.0 THEN 'SUPER_HOOK'
    WHEN intent_score >= 4.0 THEN 'SOLID_PERFORMER'
    ELSE 'AVERAGE'
  END AS performance_tier,
  created_at
FROM metrics_calc
ORDER BY intent_score DESC;
