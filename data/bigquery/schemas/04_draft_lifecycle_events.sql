-- BigQuery Schema: draft_lifecycle_events
-- Partitioned by DATE(created_at) and clustered by author_handle, event_type, selected_hook_archetype
-- Managed and deployed via Data Agent Kit: bq://projects/{projectId}/datasets/{datasetId}/tables/draft_lifecycle_events

CREATE TABLE IF NOT EXISTS `{{projectId}}.{{datasetId}}.draft_lifecycle_events` (
  event_id STRING NOT NULL OPTIONS(description="Unique lifecycle event identifier"),
  draft_id STRING NOT NULL OPTIONS(description="Target AGENTX draft identifier"),
  author_handle STRING NOT NULL OPTIONS(description="Creator handle"),
  event_type STRING NOT NULL OPTIONS(description="Event type: DRAFT_CREATED, HOOK_SWAPPED, APPROVED, DISMISSED, PUBLISHED"),
  pillar_id STRING OPTIONS(description="Content pillar associated with draft"),
  initial_hook_archetype STRING OPTIONS(description="Hook archetype generated first (INVERSION, HARD_DATA, DIRECT_QUESTION)"),
  selected_hook_archetype STRING OPTIONS(description="Active hook archetype at time of event"),
  initial_hook_id STRING OPTIONS(description="Initial hook ID"),
  selected_hook_id STRING OPTIONS(description="Active hook ID at time of event"),
  format STRING OPTIONS(description="Draft format: SINGLE_TWEET or THREAD"),
  is_hook_swapped BOOL NOT NULL OPTIONS(description="True if hook was modified from initial generation"),
  time_in_queue_seconds INT64 OPTIONS(description="Seconds elapsed from creation to terminal state; NULL if in progress"),
  created_at TIMESTAMP NOT NULL OPTIONS(description="Event creation timestamp")
)
PARTITION BY DATE(created_at)
CLUSTER BY author_handle, event_type, selected_hook_archetype
OPTIONS (
  description = "Partitioned audit log of creator draft lifecycle interactions, hook selections, and approval velocity"
);
