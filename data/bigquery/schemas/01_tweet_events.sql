-- BigQuery Schema: tweet_events
-- Partitioned by DATE(created_at) and clustered by author_handle, pillar_id
-- Managed and deployed via Data Agent Kit resource templates: bq://projects/{projectId}/datasets/{datasetId}/tables/tweet_events

CREATE TABLE IF NOT EXISTS `{{projectId}}.{{datasetId}}.tweet_events` (
  tweet_id STRING NOT NULL OPTIONS(description="Unique X platform tweet identifier"),
  author_handle STRING NOT NULL OPTIONS(description="Creator handle"),
  content STRING NOT NULL OPTIONS(description="Full text of tweet or thread starter"),
  pillar_id STRING OPTIONS(description="Assigned content pillar"),
  persona_version INT64 NOT NULL OPTIONS(description="Version of persona when draft was generated"),
  draft_id STRING OPTIONS(description="Originating AGENTX draft identifier"),
  created_at TIMESTAMP NOT NULL OPTIONS(description="Tweet publication timestamp"),
  impressions INT64 NOT NULL OPTIONS(description="Impression count"),
  likes INT64 NOT NULL OPTIONS(description="Like count"),
  retweets INT64 NOT NULL OPTIONS(description="Retweet count"),
  replies INT64 NOT NULL OPTIONS(description="Reply count"),
  bookmarks INT64 NOT NULL OPTIONS(description="Bookmark count (vital signal for solopreneurs)"),
  profile_clicks INT64 NOT NULL OPTIONS(description="Profile visits originating from tweet"),
  url_clicks INT64 NOT NULL OPTIONS(description="Outbound link clicks"),
  engagement_rate FLOAT64 NOT NULL OPTIONS(description="Engagements divided by impressions as percentage"),
  updated_at TIMESTAMP NOT NULL OPTIONS(description="Telemetry sync timestamp")
)
PARTITION BY DATE(created_at)
CLUSTER BY author_handle, pillar_id
OPTIONS (
  description = "Partitioned time-series log of all AGENTX tweets and engagement telemetry"
);
