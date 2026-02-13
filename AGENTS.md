# promptscout Codex Integration

Use `promptscout` as a pre-search context enricher for technical requests in this repository.

## Required workflow for technical tasks

1. Run `promptscout` first with the user's request text:
   - `promptscout "<user_request>" --json-output --no-clipboard --project-dir "$PWD" 2>/dev/null | jq -r '.improved // empty'`
2. If output is empty, unchanged, or the command fails, continue with normal exploration.
3. If output contains `Context from codebase:`, treat the returned blocks (`<file_finder>`, `<section_finder>`, `<definition_finder>`, `<import_tracer>`, `<git_history>`) as search hints.
4. Prioritize those files/lines for initial reads, but always verify by inspecting real files before making changes.

## When not to run it

- Non-technical conversation.
- Pure acknowledgements (`thanks`, `ok`, etc.).

