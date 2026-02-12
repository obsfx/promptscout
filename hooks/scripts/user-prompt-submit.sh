#!/bin/bash
set -euo pipefail

# Read hook input from stdin
input=$(cat)

# Extract the user's prompt and project directory
prompt=$(echo "$input" | jq -r '.prompt // empty')
project_dir=$(echo "$input" | jq -r '.cwd // empty')

if [ -z "$prompt" ]; then
  exit 0
fi

# Check if promptscout CLI is available
if ! command -v promptscout &>/dev/null; then
  exit 0
fi

# Run promptscout with JSON output and no clipboard
# Build CLI arguments
cli_args=(--json-output --no-clipboard)
if [ -n "$project_dir" ]; then
  cli_args+=(--project-dir "$project_dir")
fi

result=$(promptscout "$prompt" "${cli_args[@]}" 2>/dev/null) || {
  # Graceful degradation: if CLI fails, let original prompt through
  exit 0
}

# Extract the final improved prompt
improved=$(echo "$result" | jq -r '.improved // empty')

if [ -z "$improved" ]; then
  exit 0
fi

# Build summary message counting results per tool
build_summary() {
  local text="$1"
  local parts=()

  local files
  files=$(echo "$text" | awk '/<file_finder/{f=1;next}/<\/file_finder>/{f=0}f && NF' | wc -l | tr -d ' ')
  [ "$files" -gt 0 ] && parts+=("${files} files")

  local sections
  sections=$(echo "$text" | awk '/<section_finder/{f=1;next}/<\/section_finder>/{f=0}f && NF' | wc -l | tr -d ' ')
  [ "$sections" -gt 0 ] && parts+=("${sections} sections")

  local defs
  defs=$(echo "$text" | awk '/<definition_finder/{f=1;next}/<\/definition_finder>/{f=0}f && NF' | wc -l | tr -d ' ')
  [ "$defs" -gt 0 ] && parts+=("${defs} definitions")

  local imports
  imports=$(echo "$text" | awk '/<import_tracer/{f=1;next}/<\/import_tracer>/{f=0}f && NF' | wc -l | tr -d ' ')
  [ "$imports" -gt 0 ] && parts+=("${imports} imports")

  local commits
  commits=$(echo "$text" | awk '/<git_history/{f=1;next}/<\/git_history>/{f=0}f && /^[0-9a-f]/' | wc -l | tr -d ' ')
  [ "$commits" -gt 0 ] && parts+=("${commits} commits")

  if [ ${#parts[@]} -eq 0 ]; then
    echo ""
    return
  fi

  local summary="promptscout: enriched context"
  for part in "${parts[@]}"; do
    summary+=" (+${part})"
  done
  echo "$summary"
}

summary=$(build_summary "$improved")

# Inject as additionalContext with optional systemMessage
if [ -n "$summary" ]; then
  cat <<HOOKEOF
{
  "systemMessage": $(printf '%s' "$summary" | jq -Rs .),
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": $(echo "$improved" | jq -Rs .)
  }
}
HOOKEOF
else
  cat <<HOOKEOF
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": $(echo "$improved" | jq -Rs .)
  }
}
HOOKEOF
fi
