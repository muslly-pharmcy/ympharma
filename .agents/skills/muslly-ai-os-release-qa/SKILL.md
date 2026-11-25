---
name: muslly-ai-os-release-qa
description: Audit AI OS agent orchestration, medical safety, RTL, database access and mobile release readiness.
---

# muslly-ai-os-release-qa

Verified React/Vite, Supabase, Sentry, Playwright, Vitest and Capacitor in package.json. Reuse existing skills and runner; inspect lockfile and env first. Run test, lint, build and test:e2e only against isolated fixtures; check Sentry without exporting PHI. Use OpenAI developer docs for agent APIs, security threat modeling for tool authorization, and Playwright for agent UI, Arabic RTL and permission boundaries. Test prompt injection resistance and human review for medical outputs. Use Capacitor for existing mobile path; no Expo replacement. Never use real patient records.

## Execution contract
Read repo instructions and existing skills first. Prefer tools already installed; external plugins are candidates until connected and approved. Keep implementation and independent QA separate. Record exact commands, results, commit SHA, blockers and rollback. No production deploy, live writes or secret transfer. Source reference: https://github.com/openai/plugins. This is an original repo-specific skill, not a copy or proof of upstream plugin installation.
