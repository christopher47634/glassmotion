#!/usr/bin/env bash
# GlassMotion — One-click installer
# Usage: curl -fsSL https://raw.githubusercontent.com/christopher47634/glassmotion/main/install.sh | bash

set -euo pipefail

REPO="christopher47634/glassmotion"
BRANCH="main"
HERMES_SKILLS_DIR="${HERMES_HOME:-$HOME/.hermes}/skills"
GLASSMOTION_SKILLS=("mode2-hyperframes" "popular-science-video-style" "macos-claude-ui")

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC} $1"; }
ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail()  { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

echo ""
echo -e "${CYAN}  ┌─────────────────────────────────────┐${NC}"
echo -e "${CYAN}  │  🪟  GlassMotion Installer            │${NC}"
echo -e "${CYAN}  │  AI-Powered Video Engine             │${NC}"
echo -e "${CYAN}  └─────────────────────────────────────┘${NC}"
echo ""

# ── Check prerequisites ──────────────────────────────────────────────

check_cmd() {
    if command -v "$1" &>/dev/null; then
        ok "$1 found: $(command -v "$1")"
        return 0
    else
        warn "$1 not found"
        return 1
    fi
}

info "Checking prerequisites..."

MISSING=()
check_cmd python3  || MISSING+=("python3")
check_cmd node     || MISSING+=("node")
check_cmd ffmpeg   || MISSING+=("ffmpeg")

# Check Chromium (snap or system)
if command -v chromium-browser &>/dev/null || command -v chromium &>/dev/null || [ -f /snap/chromium/current/usr/lib/chromium-browser/chrome ]; then
    ok "Chromium found"
else
    warn "Chromium not found (needed for frame capture)"
    MISSING+=("chromium")
fi

# Check Hermes Agent
if command -v hermes &>/dev/null; then
    ok "Hermes Agent found"
    HAS_HERMES=true
else
    warn "Hermes Agent not found — installing skills manually"
    HAS_HERMES=false
fi

if [ ${#MISSING[@]} -gt 0 ]; then
    echo ""
    warn "Missing dependencies: ${MISSING[*]}"
    echo "  Install them first:"
    echo "    Ubuntu/Debian: sudo apt install python3 nodejs ffmpeg chromium-browser"
    echo "    macOS:         brew install python3 node ffmpeg"
    echo ""
    read -p "Continue anyway? [y/N] " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]] || exit 1
fi

# ── Install skills ───────────────────────────────────────────────────

echo ""
info "Installing GlassMotion skills..."

if [ "$HAS_HERMES" = true ]; then
    # Method 1: Install via Hermes skill system
    for skill in "${GLASSMOTION_SKILLS[@]}"; do
        SKILL_URL="https://raw.githubusercontent.com/${REPO}/${BRANCH}/skills/${skill}/SKILL.md"
        info "Installing ${skill}..."
        hermes skills install "$SKILL_URL" --name "$skill" 2>/dev/null && ok "$skill installed" || warn "$skill — install manually if needed"
    done
    
    # Download supporting files (scripts, references, templates)
    for skill in "${GLASSMOTION_SKILLS[@]}"; do
        TARGET_DIR="${HERMES_SKILLS_DIR}/${skill}"
        if [ -d "$TARGET_DIR" ]; then
            info "Downloading supporting files for ${skill}..."
            
            # Download references
            for ref_dir in references scripts templates demo; do
                # Get file list from GitHub API
                FILES=$(curl -s "https://api.github.com/repos/${REPO}/contents/skills/${skill}/${ref_dir}" 2>/dev/null | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if isinstance(data, list):
        for f in data:
            if f.get('type') == 'file':
                print(f['name'])
except: pass
" 2>/dev/null || true)
                
                if [ -n "$FILES" ]; then
                    mkdir -p "${TARGET_DIR}/${ref_dir}"
                    while IFS= read -r fname; do
                        [ -z "$fname" ] && continue
                        curl -sL "https://raw.githubusercontent.com/${REPO}/${BRANCH}/skills/${skill}/${ref_dir}/${fname}" \
                            -o "${TARGET_DIR}/${ref_dir}/${fname}" 2>/dev/null
                    done <<< "$FILES"
                    ok "  ${skill}/${ref_dir}/ downloaded"
                fi
            done
        fi
    done
    
else
    # Method 2: Manual install (clone repo)
    INSTALL_DIR="$HOME/glassmotion"
    info "Cloning repository to ${INSTALL_DIR}..."
    
    if [ -d "$INSTALL_DIR" ]; then
        warn "Directory exists, updating..."
        cd "$INSTALL_DIR" && git pull -q
    else
        git clone -q "https://github.com/${REPO}.git" "$INSTALL_DIR"
    fi
    
    # Copy skills to Hermes skills directory (if it exists)
    if [ -d "$HERMES_SKILLS_DIR" ]; then
        for skill in "${GLASSMOTION_SKILLS[@]}"; do
            if [ -d "$INSTALL_DIR/skills/${skill}" ]; then
                cp -r "$INSTALL_DIR/skills/${skill}" "$HERMES_SKILLS_DIR/"
                ok "Copied ${skill} to ${HERMES_SKILLS_DIR}/"
            fi
        done
    fi
    
    ok "Repository cloned to ${INSTALL_DIR}"
    echo "  Skills are in: ${INSTALL_DIR}/skills/"
fi

# ── Install Node.js dependencies (if needed) ─────────────────────────

if command -v npm &>/dev/null; then
    info "Checking Node.js dependencies..."
    npm install -g puppeteer-core 2>/dev/null && ok "puppeteer-core installed" || ok "puppeteer-core already available"
fi

# ── Install Python dependencies ──────────────────────────────────────

info "Checking Python dependencies..."
pip3 install --quiet faster-whisper 2>/dev/null && ok "faster-whisper installed" || ok "faster-whisper already available"

# ── Done ─────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}  ┌─────────────────────────────────────┐${NC}"
echo -e "${GREEN}  │  ✅  GlassMotion installed!           │${NC}"
echo -e "${GREEN}  └─────────────────────────────────────┘${NC}"
echo ""
echo "  Quick start:"
echo ""

if [ "$HAS_HERMES" = true ]; then
    echo "    # Load the skill and describe your video:"
    echo "    hermes -s mode2-hyperframes \"做一个关于GPT-5的科普短视频\""
    echo ""
    echo "    # Or use the popular science style:"
    echo "    hermes -s popular-science-video-style \"做一个Claude新模型的科普\""
else
    echo "    # Edit a scene template:"
    echo "    cd ~/glassmotion && vim skills/mode2-hyperframes/templates/starter.html"
    echo ""
    echo "    # For full AI-powered workflow, install Hermes Agent:"
    echo "    curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash"
fi

echo ""
echo "  📖 Documentation: https://github.com/${REPO}"
echo ""
