# Caveman Usage For Suar

## Scope

This file documents how to use Caveman for this repository.

Caveman is a token compression system that makes AI coding agents respond in
compressed caveman-style prose — cuts ~65-75% output tokens while keeping full
technical accuracy.

## What Lives Where

```
Suar/
├── AGENTS.md                          # Project rules (GitNexus + Caveman)
├── CLAUDE.md                          # Same as AGENTS.md
├── CAVEMAN_USAGE.md                   # This file
│
├── .claude/
│   ├── skills/
│   │   ├── caveman/SKILL.md           # Core caveman behavior
│   │   ├── caveman-commit/SKILL.md    # Terse commit messages
│   │   ├── caveman-review/SKILL.md    # One-line PR comments
│   │   ├── caveman-compress/SKILL.md  # Compress memory files
│   │   │   └── scripts/               # Python compression scripts
│   │   ├── caveman-help/SKILL.md      # Reference card
│   │   ├── caveman-stats/SKILL.md     # Token savings stats
│   │   └── cavecrew/SKILL.md          # Subagent decision guide
│   │
│   ├── agents/
│   │   ├── cavecrew-investigator.md   # Read-only code locator (haiku)
│   │   ├── cavecrew-builder.md        # Surgical 1-2 file edit
│   │   └── cavecrew-reviewer.md       # Diff/file reviewer (haiku)
│   │
│   ├── commands/
│   │   ├── caveman.toml               # /caveman [level]
│   │   ├── caveman-commit.toml        # /caveman-commit
│   │   ├── caveman-review.toml        # /caveman-review
│   │   ├── caveman-compress.toml      # /caveman-compress <file>
│   │   ├── caveman-help.toml          # /caveman-help
│   │   └── caveman-stats.toml         # /caveman-stats
│   │
│   └── rules/
│       └── caveman-activate.md        # Always-on activation rule
│
└── (other skills: gitnexus, frontend-design, ui-ux-pro-max, etc.)

~/.codex/AGENTS.md                     # Global Codex config (references all skills)
```

## Activation

Caveman is **active by default** for all sessions reading `~/.codex/AGENTS.md`
or `AGENTS.md` / `CLAUDE.md` in this project.

### Intensity Levels

| Level | Command | What |
|-------|---------|------|
| **full** (default) | `/caveman` | Drop articles, fragments OK |
| **lite** | `/caveman lite` | Drop filler only, keep sentences |
| **ultra** | `/caveman ultra` | Extreme compression, bare fragments |
| **wenyan** | `/caveman wenyan` | Classical Chinese |

### Deactivate

Say "stop caveman" or "normal mode". Resume with `/caveman`.

## Skills Usage

When user requests a task matching any skill, read and follow the corresponding
SKILL.md from `.claude/skills/<name>/SKILL.md`.

### Key Skills

| Skill | When to Use | File |
|-------|-------------|------|
| **caveman** | Always active — compress output | `.claude/skills/caveman/SKILL.md` |
| **caveman-commit** | Write commit messages | `.claude/skills/caveman-commit/SKILL.md` |
| **caveman-review** | Code review / PR comments | `.claude/skills/caveman-review/SKILL.md` |
| **caveman-compress** | Compress CLAUDE.md or memory files | `.claude/skills/caveman-compress/SKILL.md` |
| **frontend-design** | Create frontend interfaces | `.claude/skills/frontend-design/SKILL.md` |
| **ui-ux-pro-max** | UI/UX design intelligence | `.claude/skills/ui-ux-pro-max/SKILL.md` |
| **canvas-design** | Visual art in .png/.pdf | `.claude/skills/canvas-design/SKILL.md` |
| **docx** | Word documents | `.claude/skills/docx/SKILL.md` |
| **xlsx** | Spreadsheets | `.claude/skills/xlsx/SKILL.md` |
| **pptx** | PowerPoint presentations | `.claude/skills/pptx/SKILL.md` |
| **pdf** | PDF manipulation | `.claude/skills/pdf/SKILL.md` |
| **webapp-testing** | Test web apps with Playwright | `.claude/skills/webapp-testing/SKILL.md` |
| **mcp-builder** | Create MCP servers | `.claude/skills/mcp-builder/SKILL.md` |
| **gitnexus-*** | Code intelligence (5 skills) | `.claude/skills/gitnexus/*/SKILL.md` |

## Subagents (Cavecrew)

Use cavecrew subagents for delegation when token efficiency matters.

| Agent | Model | Use for | Output format |
|-------|-------|---------|---------------|
| `cavecrew-investigator` | haiku | Locate code (read-only) | `path:line — symbol — note` |
| `cavecrew-builder` | default | Surgical 1-2 file edit | `path:line-range — change` |
| `cavecrew-reviewer` | haiku | Diff/file review | `path:line: 🔴 bug: problem. fix.` |

### Chaining Pattern (Locate → Fix → Verify)
1. `cavecrew-investigator` returns site list
2. Pick 1-2 sites, hand to `cavecrew-builder`
3. `cavecrew-reviewer` audits the diff

### Refusals
- `cavecrew-builder` refuses 3+ file scope → use main thread
- `cavecrew-investigator` refuses to fix → spawn builder
- `cavecrew-reviewer` returns findings only, no architecture opinions

## Compress Script

Compress natural language files to caveman format (saves ~46% input tokens):

```bash
cd /home/tranngocduyet/Projects/Suar/.claude/skills/caveman-compress
python3 -m scripts /path/to/file.md
```

- Original saved as `<filename>.original.md`
- Only compresses .md, .txt, .rst, .typ, .tex
- Never touches code/config files
- Requires Python 3.10+

## Benchmarks

| Metric | Value |
|--------|-------|
| Output token reduction | ~65-75% |
| Input token reduction (compress) | ~46% |
| Subagent output reduction | ~60% |
| Technical accuracy | 100% |

## Rules Summary

### Always
- Use caveman style for all responses when activated
- Persist caveman mode across entire session
- Use cavecrew subagents for delegation when token efficiency matters
- Drop caveman for security warnings, irreversible actions, user confused

### Never
- Use filler words (just, really, basically, actually, simply) in caveman mode
- Wrap caveman output in unnecessary prose or pleasantries
- Edit code or write commits in caveman style
- Use `cavecrew-builder` for 3+ file scope

## Upstream

- Repo: https://github.com/JuliusBrussee/caveman
- Skills: `.claude/skills/caveman*/`
- Global config: `~/.codex/AGENTS.md`
