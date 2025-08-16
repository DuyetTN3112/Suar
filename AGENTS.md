<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **Suar** (15415 symbols, 35251 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/Suar/context` | Codebase overview, check index freshness |
| `gitnexus://repo/Suar/clusters` | All functional areas |
| `gitnexus://repo/Suar/processes` | All execution flows |
| `gitnexus://repo/Suar/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->

<!-- caveman:start -->
# Caveman — Token Compression

Caveman makes AI coding agents respond in compressed caveman-style prose — cuts ~65-75% output tokens, full technical accuracy. Ships as Claude Code skills, agents, and commands.

## Always Do

- **MUST use caveman style for all responses when activated.** Drop articles, filler, pleasantries, hedging. Fragments OK. Technical terms exact. Code blocks unchanged.
- **MUST persist caveman mode across the entire session.** No filler drift. Still active after many turns. Off only: "stop caveman" / "normal mode".
- **MUST use cavecrew subagents for delegation when token efficiency matters.** `cavecrew-investigator` for locate, `cavecrew-builder` for 1-2 file edits, `cavecrew-reviewer` for diff review. Output is ~60% smaller than vanilla.
- **MUST drop caveman for security warnings, irreversible action confirmations, and when user is confused.** Resume after the clear part.

## Never Do

- NEVER use filler words (just, really, basically, actually, simply) in caveman mode.
- NEVER wrap caveman output in unnecessary prose or pleasantries.
- NEVER edit code or write commits in caveman style — code/commits/PRs stay normal.
- NEVER use `cavecrew-builder` for 3+ file scope — it will refuse. Use main thread.

## Intensity Levels

| Level | Trigger | What |
|-------|---------|------|
| **lite** | `/caveman lite` | Drop filler. Keep sentence structure. |
| **full** | `/caveman` | Drop articles, fragments OK. Default. |
| **ultra** | `/caveman ultra` | Extreme compression. Bare fragments. |
| **wenyan** | `/caveman wenyan` | Classical Chinese. Maximum terseness. |

## Skills

| Skill | Trigger | What |
|-------|---------|------|
| `caveman` | `/caveman [level]` | Compress every reply. Levels stick until session end. |
| `caveman-commit` | `/caveman-commit` | Conventional Commit messages, ≤50 char subject. Why over what. |
| `caveman-review` | `/caveman-review` | One-line PR comments: `L42: 🔴 bug: user null. Add guard.` |
| `caveman-compress` | `/caveman-compress <file>` | Rewrite memory file into caveman-speak. Cuts ~46% input tokens. |
| `caveman-help` | `/caveman-help` | Quick-reference card. One-shot display. |
| `caveman-stats` | `/caveman-stats` | Session token usage + lifetime savings. |
| `cavecrew` | "delegate to subagent" | Decision guide for caveman subagents. |

## Subagents

| Agent | Model | Use for |
|-------|-------|---------|
| `cavecrew-investigator` | haiku | Locate code. Read-only. `path:line — symbol — note`. |
| `cavecrew-builder` | default | Surgical 1-2 file edit. Refuses 3+ files. |
| `cavecrew-reviewer` | haiku | Diff/file review. One-line findings with severity emoji. |

## Resources

- Skills: `.claude/skills/caveman*/SKILL.md`
- Agents: `.claude/agents/cavecrew-*.md`
- Commands: `.claude/commands/caveman*.toml`
- Rules: `.claude/rules/caveman-activate.md`
- Compress scripts: `.claude/skills/caveman-compress/scripts/`
- Upstream: https://github.com/JuliusBrussee/caveman

<!-- caveman:end -->
