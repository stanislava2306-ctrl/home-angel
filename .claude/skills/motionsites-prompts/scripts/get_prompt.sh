#!/usr/bin/env bash
# Fetch one prompt body from the upstream motionsites collection.
#
#   ./get_prompt.sh 004-3d-story          # print to stdout
#   ./get_prompt.sh 004-3d-story out.md   # save to a file
#
# A prompt dir holds prompt.md, working-prompt.md, or both (identical when
# both exist), so try one then the other. Results are cached under
# .cache/ next to this script; a second call for the same slug is free.
set -euo pipefail

REPO="${MOTIONSITES_REPO:-nomaan5541/motionsites-prompt-collection}"
REF="${MOTIONSITES_REF:-main}"
BASE="https://raw.githubusercontent.com/${REPO}/${REF}/motionsites-prompts"

slug="${1:?usage: get_prompt.sh <slug> [outfile]}"
dest="${2:-}"

cache="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.cache"
mkdir -p "$cache"
cached="$cache/${slug}.md"

if [[ ! -s "$cached" ]]; then
  for name in prompt.md working-prompt.md; do
    if curl -sSfL "${BASE}/${slug}/${name}" -o "$cached" 2>/dev/null; then
      break
    fi
  done
fi

if [[ ! -s "$cached" ]]; then
  rm -f "$cached"
  echo "not found: ${slug} (check the slug against references/catalog.tsv)" >&2
  exit 1
fi

if [[ -n "$dest" ]]; then
  cp "$cached" "$dest"
  echo "$dest"
else
  cat "$cached"
fi
