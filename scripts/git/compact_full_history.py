#!/usr/bin/env python3
"""Compact the entire linear history around a 900-2,000 code-line window."""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile


SOURCE = sys.argv[1] if len(sys.argv) > 1 else "HEAD"
TARGET = sys.argv[2] if len(sys.argv) > 2 else "history/semantic-commit-compact-20260908"
TARGET_LINES = 1000
MAX_LINES = 3000
EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904"
DOC_PREFIXES = ("docs/", "documentation/", "diagram/", "diagrams/")
DOC_SUFFIXES = (".md", ".mdx", ".txt", ".rst", ".adoc", ".csv", ".drawio", ".mmd", ".mermaid", ".puml", ".json")


def git(*args: str) -> str:
    return subprocess.check_output(["git", *args], text=True)


def is_doc(path: str) -> bool:
    return path.startswith(DOC_PREFIXES) or path.endswith(DOC_SUFFIXES)


def diff_entries(old_tree: str, new_tree: str) -> list[tuple[int, str]]:
    raw = git("diff", "--no-renames", "--numstat", old_tree, new_tree)
    entries = []
    for line in raw.splitlines():
        parts = line.split("\t")
        if len(parts) < 3:
            continue
        additions, deletions, path = parts[0], parts[1], parts[2]
        if is_doc(path) or additions == "-" or deletions == "-":
            entries.append((0, path))
        else:
            entries.append((int(additions) + int(deletions), path))
    return entries


def diff_stats(old_tree: str, new_tree: str) -> tuple[int, list[str]]:
    entries = diff_entries(old_tree, new_tree)
    return sum(weight for weight, _ in entries), [path for _, path in entries]


def subject(paths: list[str], part: int) -> str:
    if not paths:
        return "chore(repo): consolidate history"
    if all(is_doc(path) for path in paths):
        kind, scope = "docs", "project"
    elif any(path.startswith("tests/") or "/tests/" in path for path in paths):
        kind, scope = "test", "suite"
    elif any(path.startswith("app/modules/") for path in paths):
        module = next(path.split("/")[2] for path in paths if path.startswith("app/modules/"))
        kind, scope = "refactor", module
    elif any(path.startswith("inertia/") for path in paths):
        kind, scope = "feat", "ui"
    elif any(path.startswith("app/composition/") for path in paths):
        kind, scope = "refactor", "composition"
    elif any(path.startswith("scripts/") for path in paths):
        kind, scope = "chore", "scripts"
    else:
        kind, scope = "chore", "repo"
    names = []
    for path in paths:
        stem = path.rsplit("/", 1)[-1].rsplit(".", 1)[0].replace("_", "-")
        if stem not in names:
            names.append(stem)
        if len(names) == 2:
            break
    detail = " and ".join(names) or "related changes"
    suffix = f" (batch {part})" if part > 1 else ""
    return f"{kind}({scope}): consolidate {detail}{suffix}"


def commit_tree(tree: str, parent: str | None, message: str) -> str:
    env = {**os.environ}
    args = ["commit-tree", tree]
    if parent:
        args += ["-p", parent]
    args += ["-m", message]
    return subprocess.check_output(["git", *args], text=True, env=env).strip()


def apply_paths(old_tree: str, new_tree: str, paths: list[str]) -> str:
    """Return a tree made by applying selected final-tree paths to old_tree."""
    index_path = tempfile.mktemp(prefix="suar-compact-index-")
    env = {**os.environ, "GIT_INDEX_FILE": index_path}
    try:
        subprocess.run(["git", "read-tree", old_tree], check=True, env=env)
        if paths:
            subprocess.run(
                ["git", "restore", "--source", new_tree, "--staged", "--", *paths],
                check=True,
                env=env,
            )
        return subprocess.check_output(["git", "write-tree"], text=True, env=env).strip()
    finally:
        try:
            os.unlink(index_path)
        except FileNotFoundError:
            pass


def emit_transition(
    old_tree: str,
    new_tree: str,
    parent: str | None,
    created: int,
) -> tuple[str | None, int, int]:
    """Emit one or more commits for a tree transition, splitting by file."""
    entries = diff_entries(old_tree, new_tree)
    total_weight = sum(weight for weight, _ in entries)
    if total_weight <= MAX_LINES or all(weight == 0 for weight, _ in entries):
        paths = [path for _, path in entries]
        return commit_tree(new_tree, parent, subject(paths, created + 1)), created + 1, total_weight

    batch: list[str] = []
    batch_weight = 0
    current_tree = old_tree
    part = 0
    for weight, path in entries:
        if batch and batch_weight + weight > MAX_LINES:
            part += 1
            current_tree = apply_paths(current_tree, new_tree, batch)
            created += 1
            parent = commit_tree(current_tree, parent, subject(batch, part))
            batch = []
            batch_weight = 0
        batch.append(path)
        batch_weight += weight
    if batch:
        part += 1
        current_tree = apply_paths(current_tree, new_tree, batch)
        created += 1
        parent = commit_tree(current_tree, parent, subject(batch, part))
    if current_tree != new_tree:
        raise SystemExit("file-level split produced an incorrect tree")
    return parent, created, total_weight


hashes = git("rev-list", SOURCE, "--reverse").splitlines()
if not hashes:
    raise SystemExit(f"No commits found on {SOURCE}")

if subprocess.run(["git", "show-ref", "--verify", "--quiet", f"refs/heads/{TARGET}"]).returncode == 0:
    subprocess.run(["git", "update-ref", "-d", f"refs/heads/{TARGET}"], check=True)
parent: str | None = None
previous_tree = EMPTY_TREE
start = 0
created = 0
oversized = []

while start < len(hashes):
    end = start
    selected_tree = previous_tree
    selected_paths: list[str] = []
    selected_weight = 0
    while end < len(hashes):
        candidate_tree = git("rev-parse", f"{hashes[end]}^{{tree}}").strip()
        candidate_weight, candidate_paths = diff_stats(previous_tree, candidate_tree)
        if end > start and candidate_weight > MAX_LINES:
            break
        selected_tree = candidate_tree
        selected_paths = candidate_paths
        selected_weight = candidate_weight
        end += 1
        if selected_weight >= TARGET_LINES or selected_weight > MAX_LINES:
            break

    if end == start:
        raise SystemExit("history compaction made no progress")
    if selected_weight > MAX_LINES and not all(is_doc(path) for path in selected_paths):
        parent, created, _ = emit_transition(previous_tree, selected_tree, parent, created)
    else:
        created += 1
        parent = commit_tree(selected_tree, parent, subject(selected_paths, created))
    previous_tree = selected_tree
    start = end
    if created % 100 == 0:
        print(f"created {created} commits; consumed {start}/{len(hashes)} source commits", flush=True)

assert parent is not None
subprocess.run(["git", "update-ref", f"refs/heads/{TARGET}", parent], check=True)
target_tree = git("rev-parse", f"{TARGET}^{{tree}}").strip()
source_tree = git("rev-parse", f"{SOURCE}^{{tree}}").strip()
if target_tree != source_tree:
    raise SystemExit("verification failed: compacted tree differs from source tree")

print(f"source={SOURCE}")
print(f"target={TARGET}")
print(f"source_commits={len(hashes)}")
print(f"compacted_commits={created}")
print(f"oversized_code_groups={len(oversized)}")
for size, paths in oversized:
    print(f"oversized_code_group={size}\t{paths[:3]}")
