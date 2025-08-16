# GitNexus — Code Intelligence (Roo Code / Cline)

## Always Do
- MUST run impact analysis before editing any symbol. Use gitnexus_impact({target: "symbolName", direction: "upstream"}).
- MUST run gitnexus_detect_changes() before committing.
- MUST warn user if impact analysis returns HIGH or CRITICAL risk.
- Use gitnexus_query({query: "concept"}) for exploration.
- Use gitnexus_context({name: "symbolName"}) for full symbol context.

## Never Do
- NEVER edit without running gitnexus_impact first.
- NEVER ignore HIGH/CRITICAL risk warnings.
- NEVER rename with find-and-replace — use gitnexus_rename.
- NEVER commit without gitnexus_detect_changes.

## CLI Fallback
If MCP unavailable: /home/tranngocduyet/Projects/GitNexus/gitnexus/dist/cli/index.js
