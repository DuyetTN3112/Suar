#!/usr/bin/env bash

set -euo pipefail

if [ $# -lt 2 ]; then
  echo "usage: $0 <input-tsv> <branch-name>" >&2
  exit 1
fi

input_tsv="$1"
branch_name="$2"

if [ ! -f "$input_tsv" ]; then
  echo "missing input file: $input_tsv" >&2
  exit 1
fi

prev_commit=""
line_no=0

while IFS= read -r raw_line; do
  raw_line="${raw_line//\\t/$'\t'}"
  IFS="$(printf '\t')" read -r source_hash author_date author_name subject <<< "$raw_line"
  [ -n "$source_hash" ] || continue
  line_no=$((line_no + 1))

  tree_hash="$(git rev-parse "${source_hash}^{tree}")"
  author_email="$(git log -1 --format=%ae "$source_hash")"

  if [ -z "$prev_commit" ]; then
    new_commit="$(
      printf '%s\n' "$subject" | \
        GIT_AUTHOR_NAME="$author_name" \
        GIT_AUTHOR_EMAIL="$author_email" \
        GIT_AUTHOR_DATE="$author_date" \
        GIT_COMMITTER_NAME="$author_name" \
        GIT_COMMITTER_EMAIL="$author_email" \
        GIT_COMMITTER_DATE="$author_date" \
        git commit-tree "$tree_hash"
    )"
  else
    new_commit="$(
      printf '%s\n' "$subject" | \
        GIT_AUTHOR_NAME="$author_name" \
        GIT_AUTHOR_EMAIL="$author_email" \
        GIT_AUTHOR_DATE="$author_date" \
        GIT_COMMITTER_NAME="$author_name" \
        GIT_COMMITTER_EMAIL="$author_email" \
        GIT_COMMITTER_DATE="$author_date" \
        git commit-tree "$tree_hash" -p "$prev_commit"
    )"
  fi

  prev_commit="$new_commit"
done < "$input_tsv"

git update-ref "refs/heads/$branch_name" "$prev_commit"

echo "branch=$branch_name"
echo "commits=$line_no"
echo "head=$prev_commit"
