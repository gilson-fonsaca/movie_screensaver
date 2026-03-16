#!/usr/bin/env bash
# install.sh – Install the Movie Screensaver GNOME Shell extension
# Usage: ./install.sh [--system]
#
#   --system   Install system-wide under /usr/share (requires sudo).
#              Default: install for the current user only.

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────

UUID="movie-screensaver@gilsonf"
SCHEMA_ID="org.gnome.shell.extensions.movie-screensaver"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Argument parsing ──────────────────────────────────────────────────────────

SYSTEM_INSTALL=false
for arg in "$@"; do
    case "$arg" in
        --system) SYSTEM_INSTALL=true ;;
        -h|--help)
            echo "Usage: $0 [--system]"
            echo "  --system   Install system-wide (requires sudo)"
            exit 0
            ;;
        *)
            echo "Unknown argument: $arg" >&2
            exit 1
            ;;
    esac
done

# ── Target paths ──────────────────────────────────────────────────────────────

if $SYSTEM_INSTALL; then
    EXT_DIR="/usr/share/gnome-shell/extensions/${UUID}"
    SCHEMA_DIR="/usr/share/glib-2.0/schemas"
    SUDO="sudo"
else
    EXT_DIR="${HOME}/.local/share/gnome-shell/extensions/${UUID}"
    SCHEMA_DIR="${HOME}/.local/share/gnome-shell/extensions/${UUID}/schemas"
    SUDO=""
fi

# ── Helpers ───────────────────────────────────────────────────────────────────

info()    { echo -e "\033[1;34m[INFO]\033[0m  $*"; }
success() { echo -e "\033[1;32m[OK]\033[0m    $*"; }
warning() { echo -e "\033[1;33m[WARN]\033[0m  $*"; }
error()   { echo -e "\033[1;31m[ERROR]\033[0m $*" >&2; }

require_cmd() {
    if ! command -v "$1" &>/dev/null; then
        error "Required command not found: $1"
        error "Please install it and try again."
        exit 1
    fi
}

# ── Pre-flight checks ─────────────────────────────────────────────────────────

info "Checking requirements..."
require_cmd glib-compile-schemas

if ! command -v mpv &>/dev/null; then
    warning "mpv is not installed. The screensaver will show an error until mpv is available."
    warning "Install it with: sudo apt install mpv  (Debian/Ubuntu)"
    warning "                  sudo dnf install mpv  (Fedora)"
    warning "                  sudo pacman -S mpv    (Arch)"
fi

# ── Extension files ───────────────────────────────────────────────────────────

SOURCE_FILES=(
    metadata.json
    extension.js
    prefs.js
    stylesheet.css
)
SOURCE_SCHEMA="schemas/org.gnome.shell.extensions.movie-screensaver.gschema.xml"

for f in "${SOURCE_FILES[@]}"; do
    if [[ ! -f "${SCRIPT_DIR}/${f}" ]]; then
        error "Missing source file: ${f}"
        exit 1
    fi
done

if [[ ! -f "${SCRIPT_DIR}/${SOURCE_SCHEMA}" ]]; then
    error "Missing schema file: ${SOURCE_SCHEMA}"
    exit 1
fi

# ── Remove old installation if present ───────────────────────────────────────

if [[ -d "${EXT_DIR}" ]]; then
    info "Removing previous installation at ${EXT_DIR} ..."
    $SUDO rm -rf "${EXT_DIR}"
fi

# ── Copy extension files ──────────────────────────────────────────────────────

info "Installing extension to ${EXT_DIR} ..."
$SUDO mkdir -p "${EXT_DIR}/schemas"

for f in "${SOURCE_FILES[@]}"; do
    $SUDO cp "${SCRIPT_DIR}/${f}" "${EXT_DIR}/${f}"
done

$SUDO cp "${SCRIPT_DIR}/${SOURCE_SCHEMA}" \
         "${EXT_DIR}/schemas/$(basename "${SOURCE_SCHEMA}")"

success "Extension files copied."

# ── Compile GSettings schema ──────────────────────────────────────────────────

if $SYSTEM_INSTALL; then
    info "Compiling system schemas..."
    $SUDO glib-compile-schemas "${SCHEMA_DIR}"
else
    info "Compiling user schemas in ${EXT_DIR}/schemas ..."
    glib-compile-schemas "${EXT_DIR}/schemas"
fi

success "Schema compiled."

# ── Enable the extension ──────────────────────────────────────────────────────

if command -v gnome-extensions &>/dev/null; then
    # Check if GNOME Shell is running (not in a headless/CI environment)
    if [[ -n "${DBUS_SESSION_BUS_ADDRESS:-}" ]] || [[ -n "${WAYLAND_DISPLAY:-}" ]] || [[ -n "${DISPLAY:-}" ]]; then
        info "Enabling extension..."
        gnome-extensions enable "${UUID}" 2>/dev/null && success "Extension enabled." \
            || warning "Could not enable extension automatically (GNOME Shell may need a restart)."
    else
        warning "No graphical session detected – skipping automatic enable."
    fi
else
    warning "gnome-extensions command not found – skipping automatic enable."
fi

# ── Post-install instructions ─────────────────────────────────────────────────

echo ""
echo "────────────────────────────────────────────────────────"
success "Movie Screensaver installed successfully!"
echo ""
echo "  Next steps:"
echo ""
echo "  1. Restart GNOME Shell (if not done automatically):"
echo "       X11:    Alt+F2 → type 'r' → Enter"
echo "       Wayland: log out and log back in"
echo ""
echo "  2. Enable the extension (if not done automatically):"
echo "       gnome-extensions enable ${UUID}"
echo "       – or use GNOME Extensions / Extensions Manager app"
echo ""
echo "  3. Set your video file:"
echo "       gsettings --schemadir ${EXT_DIR}/schemas \\"
echo "         set ${SCHEMA_ID} video-path '/path/to/your/video.mp4'"
echo ""
echo "  4. Set idle timeout (minutes, 0 = off):"
echo "       gsettings --schemadir ${EXT_DIR}/schemas \\"
echo "         set ${SCHEMA_ID} idle-timeout-minutes 5"
echo "────────────────────────────────────────────────────────"
