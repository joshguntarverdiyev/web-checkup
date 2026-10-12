#!/usr/bin/env bash
# Web Checkup installer: copies the skill into an agent's skills folder.
# For other agents (Cursor, Gemini CLI, Copilot, OpenCode, ...) prefer: npx skills add joshguntarverdiyev/web-checkup
set -euo pipefail

REPO="joshguntarverdiyev/web-checkup"
REF="main"
AGENT="claude"
PROJECT=0
CUSTOM_DIR=""

usage() {
  cat <<'EOF'
Install the web-checkup skill.

Usage: install.sh [--agent claude|codex|all] [--project] [--dir <path>] [--ref <branch-or-tag>]

  --agent    Target agent (default: claude)
               claude -> ~/.claude/skills/web-checkup   (with --project: ./.claude/skills/web-checkup)
               codex  -> ~/.codex/skills/web-checkup    (with --project: ./.codex/skills/web-checkup)
  --project  Install into the current project instead of your home directory
  --dir      Install into <path>/web-checkup instead (any agent that reads skill folders)
  --ref      Git branch or tag to install (default: main)
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --agent) AGENT="${2:-}"; shift 2 ;;
    --project) PROJECT=1; shift ;;
    --dir) CUSTOM_DIR="${2:-}"; shift 2 ;;
    --ref) REF="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
  esac
done

case "$AGENT" in claude|codex|all) ;; *) echo "Unsupported agent: $AGENT (use claude, codex, all, or --dir)" >&2; exit 1 ;; esac

if ! command -v curl >/dev/null 2>&1 || ! command -v tar >/dev/null 2>&1; then
  echo "curl and tar are required." >&2
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "Downloading $REPO@$REF ..."
curl -fsSL "https://codeload.github.com/$REPO/tar.gz/$REF" | tar -xz -C "$TMP"
SRC="$(find "$TMP" -mindepth 3 -maxdepth 3 -type d -path '*/skills/web-checkup' | head -n 1)"
if [ -z "$SRC" ] || [ ! -f "$SRC/SKILL.md" ]; then
  echo "Could not find skills/web-checkup in the download." >&2
  exit 1
fi

install_to() {
  local parent="$1"
  local dest="$parent/web-checkup"
  mkdir -p "$parent"
  if [ -d "$dest" ]; then
    rm -rf "$dest.bak"
    mv "$dest" "$dest.bak"
    echo "Existing install moved to $dest.bak"
  fi
  cp -R "$SRC" "$dest"
  echo "Installed to $dest"
}

if [ -n "$CUSTOM_DIR" ]; then
  install_to "$CUSTOM_DIR"
else
  base="$HOME"
  [ "$PROJECT" -eq 1 ] && base="$(pwd)"
  if [ "$AGENT" = "claude" ] || [ "$AGENT" = "all" ]; then install_to "$base/.claude/skills"; fi
  if [ "$AGENT" = "codex" ] || [ "$AGENT" = "all" ]; then install_to "$base/.codex/skills"; fi
fi

cat <<'EOF'

Done. Restart your agent session, then try:
  "Audit my site before launch"   or   /web-checkup audit
EOF
