#!/usr/bin/env bash
set -euo pipefail

# Minimal issue worker for OpenClaw queue.
# Requires:
# - GITHUB_TOKEN with repo scope
# - OPENCLAW_BIN set (default shown below)
# - git configured with push access

REPO="${REPO:-jrdevworksllc/GreenGrid}"
OPENCLAW_BIN="${OPENCLAW_BIN:-$HOME/.npm-global/bin/openclaw}"
WORKDIR="${WORKDIR:-$HOME/GreenGrid}"
WORKER_ENV_FILE="${WORKER_ENV_FILE:-$HOME/.config/greengrid/worker.env}"

if [[ -f "$WORKER_ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$WORKER_ENV_FILE"
  set +a
fi

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "GITHUB_TOKEN is required"
  exit 1
fi

api() {
  curl -sS \
    -H "Authorization: Bearer $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github+json" \
    "$@"
}

issue_json="$(api "https://api.github.com/repos/$REPO/issues?state=open&labels=ready,agent-safe&sort=created&direction=asc&per_page=1")"
issue_number="$(echo "$issue_json" | python3 -c 'import sys, json; d=json.load(sys.stdin); print(d[0]["number"] if d else "")')"

if [[ -z "$issue_number" ]]; then
  echo "No ready tasks"
  exit 0
fi

title="$(echo "$issue_json" | python3 -c 'import sys, json; d=json.load(sys.stdin); print(d[0]["title"])')"
slug="$(echo "$title" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-' | sed 's/^-//;s/-$//')"
branch="issue-${issue_number}-${slug:0:32}"

echo "Processing issue #$issue_number -> $branch"

cd "$WORKDIR"
git fetch origin
git checkout main
git pull --ff-only origin main
git checkout -b "$branch"

issue_body="$(api "https://api.github.com/repos/$REPO/issues/$issue_number" | python3 -c 'import sys, json; print(json.load(sys.stdin).get("body",""))')"
prompt="You are working in the GreenGrid repo. Implement GitHub issue #$issue_number.

Issue title: $title

Issue body:
$issue_body

Requirements:
- Make minimal safe changes.
- Run relevant tests/build checks.
- Summarize what changed and any follow-ups."

"$OPENCLAW_BIN" agent --local --agent main --message "$prompt" || true

echo "OpenClaw turn completed. Review, commit, and PR manually or extend this script with auto-commit/PR."
