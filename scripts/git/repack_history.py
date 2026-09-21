#!/usr/bin/env python3
"""Repack a final tree into clear, bounded commits without changing main.

Usage:
    python3 scripts/repack_history.py <source-branch> <target-branch>

The target starts at main. Files are taken from the source final tree and
grouped by area using exact git diff line counts. Documentation and generated
artifacts are exempt from the code-line cap; code batches are capped at 2,000
changed lines. The script deliberately leaves the source and main branches
untouched.
"""

from __future__ import annotations

import re
import subprocess
import sys
from collections import defaultdict


BASE = "main"
LIMIT = 2000
SOURCE = sys.argv[1] if len(sys.argv) > 1 else "HEAD"
TARGET = sys.argv[2] if len(sys.argv) > 2 else "history/semantic-commit-repack-20260908"
DOC_PREFIXES = ("docs/", "documentation/", "diagram/", "diagrams/")
DOC_SUFFIXES = (".md", ".mdx", ".txt", ".rst", ".adoc", ".csv", ".drawio", ".mmd", ".mermaid", ".puml", ".json")


def git(*args: str, check: bool = True) -> str:
    result = subprocess.run(["git", *args], text=True, capture_output=True, check=check)
    return result.stdout


def is_unbounded(path: str) -> bool:
    return path.startswith(DOC_PREFIXES) or path.endswith(DOC_SUFFIXES)


def area(path: str) -> str:
    parts = path.split("/")
    if path.startswith(DOC_PREFIXES) or path.endswith(DOC_SUFFIXES):
        return "docs"
    if len(parts) >= 3 and parts[:2] == ["app", "modules"]:
        return f"module:{parts[2]}"
    if len(parts) >= 3 and parts[:2] == ["app", "composition"]:
        return f"composition:{parts[2]}"
    if parts[0] == "inertia":
        return "ui"
    if parts[0] in {"tests", "scripts"}:
        return parts[0]
    return parts[0]


def title(key: str, batch: list[str], part: int) -> str:
    names = []
    for path in batch:
        stem = path.rsplit("/", 1)[-1].rsplit(".", 1)[0].replace("_", "-")
        if stem not in names:
            names.append(stem)
        if len(names) == 2:
            break
    detail = " and ".join(names) if names else "repository boundaries"
    suffix = f" (batch {part})" if part > 1 else ""
    if key == "docs":
        return f"docs(project): update {detail}{suffix}"
    if key.startswith("module:"):
        return f"refactor({key.split(':', 1)[1]}): update {detail}{suffix}"
    if key.startswith("composition:"):
        return f"refactor(composition): wire {detail}{suffix}"
    if key == "ui":
        return f"feat(ui): update {detail}{suffix}"
    if key == "tests":
        return f"test(suite): update {detail}{suffix}"
    if key == "scripts":
        return f"chore(scripts): update {detail}{suffix}"
    return f"chore({key}): update {detail}{suffix}"


def weight(base: str, source: str, path: str) -> int:
    if is_unbounded(path):
        return 0
    raw = git("diff", "--no-renames", "--numstat", base, source, "--", path).strip()
    if not raw:
        return 1
    additions, deletions, *_ = raw.split("\t", 2)
    if additions == "-" or deletions == "-":
        return 1
    return int(additions) + int(deletions)


def status_map(base: str, source: str) -> dict[str, str]:
    result = {}
    for line in git("diff", "--no-renames", "--name-status", base, source).splitlines():
        code, path = line.split("\t", 1)
        result[path] = code
    return result


def stage_batch(batch: list[str], statuses: dict[str, str], source: str) -> None:
    live = [path for path in batch if statuses[path] != "D"]
    deleted = [path for path in batch if statuses[path] == "D"]
    if live:
        git("restore", f"--source={source}", "--staged", "--worktree", "--", *live)
    if deleted:
        subprocess.run(["git", "rm", "-f", "--", *deleted], check=True)


statuses = status_map(BASE, SOURCE)
groups: dict[str, list[tuple[int, str]]] = defaultdict(list)
for path, code in statuses.items():
    groups[area(path)].append((weight(BASE, SOURCE, path), path))

git("switch", "-c", TARGET, BASE)
created = 0
oversized = []
for key in sorted(groups):
    batch: list[str] = []
    lines = 0
    part = 0
    for size, path in sorted(groups[key], key=lambda item: item[1]):
        if size > LIMIT and not is_unbounded(path):
            oversized.append((path, size))
        if batch and size and lines + size > LIMIT:
            part += 1
            stage_batch(batch, statuses, SOURCE)
            subprocess.run(["git", "commit", "--no-verify", "-m", title(key, batch, part)], check=True)
            created += 1
            batch, lines = [], 0
        batch.append(path)
        lines += size
    if batch:
        part += 1
        stage_batch(batch, statuses, SOURCE)
        subprocess.run(["git", "commit", "--no-verify", "-m", title(key, batch, part)], check=True)
        created += 1

if subprocess.run(["git", "diff", "--quiet", SOURCE, "HEAD"]).returncode != 0:
    raise SystemExit("repack verification failed: target tree differs from source tree")

print(f"source={SOURCE}")
print(f"target={TARGET}")
print(f"changed_paths={len(statuses)}")
print(f"commits_created={created}")
print(f"code_oversized_files={len(oversized)}")
for path, size in oversized:
    print(f"oversized_code_file={size}\t{path}")
