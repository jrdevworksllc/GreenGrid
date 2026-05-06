# GreenGrid Autonomous Task Queue

This repository supports an OpenClaw-driven issue queue.

## Queue Labels

- `ready`: Task is approved for autonomous execution.
- `in_progress`: Task currently being worked by the agent.
- `blocked`: Agent cannot proceed without human input.
- `review`: PR is open and awaiting human review.
- `done`: Work merged and complete.
- `agent-safe`: Low-risk task (safe for autonomous execution).
- `agent-high-risk`: Requires explicit approval before merge/deploy.

## Issue Contract

Each executable issue should include:

1. Goal
2. Scope
3. Acceptance Criteria (checkboxes)
4. Test Plan
5. Risk Notes (optional)

## Agent Loop

1. Pick the oldest issue labeled `ready` and `agent-safe`.
2. Move it to `in_progress`.
3. Create branch: `issue-<number>-<slug>`.
4. Implement changes and run checks.
5. Open PR referencing the issue.
6. Set issue label to `review`.
7. If blocked, set label to `blocked` with clear blocker comment.

## Human Control

- Human decides what gets `ready`.
- Human approves PR merge.
- Human approves deploys and any `agent-high-risk` changes.
