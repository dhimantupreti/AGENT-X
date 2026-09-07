# AGENTX — Phase 1 Baseline

Official baseline specification for **AGENTX**: an agentic AI social media manager for X (formerly Twitter) purpose-built for solopreneurs and solo creators.

---

## 1. Scope Completed

Phase 1 establishes a production-oriented, mobile-first technical foundation with strict domain separation:

- **Mobile-First App Shell**: Responsive command center built on Next.js 16 (App Router) and Tailwind CSS with custom glassmorphic dark-mode styling and touch-friendly navigation dock.
- **10-Step Product Workflow**: Explicit visual representation of all 10 product lifecycle stages:
  1. `Research`: Autonomous audience pain-point and topic discovery.
  2. `Strategy`: Creator-defined content pillar allocations and weights.
  3. `Create`: Autonomous Grok/x.ai drafter with virality hook scoring.
  4. `Compliance`: Real-time safety engine (280-char limits, brand safety phrases, spam patterns, deceptive hype claims).
  5. `Posting`: Gated review queue requiring creator authorization before publishing.
  6. `Engagement`: Inbound mention sentiment triage with creator-approved reply suggestions.
  7. `Crisis`: Emergency kill-switch halting all publishing queues platform-wide.
  8. `Persona`: Creator voice settings, tone qualifiers, style moats, and forbidden lists.
  9. `Analytics`: BigQuery-ready telemetry tracking the Solopreneur High-Intent Ratio (`bookmarks * 3 + profile_clicks * 2`).
  10. `Evolution`: Autonomous proposal engine creating schema-validated diffs (`v1` -> `v2`) requiring creator sign-off.
- **Isolated Platform Adapters**:
  - `IXClientAdapter`: Interface with deterministic `MockXClientAdapter` and real Twitter v2 endpoints.
  - `IXAIClientAdapter`: Interface with `MockXAIClientAdapter` and `XAIClientAdapter` for Grok structured JSON outputs.
- **Google Cloud Data Layer (Data Agent Kit)**:
  - BigQuery partitioned schema DDLs (`tweet_events`, `persona_versions`, `evolution_signals`).
  - BigQuery SQL view (`v_hook_performance.sql`) for high-intent virality analysis.
  - Ready for Data Agent Kit resource binding (`bq://projects/{projectId}/datasets/{datasetId}`).

---

## 2. Approval-Gated Operating Model

AGENTX enforces a **policy-safe human-in-the-loop** operating model:

| Capability Category | Default Mode | Creator Gate |
|---|---|---|
| **Research, Drafting & Scoring** | Autonomous | None (auto-generates drafts and estimates hook virality score) |
| **Policy & Brand Compliance** | Automated Guard | Auto-flags violations; blocks publishing if critical policy fails |
| **Posting to X** | **Human Gated** | **Approval Required**: `publishDraftPipeline` strictly blocks publishing unless `draft.status === 'APPROVED'` |
| **Engagement Replies** | **Human Gated** | **Approval Required**: AI-drafted replies require creator clicking `Approve & Send` |
| **Crisis Pause** | **Manual Override** | **Creator Kill-Switch**: One-tap freeze halts all automated and scheduled operations |
| **Persona Evolution** | **Human Gated** | **Approval Required**: High-performing hook diffs require explicit creator approval to commit version bumps |

---

## 3. Key Architecture Decisions

1. **No Premature Autonomy**: The platform never publishes posts, sends replies, or mutates configuration on behalf of the creator without explicit authorization.
2. **Safe Self-Evolution over Code Mutation**: Persona evolution mutates only typed configuration fields (`tone.styleTags`, `tone.forbiddenPhrases`, `pillars`). Uncontrolled code self-mutation is strictly forbidden.
3. **Adapter Isolation**: All external network boundaries (X API v2, x.ai Grok API, Google Cloud BigQuery) are abstracted behind interfaces with robust mock implementations, enabling 100% offline development and deterministic testing.
4. **Data Agent Kit for Analytics Only**: Data Agent Kit is strictly leveraged for data modeling, BigQuery schema definition, and pipeline analytics—never for unrelated frontend UI logic.
5. **Mobile-First UX**: Solopreneurs operate primarily from mobile devices; the UI emphasizes single-thumb interactions, review queues, and rapid 1-tap approvals.

---

## 4. Verification Completed

- **Automated Contract Test Suite** (`tests/contracts.test.ts`):
  - ✓ Test 1: Compliance clean draft verification (Score 100).
  - ✓ Test 2: Forbidden brand phrase violation detection (`"game-changer"`).
  - ✓ Test 3: Character length limits exceeded (`> 280` characters).
  - ✓ Test 4: Crisis pause enforcement (publishing blocked, score 0).
  - ✓ Test 5: Safe evolution manager version bump (`v1` -> `v2`) and rollback.
  - ✓ Test 6: Policy gate verification (unapproved draft blocked; approved draft published).
- **Live API Integration Test** (`scripts/test-api.ts`):
  - ✓ `POST /api/generate-draft` -> 200 OK
  - ✓ `POST /api/publish-draft` (Unapproved) -> 400 Blocked as expected
  - ✓ `POST /api/publish-draft` (Approved) -> 200 Published (Tweet ID returned)
  - ✓ `POST /api/evolution/apply` -> 200 Persona evolved to v2
- **Type-Check & Build**:
  - `npx tsc --noEmit`: 0 errors.
  - `npm run build`: Production bundle compiled successfully with Turbopack.

---

## 5. Deferred Items for Later Phases

- **Phase 2**: Live X API OAuth2 token exchange and session management.
- **Phase 2**: Live x.ai API key configuration and streaming response generation.
- **Phase 3**: Live GCP deployment and BigQuery dataset provisioning via Data Agent Kit.
- **Phase 3**: Background scheduler worker for approved drafts with peak time slot execution.
- **Phase 4**: Multi-account profile switching and multimedia tweet attachments.
