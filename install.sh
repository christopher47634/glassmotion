#!/usr/bin/env bash
# GlassMotion installer
#
# Recommended (pinned, reviewable):
#   git clone --depth 1 --branch v1.1.0 https://github.com/christopher47634/glassmotion.git
#   cd glassmotion && ./install.sh
#
# Options:
#   --dest DIR      skills target directory (default: $HERMES_HOME/skills or ~/.hermes/skills)
#   --with-deps     create a Python venv at ~/.glassmotion/venv with playwright + faster-whisper
#                   and download Playwright's Chromium
#   --dry-run       print what would be copied, change nothing
#
# The script never prompts and exits non-zero on the first failure, so it is safe
# to run non-interactively. It only copies files from the directory it lives in;
# it does not download skill files from GitHub.

set -euo pipefail

SKILLS=("mode2-hyperframes" "popular-science-video-style" "macos-claude-ui")
DEST="${HERMES_HOME:-$HOME/.hermes}/skills"
WITH_DEPS=false
DRY_RUN=false

info() { printf '[INFO] %s\n' "$*"; }
ok()   { printf '[OK] %s\n' "$*"; }
warn() { printf '[WARN] %s\n' "$*" >&2; }
die()  { printf '[ERROR] %s\n' "$*" >&2; exit 1; }

while [ $# -gt 0 ]; do
    case "$1" in
        --dest)      [ $# -ge 2 ] || die "--dest needs a directory"; DEST="$2"; shift 2 ;;
        --with-deps) WITH_DEPS=true; shift ;;
        --dry-run)   DRY_RUN=true; shift ;;
        -h|--help)   sed -n '2,17p' "$0"; exit 0 ;;
        *)           die "unknown option: $1 (see --help)" ;;
    esac
done

# The script must run from a checkout; piping it into bash has no skills to copy.
SRC="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
[ -d "$SRC/skills/mode2-hyperframes" ] || die "run ./install.sh from a cloned glassmotion repo (see the header of this file)"

if git -C "$SRC" rev-parse --git-dir >/dev/null 2>&1; then
    info "source: $SRC @ $(git -C "$SRC" describe --tags --always --dirty 2>/dev/null || echo unknown)"
fi

# ── prerequisites (reported, not prompted) ──────────────────────────
missing=()
for cmd in python3 ffmpeg; do
    command -v "$cmd" >/dev/null 2>&1 && ok "$cmd: $(command -v "$cmd")" || missing+=("$cmd")
done
if [ ${#missing[@]} -gt 0 ]; then
    warn "missing: ${missing[*]} (needed to render videos, not to install skills)"
    warn "  Ubuntu/Debian: sudo apt install ${missing[*]}    macOS: brew install ${missing[*]}"
fi

# ── copy skills ─────────────────────────────────────────────────────
info "installing skills into $DEST"
$DRY_RUN || mkdir -p "$DEST"
for skill in "${SKILLS[@]}"; do
    [ -f "$SRC/skills/$skill/SKILL.md" ] || die "skills/$skill/SKILL.md not found in $SRC"
    if $DRY_RUN; then
        echo "  would copy skills/$skill -> $DEST/$skill"
        continue
    fi
    tmp="$DEST/.$skill.tmp.$$"
    rm -rf "$tmp"
    cp -R "$SRC/skills/$skill" "$tmp"
    find "$tmp" -name '__pycache__' -type d -prune -exec rm -rf {} +
    rm -rf "$DEST/$skill"
    mv "$tmp" "$DEST/$skill"
    ok "$skill"
done

# ── optional Python dependencies (isolated venv, never system pip) ──
if $WITH_DEPS; then
    command -v python3 >/dev/null 2>&1 || die "--with-deps needs python3"
    VENV="$HOME/.glassmotion/venv"
    if $DRY_RUN; then
        echo "  would create $VENV and install playwright faster-whisper"
    else
        info "creating venv $VENV"
        python3 -m venv "$VENV" || die "python3 -m venv failed (Debian/Ubuntu: sudo apt install python3-venv)"
        "$VENV/bin/pip" install --quiet --upgrade pip
        "$VENV/bin/pip" install --quiet playwright faster-whisper
        "$VENV/bin/python" -m playwright install chromium
        ok "dependencies installed; use $VENV/bin/python to run the capture scripts"
    fi
fi

echo
ok "GlassMotion installed"
echo "  Skills: $DEST/{$(IFS=,; echo "${SKILLS[*]}")}"
if ! $WITH_DEPS; then
    echo "  Render dependencies: re-run with --with-deps, or install playwright + faster-whisper yourself."
fi
if command -v hermes >/dev/null 2>&1; then
    echo "  Try: hermes -s mode2-hyperframes \"做一个关于 GPT-5 的科普短视频\""
fi
