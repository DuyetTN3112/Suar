# RTK — Token Killer (Roo Code / Cline)

## Rule
Always prefix shell commands with `rtk` to reduce output tokens.

## Common Commands
```bash
rtk git status
rtk git diff
rtk npm run typecheck
rtk npm run lint
rtk npm run test:unit
rtk tsc --noEmit
rtk grep "pattern" app
rtk find "*.ts" app
rtk read path/to/file.ts
```

## Meta
```bash
rtk gain           # Token savings analytics
rtk proxy <cmd>    # Run raw command without filtering
rtk --version      # Verify installed
```

## Binary
~/.local/bin/rtk (rtk 0.34.3)
