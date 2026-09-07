# AGENTX Repository Operating Rules & Policy-Safe Protocol

For any non-trivial task in this repository, the AI agent MUST strictly follow this execution order:

1. **Inspect Current Code**: Always inspect existing files, contracts, and dependencies before proposing or making changes.
2. **Create an Implementation Plan**: Provide a minimal, concrete implementation plan detailing the exact scope, components affected, and verification strategy.
3. **Wait for Explicit Approval**: STOP and wait for the user's explicit approval before writing or modifying any code.
4. **Implement Only Approved Scope**: Confine all modifications strictly to the approved scope. Do not add unapproved features, speculative refactors, or extra dependencies.
5. **Run Verification**: Validate all changes using the repository's verification toolchain (`npm test`, `npm run type-check`, `npm run build`, and endpoint/contract tests).
6. **Provide a Concise Diff Summary**: Conclude every task with a concise summary of files changed, what was kept, and the rationale for the diff.

---

## Mandatory Operational Constraints

- **No Premature Phase Expansion**: Never auto-expand scope across phases (e.g. do not introduce Phase 2+ features such as live OAuth2 flows, background daemons, or multi-account switching during Phase 1 baseline work).
- **Approval-Gated Sensitive Actions**: For AGENTX, sensitive user-facing actions (publishing to X, sending mention replies, applying persona evolution diffs, or crisis state overrides) must remain strictly human-approval-gated unless the user explicitly approves otherwise.
- **Data Agent Kit Boundaries**: Leverage Google Cloud Data Agent Kit strictly for analytics, data modeling (BigQuery schemas, table DDLs, analytical SQL views), and data pipeline planning. Do NOT use Data Agent Kit for unrelated UI tasks or arbitrary frontend complexity.
- **Preserve Architectural Stability**: Keep changes minimal, deliberate, maintainable, and strongly typed. Never replace stable, working architecture unnecessarily.
