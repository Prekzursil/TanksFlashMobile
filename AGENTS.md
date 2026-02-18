# AGENTS.md

## Operating Model
This repository follows an evidence-first, zero-external-API-cost workflow.
Use GitHub Copilot coding agent and Codex app/IDE/CLI for implementation and review.

## Risk Policy
- Default merge policy: human-reviewed only.
- Use explicit risk labels: `risk:low`, `risk:medium`, `risk:high`.
- High-risk changes require rollback notes in PRs.

## Canonical Verification Command
Run this command before claiming completion:

```bash
make verify
```

## Scope Guardrails
- Keep edits focused and avoid unrelated refactors.
- Preserve cross-platform artifact expectations (web, desktop, Android, iOS, Godot).
- Do not commit secrets, signing material, or private certificate data.

## Curation Lane
Weekly and PR-level curation should focus on UX/perf/a11y regressions and artifact integrity checks.

## Agent Queue Contract
- Intake issues via `.github/ISSUE_TEMPLATE/agent_task.yml`.
- Queue work by adding `agent:ready`.
- Queue workflow posts a task packet and notifies `@copilot`.
