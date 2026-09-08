#!/usr/bin/env python3
"""Rebuild the current branch with deterministic dates across the project lifetime.

This creates a new branch and never moves the source branch. Commit trees,
messages, and authors are preserved; only parent links and author/committer
dates are rebuilt.
"""

from __future__ import annotations

import os
import random
import subprocess
import sys
from datetime import date, timedelta


SOURCE_BRANCH = sys.argv[1] if len(sys.argv) > 1 else "HEAD"
TARGET_BRANCH = sys.argv[2] if len(sys.argv) > 2 else "history/semantic-commit-consolidation-20260908-dated"
START_DATE = date(2025, 5, 22)
END_DATE = date(2026, 9, 8)
SEED = 20260908
MIN_COMMITS_PER_DAY = 5
MAX_COMMITS_PER_DAY = 15


def git(*args: str, input_text: str | None = None, env: dict[str, str] | None = None) -> str:
    result = subprocess.run(
        ["git", *args],
        check=True,
        text=True,
        input=input_text,
        capture_output=True,
        env=env,
    )
    return result.stdout.strip()


hashes = [h for h in git("log", SOURCE_BRANCH, "--reverse", "--format=%H").splitlines() if h]
if not hashes:
    raise SystemExit(f"No commits found on {SOURCE_BRANCH}")

rng = random.Random(SEED)
days = [START_DATE + timedelta(days=i) for i in range((END_DATE - START_DATE).days + 1)]

if len(hashes) < MIN_COMMITS_PER_DAY:
    raise SystemExit(
        f"{len(hashes)} commits cannot create even one day with "
        f"{MIN_COMMITS_PER_DAY} commits"
    )

# If the history is too short to cover every calendar day, use evenly spaced
# active days. Empty days are preferable to violating the 5-commit minimum.
max_active_days = len(hashes) // MIN_COMMITS_PER_DAY
min_active_days = (len(hashes) + MAX_COMMITS_PER_DAY - 1) // MAX_COMMITS_PER_DAY
active_day_count = min(len(days), max_active_days)
if active_day_count < min_active_days:
    raise SystemExit("commit count cannot satisfy the 5-15 commits/day bounds")

if active_day_count == 1:
    active_indices = [0]
else:
    active_indices = [
        (i * (len(days) - 1)) // (active_day_count - 1)
        for i in range(active_day_count)
    ]

counts = [0] * len(days)
for index in active_indices:
    counts[index] = MIN_COMMITS_PER_DAY

remaining = len(hashes) - sum(counts)
while remaining:
    eligible = [i for i in active_indices if counts[i] < MAX_COMMITS_PER_DAY]
    index = rng.choice(eligible)
    counts[index] += 1
    remaining -= 1

date_values: list[str] = []
for day, count in zip(days, counts):
    hours = sorted(rng.choices(range(8, 24), k=count))
    for hour in hours:
        date_values.append(
            f"{day.isoformat()}T{hour:02d}:{rng.randrange(60):02d}:{rng.randrange(60):02d}+07:00"
        )
assert len(date_values) == len(hashes)

parent: str | None = None
for index, (source_hash, date_value) in enumerate(zip(hashes, date_values), start=1):
    tree = git("rev-parse", f"{source_hash}^{{tree}}")
    author_name = git("show", "-s", "--format=%an", source_hash)
    author_email = git("show", "-s", "--format=%ae", source_hash)
    message = git("show", "-s", "--format=%B", source_hash) + "\n"
    commit_env = {
        **os.environ,
        "GIT_AUTHOR_NAME": author_name,
        "GIT_AUTHOR_EMAIL": author_email,
        "GIT_AUTHOR_DATE": date_value,
        "GIT_COMMITTER_NAME": author_name,
        "GIT_COMMITTER_EMAIL": author_email,
        "GIT_COMMITTER_DATE": date_value,
    }
    args = ["commit-tree", tree]
    if parent:
        args += ["-p", parent]
    args += ["-F", "-"]
    parent = git(*args, input_text=message, env=commit_env)
    if index % 100 == 0 or index == len(hashes):
        print(f"rebuilt {index}/{len(hashes)} commits", flush=True)

assert parent is not None
git("update-ref", f"refs/heads/{TARGET_BRANCH}", parent)
print(f"branch={TARGET_BRANCH}")
print(f"head={parent}")
print(f"range={START_DATE.isoformat()}..{END_DATE.isoformat()}")
