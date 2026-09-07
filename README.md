# AGENTX

**Autonomous AI Social Media Manager for Solopreneurs on X**

AGENTX reduces or replaces a human social media manager by combining research, strategy, drafting, compliance, triage, crisis handling, analytics, and safe self-evolution into a mobile-first command center.

---

## Product Maturity & Current State

> [!IMPORTANT]
> **Phase 1 Baseline**: Mock-backed, policy-safe, and approval-gated.
> 
> - **Autonomous by default**: Research, drafting, virality hook scoring, policy analysis, analytics interpretation, and evolution proposals.
> - **Human approval required**: Publishing to X, sending mention replies, applying persona evolution diffs, and crisis overrides.
> - **Adapters**: Features isolated adapters with deterministic mock implementations ready for offline development, local contract testing, and live X / x.ai credential binding.
> - **Data Layer**: Includes BigQuery DDL schemas and analytical views designed for Google Cloud Data Agent Kit integration.
> 
> See [PHASE1_BASELINE.md](./PHASE1_BASELINE.md) for the full baseline specification.

---

## The 10-Step Product Workflow

| Stage | Mode | Description |
|---|---|---|
| **1. Research** | Autonomous | Audience pain points, trending niche questions, and hook patterns |
| **2. Strategy** | Creator Defined | Content pillar percentage allocations |
| **3. Create** | Autonomous | Grok/x.ai single-tweet and thread drafting with hook scoring |
| **4. Compliance** | Automated Guard | 280-char boundaries, brand safety, spam patterns, and hype claim checks |
| **5. Posting** | **Human Gated** | **Approval Required**: Review queue requiring creator sign-off before publishing |
| **6. Engagement** | Autonomous Triage | Mention sentiment classification; **Approval Required** to send replies |
| **7. Crisis** | **Creator Override** | Emergency kill-switch halting all publishing queues platform-wide |
| **8. Persona** | Creator Defined | Voice configuration, style moats, and brand-safety forbidden lists |
| **9. Analytics** | Autonomous | BigQuery telemetry tracking the Solopreneur High-Intent Ratio |
| **10. Evolution** | Autonomous Proposal | Signal discovery engine; **Approval Required** to commit config bumps |

---

## Getting Started

### Prerequisites
- Node.js 18+ (tested on Node.js v25.5.0)
- npm 9+

### Quick Start
```bash
# 1. Install dependencies
npm install

# 2. Run unit and contract test suite
npm test

# 3. Run production build
npm run build

# 4. Start local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your mobile browser or use Chrome DevTools device mode (`Ctrl + Shift + M`).

---

## Architecture Overview

```
AGENTX/
├── src/
│   ├── app/                      # Mobile-first App Router screens & API endpoints
│   ├── components/               # Mobile UI (Header, BottomNav, DraftCard, TriageView, etc.)
│   ├── core/
│   │   ├── types/                # Strict domain models (Persona, PostDraft, ComplianceReport, etc.)
│   │   └── schemas/              # Zod validation schemas
│   └── lib/
│       ├── adapters/             # Isolated X API and x.ai (Grok) adapters (Mock + Real)
│       ├── compliance/           # Safety rule engine & brand guardrails
│       ├── orchestration/        # Workflow orchestrator with creator approval gates
│       ├── evolution/            # Persona configuration versioning & rollback manager
│       └── gcp/                  # BigQuery telemetry client
├── data/
│   └── bigquery/                 # DDL schemas & SQL views for Data Agent Kit
└── tests/                        # Automated contract test suite
```
