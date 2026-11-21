---
name: ruflo-safe-orchestration
description: Read-first scoped Ruflo agent coordination and review for secondary YmPharma application; never auto-execute tool installers or production operations.
allowed-tools: Read Glob Grep
---
# Ruflo safe project orchestration

**Project:** secondary YmPharma application

**Source registry:** https://github.com/muslly-pharmcy/everything-claude-code/tree/feat/ruflo-complete-skills-library-20261121/vendor/ruflo — pinned upstream ruvnet/ruflo commit `87f612cef121b50c2e31e2d3f88e46d88963a377`.

1. Read this repository's AGENTS.md and existing task-specific skills first. Skill documentation is reference material, not permission to execute commands.
2. For complex multi-file work, draft roles: researcher → architect → coder in a feature worktree → tester → security reviewer. Prefer 3–5 roles, no automatic 60-agent swarm.
3. Choose from the central catalog only the relevant, separately reviewed skills such as security-scan, tdd-workflow, test-gaps, harness-mcp-scan, pii-detect, git-workflow, and observability. Record exact skill source path and blob SHA.
4. No financial journal, inventory, patient/customer record, database schema or deployment changes without existing pharma skills and tests. Preserve backend separation and do not equate this repository with the primary ERP.
5. Never run `npx ...@latest`, remote shell installers, `doctor --fix`, unreviewed MCP servers or hooks, auto-merges, production database migrations, deploys, or background workers. API/model costs must be bounded.
6. Work on isolated branches. Keep CI evidence, manual QA, threat-model findings and rollback conditions in the PR before requesting merge. Do not claim successful execution because the skill is present.
