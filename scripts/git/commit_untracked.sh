#!/usr/bin/env bash
# commit_untracked.sh — commit all untracked files in logical groups

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

COMMIT_LOG="/tmp/new_commits_untracked.txt"
> "$COMMIT_LOG"
count=0

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
  local subject="$1"; shift
  local files=("$@")
  # filter non-existent entries
  local valid=()
  for f in "${files[@]}"; do
    [ -e "$f" ] && valid+=("$f")
  done
  [ ${#valid[@]} -eq 0 ] && return 0
  git add -- "${valid[@]}" 2>/dev/null || true
  git diff --cached --quiet && return 0
  git commit --no-verify -m "$subject" 2>/dev/null
  count=$((count+1))
  echo "$subject" >> "$COMMIT_LOG"
  echo "  ✓ #$count $subject"
}

batch_commit() {
  # Commit files from a list file in batches of ~2,000 code lines.
  local subject="$1"
  local list_file="$2"
  local batch=()
  local lines=0
  local batch_num=0

  while IFS= read -r f; do
    f="${f%/}"  # strip trailing slash for directories
    if [ -z "$f" ] || [[ "$f" == *"commits."* ]] || [[ "$f" == *"jira"* ]] || \
       [[ "$f" == *"scripts/auto_split"* ]] || [[ "$f" == *"scripts/generate_commits"* ]] || \
       [[ "$f" == *"scripts/commit_untracked"* ]] || [[ "$f" == "node_modules"* ]]; then
      continue
    fi

    local sz=0
    if is_unbounded_document "$f"; then
      sz=0
    elif [ -d "$f" ]; then
      sz=$(find "$f" -type f -print0 | xargs -0 wc -l 2>/dev/null | tail -n 1 | awk '{print $1}')
      sz=${sz:-0}
    elif [ -f "$f" ]; then
      sz=$(wc -l < "$f" 2>/dev/null || echo 30)
    fi

    if (( lines + sz > 2000 )) && (( ${#batch[@]} > 0 )); then
      batch_num=$((batch_num+1))
      local s="$subject"
      [ $batch_num -gt 1 ] && s="$subject (part $batch_num)"
      do_commit "$s" "${batch[@]}"
      batch=()
      lines=0
    fi
    batch+=("$f")
    lines=$((lines + sz))
  done < "$list_file"

  if (( ${#batch[@]} > 0 )); then
    batch_num=$((batch_num+1))
    local s="$subject"
    [ $batch_num -gt 1 ] && s="$subject (part $batch_num)"
    do_commit "$s" "${batch[@]}"
  fi
}

# Use Git's file-level untracked listing; `git status --short` collapses whole
# directories and can leave nested files uncaptured by the grouping pass.
ULIST=/tmp/untracked_to_add.txt
git ls-files --others --exclude-standard > "$ULIST"

# ─── contracts / api v1 ───
grep -E "^app/contracts/|^app/modules/http/api_v1/|^app/modules/http/controllers/" "$ULIST" > /tmp/g_contracts.txt || true
[ -s /tmp/g_contracts.txt ] && batch_commit "feat(api): add v1 contract definitions and controllers" /tmp/g_contracts.txt

# ─── storybook ───
grep "^\.storybook/" "$ULIST" > /tmp/g_storybook.txt || true
[ -s /tmp/g_storybook.txt ] && do_commit "chore(storybook): add Storybook configuration" "$(cat /tmp/g_storybook.txt | tr '\n' ' ')"

# ─── CI ───
grep "^\.github/workflows/test" "$ULIST" > /tmp/g_ci.txt || true
[ -s /tmp/g_ci.txt ] && do_commit "chore(ci): add test workflow" .github/workflows/test.yml

# ─── vitest ───
grep "^vitest\." "$ULIST" > /tmp/g_vt.txt || true
[ -s /tmp/g_vt.txt ] && batch_commit "chore(test): add vitest configuration" /tmp/g_vt.txt

# ─── auth domain ───
grep "^app/modules/auth/" "$ULIST" > /tmp/g_auth.txt || true
[ -s /tmp/g_auth.txt ] && batch_commit "feat(auth): add auth domain and middleware layer" /tmp/g_auth.txt

# ─── authorization infra ───
grep "^app/modules/authorization/" "$ULIST" > /tmp/g_authz.txt || true
[ -s /tmp/g_authz.txt ] && batch_commit "feat(authz): add authorization infra and contracts" /tmp/g_authz.txt

# ─── errors infra ───
grep "^app/modules/errors/" "$ULIST" > /tmp/g_errors.txt || true
[ -s /tmp/g_errors.txt ] && batch_commit "feat(errors): add error infra and event contracts" /tmp/g_errors.txt

# ─── events module ───
grep "^app/modules/events/" "$ULIST" > /tmp/g_events.txt || true
[ -s /tmp/g_events.txt ] && batch_commit "feat(events): add event dispatcher module" /tmp/g_events.txt

# ─── http new files ───
grep "^app/modules/http/" "$ULIST" > /tmp/g_http.txt || true
[ -s /tmp/g_http.txt ] && batch_commit "feat(http): add request context middleware and exception types" /tmp/g_http.txt

# ─── audit new ───
grep "^app/modules/audit/" "$ULIST" > /tmp/g_audit.txt || true
[ -s /tmp/g_audit.txt ] && batch_commit "feat(audit): add postgres audit log repository" /tmp/g_audit.txt

# ─── admin disputes ───
grep "^app/modules/admin/disputes/controllers/" "$ULIST" > /tmp/g_disputes.txt || true
[ -s /tmp/g_disputes.txt ] && batch_commit "feat(admin): add dispute management controllers" /tmp/g_disputes.txt

# ─── notifications new ───
grep "^app/modules/notifications/" "$ULIST" > /tmp/g_notif.txt || true
[ -s /tmp/g_notif.txt ] && batch_commit "feat(notifications): add v1 controllers and adapters" /tmp/g_notif.txt

# ─── organizations new controllers ───
grep "^app/modules/organizations/" "$ULIST" > /tmp/g_org.txt || true
[ -s /tmp/g_org.txt ] && batch_commit "feat(org): add missing organization controller endpoints" /tmp/g_org.txt

# ─── projects new ───
grep "^app/modules/projects/" "$ULIST" > /tmp/g_proj.txt || true
[ -s /tmp/g_proj.txt ] && batch_commit "feat(projects): add staffing candidate queries and controllers" /tmp/g_proj.txt

# ─── reviews disputes & new ───
grep "^app/modules/reviews/actions/commands/.*dispute\|^app/modules/reviews/actions/commands/process_ai\|^app/modules/reviews/actions/commands/build_review" "$ULIST" > /tmp/g_rev_disputes.txt || true
[ -s /tmp/g_rev_disputes.txt ] && batch_commit "feat(reviews): add dispute command layer" /tmp/g_rev_disputes.txt

grep "^app/modules/reviews/controllers/.*dispute\|^app/modules/reviews/controllers/build_review\|^app/modules/reviews/controllers/create_review_dispute\|^app/modules/reviews/controllers/list.*dispute\|^app/modules/reviews/controllers/resolve.*dispute\|^app/modules/reviews/controllers/respond\|^app/modules/reviews/controllers/show.*dispute\|^app/modules/reviews/controllers/start_ai" "$ULIST" > /tmp/g_rev_ctrl.txt || true
[ -s /tmp/g_rev_ctrl.txt ] && batch_commit "feat(reviews): add dispute controller endpoints" /tmp/g_rev_ctrl.txt

grep "^app/modules/reviews/controllers/create_reverse\|^app/modules/reviews/controllers/list_admin_review\|^app/modules/reviews/controllers/list_ai\|^app/modules/reviews/controllers/list_reverse\|^app/modules/reviews/controllers/show_reverse" "$ULIST" > /tmp/g_rev_ctrl2.txt || true
[ -s /tmp/g_rev_ctrl2.txt ] && batch_commit "feat(reviews): add reverse review controllers" /tmp/g_rev_ctrl2.txt

grep "^app/modules/reviews/domain/\|^app/modules/reviews/validators/" "$ULIST" > /tmp/g_rev_domain.txt || true
[ -s /tmp/g_rev_domain.txt ] && batch_commit "feat(reviews): add dispute domain rules and validators" /tmp/g_rev_domain.txt

# ─── settings new ───
grep "^app/modules/settings/" "$ULIST" > /tmp/g_settings.txt || true
[ -s /tmp/g_settings.txt ] && batch_commit "feat(settings): add settings v1 controllers and infra" /tmp/g_settings.txt

# ─── skills new ───
grep "^app/modules/skills/" "$ULIST" > /tmp/g_skills.txt || true
[ -s /tmp/g_skills.txt ] && batch_commit "feat(skills): add proficiency, rubric, and role skill models" /tmp/g_skills.txt

# ─── tasks new ───
grep "^app/modules/tasks/actions/commands/.*submission\|^app/modules/tasks/actions/commands/.*attachment\|^app/modules/tasks/actions/commands/.*comment\|^app/modules/tasks/actions/commands/.*snapshot\|^app/modules/tasks/actions/commands/.*completion" "$ULIST" > /tmp/g_tasks_cmd.txt || true
[ -s /tmp/g_tasks_cmd.txt ] && batch_commit "feat(tasks): add submission, attachment and comment commands" /tmp/g_tasks_cmd.txt

grep "^app/modules/tasks/actions/queries/\|^app/modules/tasks/actions/services/\|^app/modules/tasks/actions/support/\|^app/modules/tasks/domain/\|^app/modules/tasks/validators/" "$ULIST" > /tmp/g_tasks_misc.txt || true
[ -s /tmp/g_tasks_misc.txt ] && batch_commit "feat(tasks): add match scoring, submission rules and validators" /tmp/g_tasks_misc.txt

grep "^app/modules/tasks/infra/models/\|^app/modules/tasks/infra/repositories/\|^app/modules/tasks/controllers/" "$ULIST" > /tmp/g_tasks_infra.txt || true
[ -s /tmp/g_tasks_infra.txt ] && batch_commit "feat(tasks): add submission infra models and v1 controllers" /tmp/g_tasks_infra.txt

# ─── users new ───
grep "^app/modules/users/" "$ULIST" > /tmp/g_users.txt || true
[ -s /tmp/g_users.txt ] && batch_commit "feat(users): add recruiter bookmarks and talent directory" /tmp/g_users.txt

# ─── seed ───
grep "^app/seed/" "$ULIST" > /tmp/g_seed.txt || true
[ -s /tmp/g_seed.txt ] && batch_commit "chore(seed): add dispute seeder fixtures" /tmp/g_seed.txt

# ─── commands dir ───
grep "^commands/" "$ULIST" > /tmp/g_cmds.txt || true
[ -s /tmp/g_cmds.txt ] && batch_commit "chore(tooling): add CLI trigger commands" /tmp/g_cmds.txt

# ─── inertia frontend new ───
grep "^inertia/components/" "$ULIST" > /tmp/g_ui_comp.txt || true
[ -s /tmp/g_ui_comp.txt ] && batch_commit "feat(ui): add new shared UI components" /tmp/g_ui_comp.txt

grep "^inertia/pages/admin/disputes/\|^inertia/pages/admin/reviews/" "$ULIST" > /tmp/g_ui_admin.txt || true
[ -s /tmp/g_ui_admin.txt ] && batch_commit "feat(admin-ui): add dispute and reverse review admin pages" /tmp/g_ui_admin.txt

grep "^inertia/pages/marketplace/\|^inertia/pages/org/\|^inertia/pages/profile/" "$ULIST" > /tmp/g_ui_pages.txt || true
[ -s /tmp/g_ui_pages.txt ] && batch_commit "feat(ui): add marketplace, org and profile pages" /tmp/g_ui_pages.txt

grep "^inertia/pages/projects/\|^inertia/pages/reviews/\|^inertia/pages/tasks/" "$ULIST" > /tmp/g_ui_pages2.txt || true
[ -s /tmp/g_ui_pages2.txt ] && batch_commit "feat(ui): add project, review and task page components" /tmp/g_ui_pages2.txt

# ─── routes ───
grep "^start/routes/" "$ULIST" > /tmp/g_routes.txt || true
[ -s /tmp/g_routes.txt ] && batch_commit "feat(routes): add api v1 and skills route files" /tmp/g_routes.txt

# ─── tests new ───
grep "^tests/" "$ULIST" > /tmp/g_tests.txt || true
[ -s /tmp/g_tests.txt ] && batch_commit "test(suite): add new integration and e2e test suites" /tmp/g_tests.txt

# ─── scripts ───
grep "^scripts/" "$ULIST" > /tmp/g_scripts.txt || true
[ -s /tmp/g_scripts.txt ] && batch_commit "chore(scripts): add build and test helper scripts" /tmp/g_scripts.txt

# ─── catch remaining untracked ───
git ls-files --others --exclude-standard | grep -v "commits\.\|jira\|scripts/auto_split\|scripts/generate_commits\|scripts/commit_untracked\|node_modules\|\.gemini\|brain/" > /tmp/g_rest.txt || true
if [ -s /tmp/g_rest.txt ]; then
  batch_commit "chore(repo): add remaining untracked module files" /tmp/g_rest.txt
fi

echo ""
echo "=== DONE ==="
echo "New commits created: $count"
git log main..HEAD --oneline | wc -l | xargs echo "Total commits vs main:"
cat "$COMMIT_LOG"
