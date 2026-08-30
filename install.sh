#!/usr/bin/env sh
#
# deckrun - one-command installer for Linux & macOS
#
#   curl -fsSL https://raw.githubusercontent.com/arpitbbhayani/deckrun/master/install.sh | sh
#
# Installs deckrun globally from npm. If Node.js (>= 16) is missing or too
# old, it downloads an LTS Node.js into ~/.local/share/deckrun-node (no root
# required), puts it on PATH for this shell, and persists that PATH entry in
# your shell profile so deckrun keeps working in future terminals.
#
# Windows users: see install.ps1  (irm ... | iex)

set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
RESET='\033[0m'

say()  { printf "%b\n" "$1"; }
info() { say "${CYAN}deckrun${RESET} $1"; }
ok()   { say "${GREEN}✓${RESET} $1"; }
warn() { say "${YELLOW}!${RESET} $1"; }

# ── Configuration ─────────────────────────────────────────────────────────
NODE_MIN_MAJOR=16
# LTS to install when Node is missing or too old. Override with the
# DECKRUN_NODE_VERSION environment variable, e.g. DECKRUN_NODE_VERSION=20.
NODE_MAJOR="${DECKRUN_NODE_VERSION:-22}"
NODE_INSTALL_DIR="${DECKRUN_NODE_DIR:-$HOME/.local/share/deckrun-node}"
DOWNLOAD_URL="https://nodejs.org/dist"

# ── Tools ─────────────────────────────────────────────────────────────────
DOWNLOAD_SH=""
if command -v curl >/dev/null 2>&1; then
  DOWNLOAD_SH="curl -fsSL"
elif command -v wget >/dev/null 2>&1; then
  DOWNLOAD_SH="wget -qO-"
fi

# Persist a PATH entry across future shells without duplicating it.
persist_path() {
  key="$NODE_INSTALL_DIR/bin"
  for rc in "$HOME/.profile" "$HOME/.bash_profile" "$HOME/.bashrc" "$HOME/.zshrc"; do
    [ -f "$rc" ] || continue
    if grep -qF "$key" "$rc" 2>/dev/null; then
      continue
    fi
    printf '\n# added by the deckrun installer\nexport PATH="%s:$PATH"\n' "$NODE_INSTALL_DIR/bin" >> "$rc"
  done
  # Create .profile if no dotfile exists yet, so login shells pick it up.
  if [ ! -f "$HOME/.profile" ]; then
    printf '\nexport PATH="%s:$PATH"\n' "$NODE_INSTALL_DIR/bin" > "$HOME/.profile"
  fi
}

# ── Auto-install Node.js for this platform ───────────────────────────────
install_node() {
  os="$(uname -s)"
  machine="$(uname -m)"

  case "$os" in
    Linux)  os="linux" ;;
    Darwin) os="darwin" ;;
    *)      warn "Unsupported OS for automatic Node installation: $os"
            warn "Install Node.js >= $NODE_MIN_MAJOR from https://nodejs.org, then re-run."
            exit 1 ;;
  esac

  case "$machine" in
    x86_64|amd64)  arch="x64" ;;
    aarch64|arm64) arch="arm64" ;;
    armv7l)        arch="armv7l" ;;
    *) warn "Unsupported architecture for automatic Node installation: $machine"
       warn "Install Node.js >= $NODE_MIN_MAJOR from https://nodejs.org, then re-run."
       exit 1 ;;
  esac

  if [ -z "$DOWNLOAD_SH" ]; then
    warn "Neither curl nor wget is available; cannot download Node.js."
    warn "Install Node.js >= $NODE_MIN_MAJOR from https://nodejs.org, then re-run."
    exit 1
  fi

  # Resolve the exact latest LTS patch for the chosen major from the index.
  index="$($DOWNLOAD_SH "$DOWNLOAD_URL/index.json")"
  version="$(
    printf '%s\n' "$index" |
      grep -oE '"version":"v'"$NODE_MAJOR"'\.[0-9]+\.[0-9]+"' |
      head -n1 |
      grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+'
  )"
  if [ -z "$version" ]; then
    warn "Could not resolve a Node.js v$NODE_MAJOR LTS version."
    warn "Install Node.js >= $NODE_MIN_MAJOR from https://nodejs.org, then re-run."
    exit 1
  fi

  # Linux ships .tar.xz; macOS ships .tar.gz.
  if [ "$os" = "linux" ]; then
    ext="tar.xz"
  else
    ext="tar.gz"
  fi

  file="node-$version-$os-$arch.$ext"
  tmp="$(mktemp -d)"
  cleanup() { rm -rf "$tmp"; }
  trap cleanup EXIT

  info "Downloading Node.js $version ($os/$arch)…"
  if [ "$DOWNLOAD_SH" = "curl -fsSL" ]; then
    curl -fsSL "$DOWNLOAD_URL/$version/$file" -o "$tmp/$file"
  else
    wget -qO "$tmp/$file" "$DOWNLOAD_URL/$version/$file"
  fi

  mkdir -p "$NODE_INSTALL_DIR"
  if [ "$ext" = "tar.gz" ]; then
    tar -xzf "$tmp/$file" -C "$tmp"
  else
    tar -xJf "$tmp/$file" -C "$tmp"
  fi
  rm -rf "$NODE_INSTALL_DIR"/*
  cp -R "$tmp/node-$version-$os-$arch/"* "$NODE_INSTALL_DIR/"

  persist_path
  PATH="$NODE_INSTALL_DIR/bin:$PATH"
  export PATH
  ok "Node.js $version installed locally ($NODE_INSTALL_DIR)."
}

# ── Ensure Node.js >= NODE_MIN_MAJOR is available ────────────────────────
ensure_node() {
  has_node=0
  if command -v node >/dev/null 2>&1; then
    existing="$(node -v 2>/dev/null | sed 's/^v//')"
    major="$(printf '%s\n' "$existing" | sed 's/\..*$//')"
    if [ -n "$major" ] && [ "$major" -ge "$NODE_MIN_MAJOR" ] 2>/dev/null; then
      has_node=1
      info "Node.js v$existing detected."
      return 0
    fi
    warn "Found Node.js v$existing; deckrun needs >= $NODE_MIN_MAJOR."
  fi

  # A previously auto-installed copy counts too even if the bare `node`
  # isn't on the live PATH yet (e.g. new shell, profile not yet sourced).
  if [ -x "$NODE_INSTALL_DIR/bin/node" ]; then
    existing="$("$NODE_INSTALL_DIR/bin/node" -v 2>/dev/null | sed 's/^v//')"
    major="$(printf '%s\n' "$existing" | sed 's/\..*$//')"
    if [ -n "$major" ] && [ "$major" -ge "$NODE_MIN_MAJOR" ] 2>/dev/null; then
      if [ "$has_node" = "0" ]; then
        PATH="$NODE_INSTALL_DIR/bin:$PATH"
        export PATH
        info "Using Node.js v$existing from $NODE_INSTALL_DIR."
      fi
      return 0
    fi
  fi

  warn "Installing Node.js automatically…"
  install_node
}

# ── Main ─────────────────────────────────────────────────────────────────
ensure_node

# ── Install deckrun ──────────────────────────────────────────────────────
if [ "$(id -u)" -eq 0 ] || [ -n "$(npm config get prefix 2>/dev/null)" ]; then
  info "Installing deckrun globally via npm…"
  npm install -g deckrun
else
  info "Installing deckrun globally via npm (may prompt for your password)…"
  sudo npm install -g deckrun
fi

# ── Verify ───────────────────────────────────────────────────────────────
if command -v deckrun >/dev/null 2>&1; then
  ok "deckrun ${BOLD}$(deckrun --version 2>/dev/null)${RESET} installed."
  say ""
  say "  ${BOLD}deckrun${RESET}              # open the editor"
  say "  ${BOLD}deckrun slides.md${RESET}    # present a local file"
  say "  ${BOLD}deckrun <url>${RESET}        # present a public Markdown or HTML URL"
  say ""
else
  warn "deckrun was installed but is not on your PATH."
  warn "Make sure your npm global bin directory is on PATH, then run 'deckrun'."
  if [ -n "$NODE_INSTALL_DIR" ] && [ -x "$NODE_INSTALL_DIR/bin/node" ]; then
    warn "If Node was just installed locally, open a new terminal or run:"
    say   "  export PATH=\"$NODE_INSTALL_DIR/bin:\$PATH\""
  fi
fi