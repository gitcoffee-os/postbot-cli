#!/usr/bin/env bash
#
# PostBot CLI installer
#
#   curl -fsSL https://raw.githubusercontent.com/gitcoffee-os/postbot-cli/main/install.sh | bash
#
# Options:
#   --version <x.y.z>  Install a specific version (or set POSTBOT_VERSION)
#   --help             Show help
#
set -euo pipefail

PACKAGE="@gitcoffee-os/postbot-cli"
DOCS_URL="https://postbot.exmay.com/docs"
MIN_NODE_MAJOR=18
FALLBACK_PREFIX="$HOME/.postbot"

if [[ -t 1 ]]; then
  BLUE=$'\033[34m'; YELLOW=$'\033[33m'; RED=$'\033[31m'; RESET=$'\033[0m'
else
  BLUE=""; YELLOW=""; RED=""; RESET=""
fi

log()  { printf '%s\n' "${BLUE}[postbot]${RESET} $*"; }
warn() { printf '%s\n' "${YELLOW}[postbot]${RESET} $*" >&2; }
die()  { printf '%s\n' "${RED}[postbot]${RESET} $*" >&2; exit 1; }

usage() {
  cat <<'EOF'
PostBot CLI installer

Usage:
  curl -fsSL https://raw.githubusercontent.com/gitcoffee-os/postbot-cli/main/install.sh | bash
  curl -fsSL https://raw.githubusercontent.com/gitcoffee-os/postbot-cli/main/install.sh | bash -s -- --version <x.y.z>

Options:
  --version <x.y.z>  Install a specific version (defaults to latest)
  -h, --help         Show this help

Environment:
  POSTBOT_VERSION    Same as --version
EOF
}

# --- args --------------------------------------------------------------------

VERSION="${POSTBOT_VERSION:-}"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --version|-v)
      [[ $# -ge 2 ]] || die "Option $1 requires an argument"
      VERSION="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "Unknown option: $1 (try --help)"
      ;;
  esac
done

SPEC="${PACKAGE}@${VERSION:-latest}"

# --- preflight ---------------------------------------------------------------

command -v node >/dev/null 2>&1 \
  || die "Node.js not found. Install Node.js >= ${MIN_NODE_MAJOR} from https://nodejs.org and retry."
command -v npm >/dev/null 2>&1 \
  || die "npm not found. Install Node.js >= ${MIN_NODE_MAJOR} (npm is bundled) from https://nodejs.org and retry."

NODE_MAJOR="$(node -p 'parseInt(process.versions.node.split(".")[0], 10)')"
(( NODE_MAJOR >= MIN_NODE_MAJOR )) \
  || die "Node.js v${NODE_MAJOR} is too old; PostBot CLI requires >= ${MIN_NODE_MAJOR}."

# --- install -----------------------------------------------------------------

log "Installing ${SPEC} (node $(node --version), npm $(npm --version))"

# `</dev/null`: under `curl | bash`, stdin is the script stream itself;
# commands must never consume it.
if ! npm install -g "$SPEC" </dev/null; then
  warn "Global install failed — the npm global prefix is probably not writable by the current user."
  warn "Falling back to a user-local prefix: ${FALLBACK_PREFIX}"
  mkdir -p "$FALLBACK_PREFIX"
  if ! npm_config_prefix="$FALLBACK_PREFIX" npm install -g "$SPEC" </dev/null; then
    die "npm install failed. Try manually: npm install -g ${SPEC}"
  fi

  PATH_LINE='export PATH="$HOME/.postbot/bin:$PATH"'
  case "${SHELL:-}" in
    */zsh) RC_FILE="$HOME/.zshrc" ;;
    *)     RC_FILE="$HOME/.bashrc" ;;
  esac
  if [[ ! -f "$RC_FILE" ]] || ! grep -qs 'postbot-cli' "$RC_FILE"; then
    {
      printf '\n# Added by postbot-cli installer\n'
      printf '%s\n' "$PATH_LINE"
    } >> "$RC_FILE"
    warn "Added PATH export to ${RC_FILE}. Restart your shell, or run: export PATH=\"\$HOME/.postbot/bin:\$PATH\""
  fi
fi

# --- verify ------------------------------------------------------------------

POSTBOT_BIN="$(command -v postbot || true)"
if [[ -z "$POSTBOT_BIN" && -x "$FALLBACK_PREFIX/bin/postbot" ]]; then
  POSTBOT_BIN="$FALLBACK_PREFIX/bin/postbot"
fi
if [[ -z "$POSTBOT_BIN" ]]; then
  NPM_BIN="$(npm prefix -g 2>/dev/null || true)/bin"
  if [[ -x "$NPM_BIN/postbot" ]]; then
    POSTBOT_BIN="$NPM_BIN/postbot"
  fi
fi

[[ -n "$POSTBOT_BIN" ]] \
  || die "postbot was installed but could not be located. Check your npm global bin directory."

log "Verifying: $(basename "$POSTBOT_BIN") --version"
"$POSTBOT_BIN" --version

printf '\n'
log "PostBot CLI installed successfully."
log "Get started: postbot --help"
log "Docs: ${DOCS_URL}"
