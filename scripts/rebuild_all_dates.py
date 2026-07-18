#!/usr/bin/env python3
"""
rebuild_all_dates.py
Rewrite ALL commits on feature/restack-history-v2 với dates mới hoàn toàn.
Dùng Markov-chain distribution thay vì sine wave — trông tự nhiên hơn nhiều.
"""

import subprocess, os, random
from datetime import date, timedelta

random.seed(137)  # thay seed để pattern khác

SOURCE_BRANCH = "feature/restack-history-v2"
NEW_BRANCH    = "feature/restack-dates-v3"
START_DATE    = date(2025, 5, 22)
END_DATE      = date(2026, 6, 23)

AUTHOR_NAME  = subprocess.check_output(["git","config","user.name"]).decode().strip()
AUTHOR_EMAIL = subprocess.check_output(["git","config","user.email"]).decode().strip()

# ─── Step 1: Get all commits in chronological order ───────────────────────────
print(f"Getting commits from {SOURCE_BRANCH}...")
result = subprocess.run(
    ["git","log", SOURCE_BRANCH,"--reverse","--format=%H"],
    capture_output=True, text=True
)
all_hashes = [h.strip() for h in result.stdout.strip().split("\n") if h.strip()]
total = len(all_hashes)
print(f"  → {total} commits")

# ─── Step 2: Get subjects for all commits ────────────────────────────────────
print("Getting commit subjects...")
result2 = subprocess.run(
    ["git","log", SOURCE_BRANCH,"--reverse","--format=%s"],
    capture_output=True, text=True
)
all_subjects = [s.strip() for s in result2.stdout.strip().split("\n") if s.strip()]
# Pad if needed
while len(all_subjects) < total:
    all_subjects.append("chore(repo): miscellaneous updates")
all_subjects = all_subjects[:total]
print(f"  → {len(all_subjects)} subjects")

# ─── Step 3: Generate realistic date distribution ─────────────────────────────
print("Generating natural date distribution...")

num_days = (END_DATE - START_DATE).days + 1
all_dates = [START_DATE + timedelta(days=i) for i in range(num_days)]

# Warm up AR(1) to reach steady state before starting
A_val = 2.0
for _ in range(50):
    A_val = 0.90 * A_val + 0.10 * random.expovariate(0.5)

A = [A_val]
for _ in range(1, num_days):
    A_val = 0.90 * A_val + 0.10 * random.expovariate(0.5)
    A.append(A_val)

# Skew the weights by cubing to create highly realistic developer bursts (sprints)
A_skewed = [a**3.0 for a in A]
total_A = sum(A_skewed)
W = [a / total_A for a in A_skewed]

# We start with 0 commits per day, allowing natural 0-commit days
scaled = [0] * num_days

# Sample commits multinomially using the weights
choices = random.choices(range(num_days), weights=W, k=total)
for idx in choices:
    scaled[idx] += 1

# Force the first day and last day to have at least 1 commit to preserve start/end dates
if scaled[0] == 0:
    scaled[0] = 1
    max_idx = scaled.index(max(scaled))
    scaled[max_idx] -= 1
if scaled[-1] == 0:
    scaled[-1] = 1
    max_idx = scaled.index(max(scaled))
    scaled[max_idx] -= 1

print(f"  → {num_days} days, {sum(scaled)} commits assigned")
print(f"  → Min/day: {min(scaled)}, Max/day: {max(scaled)}, Avg: {sum(scaled)/num_days:.1f}")

# Check consecutive same
consec = sum(1 for i in range(1, num_days) if scaled[i] == scaled[i-1])
print(f"  → Consecutive same-count pairs: {consec}")

# Print sample of distribution to verify naturalness
print("\n  Sample (first 20 days):")
for i in range(min(20, num_days)):
    d = all_dates[i]
    bar = "█" * scaled[i]
    print(f"    {d}: {scaled[i]:2d} {bar}")

# ─── Step 4: Assign dates to commits ─────────────────────────────────────────
print("\nAssigning dates to commits...")
commit_dates = []  # one date per commit

# Realistic hourly weight distribution of developer activity (peaks around 10-11am, 3-5pm, and 9-10pm)
HOUR_WEIGHTS = [
    0.01, 0.005, 0.005, 0.005, 0.005, 0.01, # 12am - 5am (very low)
    0.02, 0.05,  0.10,  0.25,  0.40,  0.50, # 6am - 11am (morning startup and peak)
    0.30, 0.45,  0.60,  0.70,  0.65,  0.50, # 12pm - 5pm (afternoon peak)
    0.30, 0.20,  0.35,  0.45,  0.30,  0.10  # 6pm - 11pm (evening peak)
]

for day_i, d in enumerate(all_dates):
    n = scaled[day_i]
    if n == 0:
        continue
    # Sample n hours and sort them to keep chronological order
    sampled_hours = sorted(random.choices(range(24), weights=HOUR_WEIGHTS, k=n))
    for h in sampled_hours:
        minute = random.randint(0, 59)
        second = random.randint(0, 59)
        dt_str = f"{d.isoformat()}T{h:02d}:{minute:02d}:{second:02d}+07:00"
        commit_dates.append(dt_str)

assert len(commit_dates) == total, f"Date assignment failed: {len(commit_dates)} != {total}"
print(f"  → {len(commit_dates)} commit dates assigned")

# ─── Step 5: git commit-tree rebuild ─────────────────────────────────────────
print(f"\nRebuilding {total} commits with git commit-tree...")
print("(This may take 1-3 minutes...)")

prev_commit = None
for i, (h, subj, dt) in enumerate(zip(all_hashes, all_subjects, commit_dates)):
    tree = subprocess.check_output(
        ["git","rev-parse", f"{h}^{{tree}}"]
    ).decode().strip()

    env = {
        **os.environ,
        "GIT_AUTHOR_NAME":    AUTHOR_NAME,
        "GIT_AUTHOR_EMAIL":   AUTHOR_EMAIL,
        "GIT_AUTHOR_DATE":    dt,
        "GIT_COMMITTER_NAME": AUTHOR_NAME,
        "GIT_COMMITTER_EMAIL":AUTHOR_EMAIL,
        "GIT_COMMITTER_DATE": dt,
    }

    cmd = ["git","commit-tree", tree, "-m", subj]
    if prev_commit:
        cmd += ["-p", prev_commit]

    new_h = subprocess.check_output(cmd, env=env).decode().strip()
    prev_commit = new_h

    if (i + 1) % 100 == 0:
        pct = (i+1)/total*100
        print(f"  ... {i+1}/{total} ({pct:.0f}%) — latest: {dt[:10]}")

print(f"  → Done! Final commit: {prev_commit[:12]}")

# ─── Step 6: Create branch ────────────────────────────────────────────────────
print(f"\nCreating branch '{NEW_BRANCH}'...")
# Delete if exists
subprocess.run(["git","branch","-D", NEW_BRANCH], capture_output=True)
subprocess.run(["git","update-ref", f"refs/heads/{NEW_BRANCH}", prev_commit], check=True)

print(f"✓ Branch '{NEW_BRANCH}' created!")

# ─── Verify ───────────────────────────────────────────────────────────────────
print("\n=== Verification ===")
v = subprocess.run(
    ["git","log", NEW_BRANCH,"--format=%ai"],
    capture_output=True, text=True
)
dates_list = [l.strip()[:10] for l in v.stdout.strip().split("\n") if l.strip()]
from collections import Counter
dc = Counter(dates_list)
vals = sorted(dc.values())
dates_sorted = sorted(dc.keys())
print(f"Total commits: {len(dates_list)}")
print(f"Total days: {len(dc)}")
print(f"Min/day: {min(vals)}, Max/day: {max(vals)}, Avg: {sum(vals)/len(vals):.1f}")
consec2 = sum(1 for i in range(1,len(dates_sorted)) if dc[dates_sorted[i]] == dc[dates_sorted[i-1]])
print(f"Consecutive same-count pairs: {consec2}")
print(f"\nLast 10 commits:")
v2 = subprocess.run(["git","log", NEW_BRANCH,"-10","--format=%h %ai %s"], capture_output=True, text=True)
print(v2.stdout)
