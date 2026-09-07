-- BigQuery Schema: evolution_signals
-- Tracks autonomous signals discovered from tweet telemetry
-- Managed via Data Agent Kit: bq://projects/{projectId}/datasets/{datasetId}/tables/evolution_signals

CREATE TABLE IF NOT EXISTS `{{projectId}}.{{datasetId}}.evolution_signals` (
  signal_id STRING NOT NULL OPTIONS(description="Unique signal identifier"),
  persona_id STRING NOT NULL OPTIONS(description="Target persona identifier"),
  signal_type STRING NOT NULL OPTIONS(description="Type e.g. HIGH_PERFORMING_HOOK, ENGAGEMENT_VELOCITY_DROP"),
  confidence FLOAT64 NOT NULL OPTIONS(description="Algorithmic confidence score (0 to 1.0)"),
  evidence_json STRING NOT NULL OPTIONS(description="Telemetry evidence details and tweet IDs"),
  proposed_field STRING NOT NULL OPTIONS(description="Target persona field to adjust"),
  proposed_adjustment_json STRING NOT NULL OPTIONS(description="Diff payload"),
  status STRING NOT NULL OPTIONS(description="PENDING_APPROVAL | APPLIED | DISMISSED"),
  created_at TIMESTAMP NOT NULL OPTIONS(description="Discovery timestamp"),
  resolved_at TIMESTAMP OPTIONS(description="Action timestamp")
)
PARTITION BY DATE(created_at)
CLUSTER BY persona_id, status
OPTIONS (
  description = "Discovered evolution opportunities and prompt adjustments awaiting or applied to creator personas"
);
