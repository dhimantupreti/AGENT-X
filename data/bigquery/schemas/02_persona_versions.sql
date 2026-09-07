-- BigQuery Schema: persona_versions
-- Stores immutable version snapshots and evolution diffs
-- Managed via Data Agent Kit: bq://projects/{projectId}/datasets/{datasetId}/tables/persona_versions

CREATE TABLE IF NOT EXISTS `{{projectId}}.{{datasetId}}.persona_versions` (
  persona_id STRING NOT NULL OPTIONS(description="Unique persona profile identifier"),
  version INT64 NOT NULL OPTIONS(description="Monotonically increasing version number"),
  handle STRING NOT NULL OPTIONS(description="X account handle"),
  niche STRING NOT NULL OPTIONS(description="Creator niche"),
  tone_primary STRING NOT NULL OPTIONS(description="Primary voice profile"),
  style_tags ARRAY<STRING> OPTIONS(description="Active style tag qualifiers"),
  forbidden_phrases ARRAY<STRING> OPTIONS(description="Brand-safety banned phrase list"),
  pillars_json STRING NOT NULL OPTIONS(description="JSON snapshot of active content pillars"),
  evolution_signal_id STRING OPTIONS(description="Triggering evolution signal if auto-evolved"),
  evolution_summary STRING OPTIONS(description="Rationale and diff description"),
  created_at TIMESTAMP NOT NULL OPTIONS(description="Timestamp this version was committed")
)
CLUSTER BY persona_id, version
OPTIONS (
  description = "Immutable audit log of persona configuration versions for safe self-evolution"
);
