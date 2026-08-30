#!/usr/bin/env sh
#
# deckrun - one-command installer
#
#   curl -fsSL https://raw.githubusercontent.com/arpitbbhayani/deckrun/master/install.sh | sh
#
# Installs deckrun globally from npm. Requires Node.js (>= 16) and npm.

set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
RESET='\033[0m'

say() { printf "%b\n" "$1"; }
info() { say "${CYAN}deckrun${RESET} $1"; }
ok()   { say "${GREEN}✓${RESET} $1"; }
warn() { say "${YELLOW}!${RESET} $1"; }

# --- Check node ---------------------------------------------------------
command -v node >/dev/null 2>&1 || {
  warn "Node.js is required but 'node' was not found on your PATH."
  warn "Install Node.js from https://nodejs.org and re-run this script."
  exit 1
}

node_version="$(node -v 2>/dev/null | sed 's/^v//')"
node_major="${node_version%%.*}"

case "$node_major" in
  ""|0|1|2|3|4|5|6|7|8|9|10|11|12|13|14|15)
    warn "deckrun needs Node.js >= 16 (found v${node_version})."
    warn "Upgrade Node.js from https://nodejs.org and re-run this script."
    exit 1
    ;;
esac

# --- Check npm ----------------------------------------------------------
command -v npm >/dev/null 2>&1 || {
  warn "npm is required but was not found on your PATH."
  warn "Install Node.js (which bundles npm) from https://nodejs.org."
  exit 1
}

info "Node.js v${node_version} detected."

# --- Install ------------------------------------------------------------
if [ "$(id -u)" -eq 0 ] || [ -n "$(npm config get prefix 2>/dev/null)" ]; then
  info "Installing deckrun globally via npm..."
  npm install -g deckrun
else
  info "Installing deckrun globally via npm (may prompt for your password)..."
  sudo npm install -g deckrun
fi

# --- Verify -------------------------------------------------------------
if command -v deckrun >/dev/null 2>&1; then
  ok "deckrun ${BOLD}$(deckrun --version 2>/dev/null)${RESET} installed."
  say ""
  say "  ${BOLD}deckrun${RESET}              # open the editor"
  say "  ${BOLD}deckrun slides.md${RESET}    # present a local file"
  say "  ${BOLD}deckrun <url>${RESET}        # present a public Markdown or HTML URL"
  say ""
else
  warn "deckrun was installed but is not on your PATH."
  warn "Make sure your npm global bin directory is in PATH, then run 'deckrun'."
fi