#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

has_error=0

printf "[arch-check] Running frontend architecture checks...\n"

# Rule A (hard fail): no direct $page/usePage access in shared ui components.
ui_page_usage="$(rg -n '\$page(\.props|\b)|usePage\(' inertia/components/ui --glob '*.svelte' || true)"
if [[ -n "$ui_page_usage" ]]; then
  printf "\n[arch-check][ERROR] Direct \$page/page-prop access is forbidden in inertia/components/ui/**\n"
  printf "%s\n" "$ui_page_usage"
  has_error=1
else
  printf "[arch-check][OK] No direct \$page/usePage access in inertia/components/ui/**\n"
fi

# Rule B (warn now): axios in page adapter layer should be explicitly approved Group C.
axios_in_pages="$(rg -n 'axios\.(get|post|put|patch|delete)\(' inertia/pages --glob '*.svelte' || true)"
if [[ -n "$axios_in_pages" ]]; then
  unapproved_axios=""
  while IFS= read -r match_line; do
    [[ -z "$match_line" ]] && continue

    file="${match_line%%:*}"
    remainder="${match_line#*:}"
    line_number="${remainder%%:*}"

    start_line="$line_number"
    if [[ "$start_line" -gt 2 ]]; then
      start_line=$((line_number - 2))
    fi

    context="$(sed -n "${start_line},${line_number}p" "$file")"
    if [[ "$context" != *"APPROVED: GroupC"* ]]; then
      unapproved_axios+="$match_line"$'\n'
    fi
  done <<< "$axios_in_pages"

  if [[ -n "$unapproved_axios" ]]; then
    if [[ "${FRONTEND_ARCH_FAIL_AXIOS:-0}" == "1" ]]; then
      printf "\n[arch-check][ERROR] Unapproved axios call-sites in inertia/pages/** (missing // APPROVED: GroupC - <flow>):\n"
      printf "%s" "$unapproved_axios"
      has_error=1
    else
      printf "\n[arch-check][WARN] Unapproved axios call-sites in inertia/pages/** (missing // APPROVED: GroupC - <flow>):\n"
      printf "%s" "$unapproved_axios"
    fi
  else
    printf "[arch-check][OK] All axios call-sites in inertia/pages/** are annotated as approved GroupC\n"
  fi
else
  printf "[arch-check][OK] No axios call-sites in inertia/pages/**\n"
fi

# Rule C (warn now, optional fail): page size budget.
# Module-aware defaults:
# - tasks/profile/reviews: warn > 260, fail > 420
# - organizations/org/projects/users/admin: warn > 320, fail > 480
# - fallback modules: warn > 300, fail > 500
# Fail mode is still controlled by FRONTEND_ARCH_FAIL_COMPLEXITY=1.
warn_pages=""
fail_pages=""

get_module_budget() {
  local module="$1"
  case "$module" in
    tasks|profile|reviews)
      printf "260 420"
      ;;
    organizations|org|projects|users|admin)
      printf "320 480"
      ;;
    *)
      printf "300 500"
      ;;
  esac
}

while IFS= read -r file; do
  relative_path="${file#inertia/pages/}"
  module="${relative_path%%/*}"
  if [[ "$relative_path" == "$module" ]]; then
    module="__root__"
  fi

  budget="$(get_module_budget "$module")"
  module_warn="${budget%% *}"
  module_fail="${budget##* }"
  lines="$(wc -l < "$file" | tr -d ' ')"
  if [[ "$lines" -gt "$module_fail" ]]; then
    fail_pages+="$lines (warn:${module_warn} fail:${module_fail} module:${module}) $file"$'\n'
  elif [[ "$lines" -gt "$module_warn" ]]; then
    warn_pages+="$lines (warn:${module_warn} fail:${module_fail} module:${module}) $file"$'\n'
  fi
done < <(rg --files inertia/pages -g '*.svelte')

if [[ -n "$warn_pages" ]]; then
  printf "\n[arch-check][WARN] pages over module-specific warn budget:\n%s" "$warn_pages"
fi

if [[ -n "$fail_pages" ]]; then
  if [[ "${FRONTEND_ARCH_FAIL_COMPLEXITY:-0}" == "1" ]]; then
    printf "\n[arch-check][ERROR] pages over module-specific fail budget (fail mode enabled):\n%s" "$fail_pages"
    has_error=1
  else
    printf "\n[arch-check][WARN] pages over module-specific fail budget (set FRONTEND_ARCH_FAIL_COMPLEXITY=1 to enforce fail):\n%s" "$fail_pages"
  fi
fi

# Rule D (warn now): mutation router.* should keep preserveState/preserveScroll defaults.
router_mutations="$(rg -n 'router\.(post|put|patch|delete)\(' inertia/pages --glob '*.{svelte,ts}' || true)"
if [[ -n "$router_mutations" ]]; then
  missing_router_defaults=""

  while IFS= read -r match_line; do
    [[ -z "$match_line" ]] && continue

    file="${match_line%%:*}"
    remainder="${match_line#*:}"
    line_number="${remainder%%:*}"

    end_line=$((line_number + 40))
    context="$(sed -n "${line_number},${end_line}p" "$file")"

    has_preserve_state=0
    has_preserve_scroll=0

    if [[ "$context" == *"preserveState"* ]]; then
      has_preserve_state=1
    fi
    if [[ "$context" == *"preserveScroll"* ]]; then
      has_preserve_scroll=1
    fi

    if [[ "$has_preserve_state" -eq 0 || "$has_preserve_scroll" -eq 0 ]]; then
      missing_router_defaults+="$match_line"$'\n'
    fi
  done <<< "$router_mutations"

  if [[ -n "$missing_router_defaults" ]]; then
    if [[ "${FRONTEND_ARCH_FAIL_ROUTER_MUTATION:-0}" == "1" ]]; then
      printf "\n[arch-check][ERROR] Router mutation call-sites missing preserve defaults:\n"
      printf "%s" "$missing_router_defaults"
      has_error=1
    else
      printf "\n[arch-check][WARN] Router mutation call-sites missing preserve defaults:\n"
      printf "%s" "$missing_router_defaults"
    fi
  else
    printf "\n[arch-check][OK] Router mutation call-sites include preserve defaults\n"
  fi
fi

if [[ "$has_error" -ne 0 ]]; then
  printf "\n[arch-check] FAILED\n"
  exit 1
fi

printf "\n[arch-check] PASSED (with possible warnings)\n"
