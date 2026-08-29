#!/usr/bin/env bash
# auto_split_commits.sh
# Tách file thay đổi thành các commit theo nhóm, tối đa khoảng 2.000 dòng code mỗi commit.
# Tài liệu và sơ đồ được giữ nguyên trong một commit nhóm, không áp dụng hạn mức dòng.
# Chạy trên nhánh feature/restack-history-v2

set -euo pipefail

GIT_ROOT="$(git rev-parse --show-toplevel)"
cd "$GIT_ROOT"

AUTHOR_NAME="$(git config user.name)"
AUTHOR_EMAIL="$(git config user.email)"
MAX_LINES=2000
COMMIT_LOG="/tmp/new_commits.txt"
> "$COMMIT_LOG"

commit_count=0

is_unbounded_document() {
  case "$1" in
    docs/*|documentation/*|diagram/*|diagrams/*|*.md|*.mdx|*.txt|*.rst|*.adoc|*.csv|*.drawio|*.mmd|*.mermaid|*.puml)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

do_commit() {
  local subject="$1"
  git add -A -- "${files_to_add[@]}" 2>/dev/null || true
  # check if anything staged
  if git diff --cached --quiet; then
    return 0
  fi
  git commit --no-verify -m "$subject" 2>/dev/null
  commit_count=$((commit_count + 1))
  echo "$subject" >> "$COMMIT_LOG"
  echo "  ✓ commit #$commit_count: $subject"
}

commit_group() {
  local subject="$1"
  shift
  local all_files=("$@")
  files_to_add=()
  local line_sum=0

  for f in "${all_files[@]}"; do
    # Skip excluded files
    if [[ "$f" == *"commits.tsv"* ]] || [[ "$f" == *"jira"* ]] || [[ "$f" == "scripts/auto_split_commits.sh" ]]; then
      continue
    fi

    local lines=0
    if is_unbounded_document "$f"; then
      # Documentation/diagram files are grouped without the code line cap.
      lines=0
    elif [[ -f "$f" ]]; then
      lines=$(git diff HEAD -- "$f" 2>/dev/null | grep -c "^[+-]" || echo 0)
    else
      # deleted file
      lines=$(git show "HEAD:$f" 2>/dev/null | wc -l || echo 50)
    fi

    if (( line_sum + lines > MAX_LINES )) && (( ${#files_to_add[@]} > 0 )); then
      do_commit "$subject"
      files_to_add=()
      line_sum=0
    fi

    files_to_add+=("$f")
    line_sum=$((line_sum + lines))
  done

  if (( ${#files_to_add[@]} > 0 )); then
    do_commit "$subject"
  fi
}

echo "=== Bắt đầu tách commits ==="
echo "MAX_LINES per commit: $MAX_LINES"
echo ""

# ─── GROUP 1: Root config & deleted legacy ───
echo "[1/17] Root config & legacy cleanup..."
mapfile -t g1 < <(git status --short | grep -v "^??" | awk '{print $2}' | grep -E "^\.(gitignore|env|codex|clinerules)|^(AGENTS|CLAUDE|GITNEXUS).*\.md$|^\.clinerules/|\.codex$")
if (( ${#g1[@]} > 0 )); then
  commit_group "chore(repo): remove legacy agent config files" "${g1[@]}"
fi

mapfile -t g1b < <(git status --short | grep -v "^??" | awk '{print $2}' | grep -E "^(adonisrc|\.env\.example|\.gitignore)$")
if (( ${#g1b[@]} > 0 )); then
  commit_group "chore(config): update core app configuration" "${g1b[@]}"
fi

# ─── GROUP 2: CI & copilot ───
echo "[2/17] CI & github config..."
mapfile -t g2 < <(git status --short | grep -v "^??" | awk '{print $2}' | grep -E "^\.github/")
if (( ${#g2[@]} > 0 )); then
  commit_group "chore(ci): update workflow and copilot instructions" "${g2[@]}"
fi

# ─── GROUP 3: Generated types & adonisjs ───
echo "[3/17] Generated types & routes..."
mapfile -t g3 < <(git status --short | grep -v "^??" | awk '{print $2}' | grep -E "^(\.adonisjs/|types/)")
if (( ${#g3[@]} > 0 )); then
  commit_group "chore(types): regenerate route and type declarations" "${g3[@]}"
fi

mapfile -t g3b < <(git status --short | grep -v "^??" | awk '{print $2}' | grep -E "^(tsconfig|vite\.config)")
if (( ${#g3b[@]} > 0 )); then
  commit_group "chore(build): update tsconfig and vite configuration" "${g3b[@]}"
fi

# ─── GROUP 4: HTTP / Exceptions ───
echo "[4/17] HTTP exceptions layer..."
mapfile -t g4 < <(git status --short | grep -v "^??" | awk '{print $2}' | grep -E "app/modules/http/|app/modules/errors/")
if (( ${#g4[@]} > 0 )); then
  commit_group "refactor(http): align exception handling and middleware" "${g4[@]}"
fi

# ─── GROUP 5: Auth & Authorization ───
echo "[5/17] Auth & Authorization..."
mapfile -t g5a < <(git status --short | grep -v "^??" | awk '{print $2}' | grep -E "app/modules/auth/")
if (( ${#g5a[@]} > 0 )); then
  commit_group "refactor(auth): align social login and auth middleware" "${g5a[@]}"
fi

mapfile -t g5b < <(git status --short | grep -v "^??" | awk '{print $2}' | grep -E "app/modules/authorization/")
if (( ${#g5b[@]} > 0 )); then
  commit_group "refactor(authz): tighten permission middleware and checker" "${g5b[@]}"
fi

# ─── GROUP 6: Audit ───
echo "[6/17] Audit module..."
mapfile -t g6 < <(git status --short | grep -v "^??" | awk '{print $2}' | grep -E "app/modules/audit/")
if (( ${#g6[@]} > 0 )); then
  commit_group "refactor(audit): realign repository and model structure" "${g6[@]}"
fi

# ─── GROUP 7: Notifications ───
echo "[7/17] Notifications module..."
mapfile -t g7 < <(git status --short | grep -v "^??" | awk '{print $2}' | grep -E "app/modules/notifications/")
if (( ${#g7[@]} > 0 )); then
  commit_group "refactor(notifications): consolidate delivery and repository layer" "${g7[@]}"
fi

# ─── GROUP 8: Admin ───
echo "[8/17] Admin module..."
mapfile -t g8 < <(git status --short | grep -v "^??" | awk '{print $2}' | grep -E "app/modules/admin/")
if (( ${#g8[@]} > 0 )); then
  commit_group "refactor(admin): align controller and query mapping" "${g8[@]}"
fi

# ─── GROUP 9: Users ───
echo "[9/17] Users module..."
mapfile -t g9a < <(git status --short | grep -v "^??" | awk '{print $2}' | grep -E "app/modules/users/.*controller")
if (( ${#g9a[@]} > 0 )); then
  commit_group "refactor(users): normalize controller adapters" "${g9a[@]}"
fi

mapfile -t g9b < <(git status --short | grep -v "^??" | awk '{print $2}' | grep -E "app/modules/users/.*infra")
if (( ${#g9b[@]} > 0 )); then
  commit_group "refactor(users): realign infra repository boundaries" "${g9b[@]}"
fi

mapfile -t g9c < <(git status --short | grep -v "^??" | awk '{print $2}' | grep -E "app/modules/users/.*action")
if (( ${#g9c[@]} > 0 )); then
  commit_group "refactor(users): restructure action and query handlers" "${g9c[@]}"
fi

mapfile -t g9d < <(git status --short | grep -v "^??" | awk '{print $2}' | grep -E "app/modules/users/" | grep -v "controller\|infra\|action")
if (( ${#g9d[@]} > 0 )); then
  commit_group "refactor(users): clean up remaining module files" "${g9d[@]}"
fi

# ─── GROUP 10: settings & skills ───
echo "[10/17] settings / skills..."
mapfile -t g10b < <(git status --short | grep -v "^??" | awk '{print $2}' | grep -E "app/modules/settings/")
if (( ${#g10b[@]} > 0 )); then
  commit_group "refactor(settings): extract settings command handlers" "${g10b[@]}"
fi

mapfile -t g10c < <(git status --short | grep -v "^??" | awk '{print $2}' | grep -E "app/modules/skills/")
if (( ${#g10c[@]} > 0 )); then
  commit_group "refactor(skills): align skill query dependencies" "${g10c[@]}"
fi

# ─── GROUP 11: Tasks — actions ───
echo "[11/17] Tasks module — actions..."
mapfile -t g11a < <(git status --short | grep -v "^??" | awk '{print $2}' | grep -E "app/modules/tasks/actions/commands/")
if (( ${#g11a[@]} > 0 )); then
  commit_group "refactor(tasks): split task lifecycle commands" "${g11a[@]}"
fi

mapfile -t g11b < <(git status --short | grep -v "^??" | awk '{print $2}' | grep -E "app/modules/tasks/actions/queries/")
if (( ${#g11b[@]} > 0 )); then
  commit_group "refactor(tasks): split task query handlers" "${g11b[@]}"
fi

mapfile -t g11c < <(git status --short | grep -v "^??" | awk '{print $2}' | grep -E "app/modules/tasks/actions/" | grep -v "commands\|queries")
if (( ${#g11c[@]} > 0 )); then
  commit_group "refactor(tasks): align action ports and services" "${g11c[@]}"
fi

# ─── GROUP 12: Tasks — infra ───
echo "[12/17] Tasks module — infra..."
mapfile -t g12a < <(git status --short | grep -v "^??" | awk '{print $2}' | grep -E "app/modules/tasks/infra/.*(model|entity)")
if (( ${#g12a[@]} > 0 )); then
  commit_group "refactor(tasks): update ORM models and entity mapping" "${g12a[@]}"
fi

mapfile -t g12b < <(git status --short | grep -v "^??" | awk '{print $2}' | grep -E "app/modules/tasks/infra/.*repositor")
if (( ${#g12b[@]} > 0 )); then
  commit_group "refactor(tasks): realign task repository implementations" "${g12b[@]}"
fi

mapfile -t g12c < <(git status --short | grep -v "^??" | awk '{print $2}' | grep -E "app/modules/tasks/infra/" | grep -v "model\|entity\|repositor")
if (( ${#g12c[@]} > 0 )); then
  commit_group "refactor(tasks): consolidate infra layer" "${g12c[@]}"
fi

# ─── GROUP 13: Tasks — controllers ───
echo "[13/17] Tasks module — controllers..."
mapfile -t g13 < <(git status --short | grep -v "^??" | awk '{print $2}' | grep -E "app/modules/tasks/controllers/")
if (( ${#g13[@]} > 0 )); then
  commit_group "refactor(tasks): normalize task controller adapters" "${g13[@]}"
fi

mapfile -t g13b < <(git status --short | grep -v "^??" | awk '{print $2}' | grep -E "app/modules/tasks/" | grep -v "actions\|infra\|controllers")
if (( ${#g13b[@]} > 0 )); then
  commit_group "refactor(tasks): clean up domain and module boundaries" "${g13b[@]}"
fi

# ─── GROUP 14: Reviews ───
echo "[14/17] Reviews module..."
mapfile -t g14a < <(git status --short | grep -v "^??" | awk '{print $2}' | grep -E "app/modules/reviews/actions/commands/")
if (( ${#g14a[@]} > 0 )); then
  commit_group "refactor(reviews): split review command handlers" "${g14a[@]}"
fi

mapfile -t g14b < <(git status --short | grep -v "^??" | awk '{print $2}' | grep -E "app/modules/reviews/actions/queries/")
if (( ${#g14b[@]} > 0 )); then
  commit_group "refactor(reviews): restructure review query layer" "${g14b[@]}"
fi

mapfile -t g14c < <(git status --short | grep -v "^??" | awk '{print $2}' | grep -E "app/modules/reviews/infra/")
if (( ${#g14c[@]} > 0 )); then
  commit_group "refactor(reviews): realign review infra and repositories" "${g14c[@]}"
fi

mapfile -t g14d < <(git status --short | grep -v "^??" | awk '{print $2}' | grep -E "app/modules/reviews/controllers/")
if (( ${#g14d[@]} > 0 )); then
  commit_group "refactor(reviews): normalize review controller mappers" "${g14d[@]}"
fi

mapfile -t g14e < <(git status --short | grep -v "^??" | awk '{print $2}' | grep -E "app/modules/reviews/" | grep -v "actions\|infra\|controllers")
if (( ${#g14e[@]} > 0 )); then
  commit_group "refactor(reviews): clean up review domain layer" "${g14e[@]}"
fi

# ─── GROUP 15: Organizations ───
echo "[15/17] Organizations module..."
mapfile -t g15a < <(git status --short | grep -v "^??" | awk '{print $2}' | grep -E "app/modules/organizations/[^/]+/actions/")
if (( ${#g15a[@]} > 0 )); then
  commit_group "refactor(org): restructure organization action handlers" "${g15a[@]}"
fi

mapfile -t g15b < <(git status --short | grep -v "^??" | awk '{print $2}' | grep -E "app/modules/organizations/[^/]+/infra/")
if (( ${#g15b[@]} > 0 )); then
  commit_group "refactor(org): realign organization infra repositories" "${g15b[@]}"
fi

mapfile -t g15c < <(git status --short | grep -v "^??" | awk '{print $2}' | grep -E "app/modules/organizations/[^/]+/controllers/")
if (( ${#g15c[@]} > 0 )); then
  commit_group "refactor(org): normalize organization controller layer" "${g15c[@]}"
fi

mapfile -t g15d < <(git status --short | grep -v "^??" | awk '{print $2}' | grep -E "app/modules/organizations/" | grep -v "actions\|infra\|controllers")
if (( ${#g15d[@]} > 0 )); then
  commit_group "refactor(org): align middleware and domain boundaries" "${g15d[@]}"
fi

# ─── GROUP 16: Projects ───
echo "[16/17] Projects module..."
mapfile -t g16a < <(git status --short | grep -v "^??" | awk '{print $2}' | grep -E "app/modules/projects/actions/")
if (( ${#g16a[@]} > 0 )); then
  commit_group "refactor(projects): split project action dependencies" "${g16a[@]}"
fi

mapfile -t g16b < <(git status --short | grep -v "^??" | awk '{print $2}' | grep -E "app/modules/projects/(infra|controllers|domain|application)/")
if (( ${#g16b[@]} > 0 )); then
  commit_group "refactor(projects): realign project infra and controller layer" "${g16b[@]}"
fi

mapfile -t g16c < <(git status --short | grep -v "^??" | awk '{print $2}' | grep -E "app/modules/projects/" | grep -v "actions\|infra\|controllers\|domain\|application")
if (( ${#g16c[@]} > 0 )); then
  commit_group "refactor(projects): clean up project module" "${g16c[@]}"
fi

# ─── GROUP 17: Frontend / Resources — anything left ───
echo "[17/17] Frontend, resources, remaining files..."
mapfile -t g17a < <(git status --short | grep -v "^??" | awk '{print $2}' | grep -E "^resources/")
if (( ${#g17a[@]} > 0 )); then
  commit_group "refactor(ui): update frontend resources and components" "${g17a[@]}"
fi

# Catch-all: bất kỳ file nào còn lại chưa được commit
mapfile -t grest < <(git status --short | grep -v "^??" | awk '{print $2}' | grep -v "commits.tsv\|jira\|scripts/auto_split_commits.sh")
if (( ${#grest[@]} > 0 )); then
  echo "[*] Remaining ${#grest[@]} files..."
  commit_group "chore(repo): capture remaining module changes" "${grest[@]}"
fi

echo ""
echo "=== DONE ==="
echo "Total commits created: $commit_count"
echo "Commit subjects written to: $COMMIT_LOG"
cat "$COMMIT_LOG"
