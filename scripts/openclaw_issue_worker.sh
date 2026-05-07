#!/usr/bin/env bash
set -euo pipefail

# Autonomous issue worker for OpenClaw queue.
# Flow: pick issue -> implement -> validate -> commit/push -> open PR -> relabel.

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

api_get() {
  curl -sS \
    -H "Authorization: Bearer $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github+json" \
    "$1"
}

api_send() {
  local method="$1"
  local url="$2"
  local body="${3:-}"
  if [[ -n "$body" ]]; then
    curl -sS -X "$method" \
      -H "Authorization: Bearer $GITHUB_TOKEN" \
      -H "Accept: application/vnd.github+json" \
      -H "Content-Type: application/json" \
      "$url" \
      -d "$body"
  else
    curl -sS -X "$method" \
      -H "Authorization: Bearer $GITHUB_TOKEN" \
      -H "Accept: application/vnd.github+json" \
      "$url"
  fi
}

ensure_repo() {
  if [[ ! -d "$WORKDIR/.git" ]]; then
    mkdir -p "$(dirname "$WORKDIR")"
    git clone "https://x-access-token:$GITHUB_TOKEN@github.com/$REPO.git" "$WORKDIR"
  fi
}

set_issue_labels() {
  local issue_number="$1"
  local issue_json="$2"
  local target_state="$3"

  python3 - "$issue_json" "$target_state" <<'PY'
import json, sys
issue = json.loads(sys.argv[1])
target = sys.argv[2]
current = [l["name"] for l in issue.get("labels", [])]
base = [x for x in current if x not in {"ready", "in_progress", "review", "done", "blocked"}]
if target == "in_progress":
    base.append("in_progress")
elif target == "review":
    base.append("review")
elif target == "blocked":
    base.append("blocked")
elif target == "done":
    base.append("done")
print(json.dumps({"labels": sorted(set(base))}))
PY
}

run_checks() {
  echo "Running backend tests..."
  (cd "$WORKDIR/backend-api" && chmod +x gradlew && ./gradlew test --no-daemon)
  echo "Running frontend lint/build..."
  (cd "$WORKDIR/frontend-web" && rm -rf node_modules && npm ci && npm run lint && npm run build)
}

issue_json="$(api_get "https://api.github.com/repos/$REPO/issues?state=open&labels=ready,agent-safe&sort=created&direction=asc&per_page=1")"
issue_number="$(echo "$issue_json" | python3 -c 'import sys, json; d=json.load(sys.stdin); print(d[0]["number"] if d else "")')"

if [[ -z "$issue_number" ]]; then
  echo "No ready tasks"
  exit 0
fi

issue_one="$(echo "$issue_json" | python3 -c 'import sys, json; d=json.load(sys.stdin); print(json.dumps(d[0]))')"
title="$(echo "$issue_one" | python3 -c 'import sys, json; print(json.load(sys.stdin)["title"])')"
issue_url="$(echo "$issue_one" | python3 -c 'import sys, json; print(json.load(sys.stdin)["html_url"])')"
slug="$(echo "$title" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-' | sed 's/^-//;s/-$//')"
branch="issue-${issue_number}-${slug:0:32}"

echo "Processing issue #$issue_number -> $branch"

in_progress_payload="$(set_issue_labels "$issue_number" "$issue_one" "in_progress")"
api_send PATCH "https://api.github.com/repos/$REPO/issues/$issue_number" "$in_progress_payload" >/dev/null

ensure_repo
cd "$WORKDIR"
git fetch origin
git checkout main
git pull --ff-only origin main
git checkout -B "$branch"
git config user.name "${GIT_AUTHOR_NAME:-OpenClaw Worker}"
git config user.email "${GIT_AUTHOR_EMAIL:-openclaw-worker@users.noreply.github.com}"

issue_body="$(api_get "https://api.github.com/repos/$REPO/issues/$issue_number" | python3 -c 'import sys, json; print(json.load(sys.stdin).get("body",""))')"
prompt="You are working in the GreenGrid repo. Implement GitHub issue #$issue_number.

Issue title: $title

Issue body:
$issue_body

Requirements:
- Make minimal safe changes.
- Add or update unit tests for affected behavior.
- Keep implementation focused and production-safe.
- After coding, stop and let the outer automation run checks."

set +e
"$OPENCLAW_BIN" agent --local --agent main --message "$prompt"
agent_exit=$?
set -e

if [[ $agent_exit -ne 0 ]]; then
  block_msg="$(python3 - <<'PY'
import json
print(json.dumps({"body":"OpenClaw agent run failed before code validation. Please inspect worker logs and rerun."}))
PY
)"
  api_send POST "https://api.github.com/repos/$REPO/issues/$issue_number/comments" "$block_msg" >/dev/null
  blocked_payload="$(set_issue_labels "$issue_number" "$issue_one" "blocked")"
  api_send PATCH "https://api.github.com/repos/$REPO/issues/$issue_number" "$blocked_payload" >/dev/null
  exit 1
fi

if [[ -z "$(git status --porcelain)" ]]; then
  nochange_msg="$(python3 - <<'PY'
import json
print(json.dumps({"body":"Worker run completed with no code changes. Task remains ready for manual follow-up."}))
PY
)"
  api_send POST "https://api.github.com/repos/$REPO/issues/$issue_number/comments" "$nochange_msg" >/dev/null
  ready_payload="$(python3 - <<'PY'
import json
print(json.dumps({"labels":["ready","agent-safe"]}))
PY
)"
  api_send PATCH "https://api.github.com/repos/$REPO/issues/$issue_number" "$ready_payload" >/dev/null
  exit 0
fi

set +e
run_checks
check_exit=$?
set -e

if [[ $check_exit -ne 0 ]]; then
  fail_msg="$(python3 - <<'PY'
import json
print(json.dumps({"body":"Automated checks failed (`backend-api` tests or `frontend-web` lint/build). Worker stopped and marked this issue as blocked for follow-up."}))
PY
)"
  api_send POST "https://api.github.com/repos/$REPO/issues/$issue_number/comments" "$fail_msg" >/dev/null
  blocked_payload="$(set_issue_labels "$issue_number" "$issue_one" "blocked")"
  api_send PATCH "https://api.github.com/repos/$REPO/issues/$issue_number" "$blocked_payload" >/dev/null
  exit 1
fi

git add -A
commit_message="Implement issue #$issue_number: $title"
git commit -m "$commit_message"
git push -u origin "$branch"

pr_body="$(ISSUE_NUMBER="$issue_number" ISSUE_TITLE="$title" BRANCH="$branch" python3 - <<'PY'
import json
body = """## Summary
- Implements #{} ({})
- Includes automated checks: backend tests + frontend lint/build

## Validation
- backend-api: `./gradlew test --no-daemon`
- frontend-web: `npm run lint && npm run build`
""".format(__import__("os").environ["ISSUE_NUMBER"], __import__("os").environ["ISSUE_TITLE"])
e = __import__("os").environ
print(json.dumps({"title": f"[MVP1] #{e['ISSUE_NUMBER']} {e['ISSUE_TITLE']}", "head": e["BRANCH"], "base": "main", "body": body}))
PY
)"
pr_response="$(api_send POST "https://api.github.com/repos/$REPO/pulls" "$pr_body")"
pr_url="$(echo "$pr_response" | python3 -c 'import sys, json; d=json.load(sys.stdin); print(d.get("html_url",""))')"

review_payload="$(set_issue_labels "$issue_number" "$issue_one" "review")"
api_send PATCH "https://api.github.com/repos/$REPO/issues/$issue_number" "$review_payload" >/dev/null

review_msg="$(PR_URL="$pr_url" python3 - <<'PY'
import json
import os
url = os.environ.get("PR_URL", "").strip()
body = f"Autonomous worker completed implementation and opened PR: {url}" if url else "Autonomous worker completed implementation and pushed branch, but PR creation response was empty."
print(json.dumps({"body": body}))
PY
)"
api_send POST "https://api.github.com/repos/$REPO/issues/$issue_number/comments" "$review_msg" >/dev/null

echo "Worker complete: issue #$issue_number -> branch $branch -> PR $pr_url"
