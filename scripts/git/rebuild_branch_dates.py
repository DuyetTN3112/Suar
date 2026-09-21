#!/usr/bin/env python3
"""
rebuild_branch_dates.py
- Lấy tất cả commits từ feature/restack-history-v2 (1430 commits)
- Lấy dates từ commits.md (1427 entries)
- 3 commits chênh lệch (1215-1217 trên branch, là commits của main chưa có trong tsv)
  → thêm vào commits.md để khớp 1430 total
- Dùng git commit-tree để tạo branch mới 'feature/restack-dates-v2'
  với đúng ngày từ commits.md, chỉ rewrite từ commit 1215 trở đi
  (commits 1-1214 đã có đúng date ở remote, giữ nguyên parent chain)
"""

import subprocess
import sys
from datetime import date, timedelta

BRANCH = "feature/restack-history-v2"
NEW_BRANCH = "feature/restack-dates-v2"
COMMITS_MD = "commits.md"
AUTHOR_NAME = subprocess.check_output(["git", "config", "user.name"]).decode().strip()
AUTHOR_EMAIL = subprocess.check_output(["git", "config", "user.email"]).decode().strip()

print("=== Rebuild branch with correct commit dates ===")

# ─── Step 1: Get all commits on feature branch (chronological order) ──────────
print(f"Getting commits from {BRANCH}...")
result = subprocess.run(
    ["git", "log", BRANCH, "--reverse", "--format=%H"],
    capture_output=True, text=True
)
all_hashes = [h.strip() for h in result.stdout.strip().split("\n") if h.strip()]
print(f"  → {len(all_hashes)} commits total on branch")

# ─── Step 2: Read commits.md ──────────────────────────────────────────────────
print(f"Reading {COMMITS_MD}...")
md_entries = []  # list of (date_str, subject)
with open(COMMITS_MD, "r") as f:
    for i, line in enumerate(f):
        line = line.rstrip("\n")
        if i == 0 or not line.strip():
            continue
        parts = line.split("\t")
        if len(parts) >= 3:
            date_str = parts[1].strip()
            subject = parts[2].strip()
            if date_str and subject:
                md_entries.append((date_str, subject))
print(f"  → {len(md_entries)} entries in commits.md")

# ─── Step 3: If branch has more commits than md_entries, extend commits.md ───
diff = len(all_hashes) - len(md_entries)
if diff > 0:
    print(f"  → Branch has {diff} more commits than commits.md — extending...")
    # Get subjects for those extra commits
    extra_hashes = all_hashes[len(md_entries):]
    extra_result = subprocess.run(
        ["git", "log", "--reverse", "--format=%s", f"{all_hashes[len(md_entries)-1]}..{BRANCH}"],
        capture_output=True, text=True
    )
    extra_subjects = [s.strip() for s in extra_result.stdout.strip().split("\n") if s.strip()]

    # Assign dates continuing from the last date in md_entries
    last_date = date.fromisoformat(md_entries[-1][0])
    for i, subj in enumerate(extra_subjects[:diff]):
        next_date = last_date + timedelta(days=1)
        md_entries.append((next_date.isoformat(), subj))
        last_date = next_date
    print(f"  → Extended to {len(md_entries)} entries")
elif diff < 0:
    print(f"  → commits.md has {-diff} more entries than branch commits — truncating...")
    md_entries = md_entries[:len(all_hashes)]

assert len(all_hashes) == len(md_entries), f"Mismatch: {len(all_hashes)} hashes vs {len(md_entries)} dates"
print(f"  → Aligned: {len(all_hashes)} commits ↔ {len(md_entries)} date entries")

# ─── Step 4: Find the parent commit to start rewriting from ───────────────────
# Commit 1214 (index 1213 in 0-based) is the last "good" commit (already correct date)
# We start rewriting from commit 1215 (index 1214 in 0-based)
REWRITE_START = 1214  # 0-based index, so this is commit #1215

# Get the hash of commit 1214 (0-based: 1213) — this is our parent for the new chain
parent_hash_original = all_hashes[REWRITE_START - 1]  # commit #1214 (good, pre-existing)
print(f"\nRewrite starts at commit #{REWRITE_START + 1} (0-based: {REWRITE_START})")
print(f"Parent (commit #1214): {parent_hash_original[:12]}")

# ─── Step 5: Find what the "rewritten" hash of commit 1214 is ────────────────
# Since commits 1-1214 were already rewritten by build_commit_preview_branch.sh
# on the remote, we need to find the equivalent in our local branch.
# BUT: we're working with feature/restack-history-v2 which HAS the original main
# commits (1-1214) with their current dates. We'll just use the original parent.
# The new branch will branch off from commit 1214 of feature/restack-history-v2
# and rewrite commits 1215-1430 with correct dates.

# Actually: we want the NEW branch to:
# - Share commits 1-1214 from feature/restack-history-v2 (same tree, same parent chain)
# - Have commits 1215-1430 rewritten with dates from commits.md

prev_commit = parent_hash_original
print(f"\nRewriting {len(all_hashes) - REWRITE_START} commits with correct dates...")

rewritten = 0
for i in range(REWRITE_START, len(all_hashes)):
    orig_hash = all_hashes[i]
    date_str, subject = md_entries[i]

    # Get tree hash from original commit
    tree_hash = subprocess.check_output(
        ["git", "rev-parse", f"{orig_hash}^{{tree}}"]
    ).decode().strip()

    # Format date for git (ISO 8601)
    git_date = f"{date_str}T12:00:00+07:00"

    # Add some hour variation based on position within day
    # (count how many commits are on this day already)
    hour = 9 + (rewritten % 8)  # spread between 9am-5pm
    git_date = f"{date_str}T{hour:02d}:00:00+07:00"

    env = {
        "GIT_AUTHOR_NAME": AUTHOR_NAME,
        "GIT_AUTHOR_EMAIL": AUTHOR_EMAIL,
        "GIT_AUTHOR_DATE": git_date,
        "GIT_COMMITTER_NAME": AUTHOR_NAME,
        "GIT_COMMITTER_EMAIL": AUTHOR_EMAIL,
        "GIT_COMMITTER_DATE": git_date,
    }

    import os
    full_env = {**os.environ, **env}

    new_commit = subprocess.check_output(
        ["git", "commit-tree", tree_hash, "-p", prev_commit, "-m", subject],
        env=full_env
    ).decode().strip()

    prev_commit = new_commit
    rewritten += 1

    if rewritten % 50 == 0:
        print(f"  ... {rewritten}/{len(all_hashes) - REWRITE_START} done")

print(f"  → {rewritten} commits rewritten")

# ─── Step 6: Create/update the new branch ────────────────────────────────────
print(f"\nCreating branch '{NEW_BRANCH}' at {prev_commit[:12]}...")
subprocess.run(
    ["git", "branch", "-f", NEW_BRANCH, prev_commit],
    check=True
)

print(f"\n✓ Done!")
print(f"  Branch: {NEW_BRANCH}")
print(f"  Last commit: {prev_commit[:12]}")
print(f"  Date range: {md_entries[REWRITE_START][0]} → {md_entries[-1][0]}")

# Verify last few commits
print(f"\nVerifying last 5 commits on {NEW_BRANCH}:")
verify = subprocess.run(
    ["git", "log", NEW_BRANCH, "-5", "--format=%h %ai %s"],
    capture_output=True, text=True
)
print(verify.stdout)
