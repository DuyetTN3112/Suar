#!/usr/bin/env python3
"""Commit every remaining untracked file in deterministic 1,000-line batches."""

from __future__ import annotations

import subprocess
from collections import defaultdict


LIMIT = 2000
DOC_SUFFIXES = (".md", ".mdx", ".txt", ".rst", ".adoc", ".csv", ".drawio", ".mmd", ".mermaid", ".puml")


def run(*args: str, check: bool = True) -> str:
    result = subprocess.run(["git", *args], text=True, capture_output=True, check=check)
    return result.stdout


def is_doc(path: str) -> bool:
    return (
        path.startswith(("docs/", "documentation/", "diagram/", "diagrams/"))
        or path.endswith(DOC_SUFFIXES)
    )


def group_key(path: str) -> str:
    parts = path.split("/")
    if is_doc(path):
        return "docs"
    if len(parts) >= 3 and parts[0] == "app" and parts[1] == "modules":
        return f"module:{parts[2]}"
    if len(parts) >= 2:
        return f"area:{parts[0]}/{parts[1]}"
    return f"area:{parts[0]}"


def weight(path: str) -> int:
    if is_doc(path):
        return 0
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as handle:
            return max(1, sum(1 for _ in handle))
    except OSError:
        return 30


def subject(key: str) -> str:
    if key == "docs":
        return "docs(repo): add project documentation and diagrams"
    if key.startswith("module:"):
        module = key.split(":", 1)[1]
        return f"refactor({module}): add remaining module changes"
    return "chore(repo): add remaining repository files"


run("reset", "--quiet", check=True)
paths = [p for p in run("ls-files", "--others", "--exclude-standard").splitlines() if p]
groups: dict[str, list[str]] = defaultdict(list)
for path in paths:
    groups[group_key(path)].append(path)

created = 0
for key in sorted(groups):
    batch: list[str] = []
    lines = 0
    part = 0
    for path in sorted(groups[key]):
        size = weight(path)
        if batch and size and lines + size > LIMIT:
            part += 1
            run("add", "--", *batch)
            title = subject(key) + (f" (part {part})" if part > 1 else "")
            subprocess.run(["git", "commit", "--no-verify", "-m", title], check=True)
            created += 1
            batch, lines = [], 0
        batch.append(path)
        lines += size
    if batch:
        part += 1
        run("add", "--", *batch)
        title = subject(key) + (f" (part {part})" if part > 1 else "")
        subprocess.run(["git", "commit", "--no-verify", "-m", title], check=True)
        created += 1

print(f"remaining_files={len(paths)}")
print(f"commits_created={created}")
