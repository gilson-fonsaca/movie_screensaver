#!/usr/bin/env bash
# uninstall.sh – Remove the Movie Screensaver GNOME Shell extension
# Usage: ./uninstall.sh [--system] [--keep-settings]
#
#   --system         Remove a system-wide installation (requires sudo).
#   --keep-settings  Preserve GSettings values (do not reset to defaults).

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────

UUID="movie-screensaver@gilsonf"
SCHEMA_ID="org.gnome.shell.extensions.movie-screensaver"
MARKER_FILE="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/movie-screensaver.pid"

# ── Argument parsing ──────────────────────────────────────────────────────────

SYSTEM_INSTALL=false
KEEP_SETTINGS=false

for arg in "$@"; do
    case "$arg" in
        --system)        SYSTEM_INSTALL=true ;;
        --keep-settings) KEEP_SETTINGS=true ;;
        -h|--help)
            echo "Usage: $0 [--system] [--keep-settings]"
            echo "  --system         Remove a system-wide installation (requires sudo)"
            echo "  --keep-settings  Do not reset GSettings to defaults"
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
    SYSTEM_SCHEMA_DIR="/usr/share/glib-2.0/schemas"
    SUDO="sudo"
else
    EXT_DIR="${HOME}/.local/share/gnome-shell/extensions/${UUID}"
    SUDO=""
fi

# ── Helpers ───────────────────────────────────────────────────────────────────

info()    { echo -e "\033[1;34m[INFO]\033[0m  $*"; }
success() { echo -e "\033[1;32m[OK]\033[0m    $*"; }
warning() { echo -e "\033[1;33m[WARN]\033[0m  $*"; }
error()   { echo -e "\033[1;31m[ERROR]\033[0m $*" >&2; }

# ── Stop any running player ───────────────────────────────────────────────────

if [[ -f "${MARKER_FILE}" ]]; then
    info "Found running player marker – stopping orphaned mpv process..."
    PID=$(cat "${MARKER_FILE}" 2>/dev/null || true)
    if [[ -n "${PID}" ]] && [[ "${PID}" =~ ^[0-9]+$ ]]; then
        if kill -0 "${PID}" 2>/dev/null; then
            kill "${PID}" 2>/dev/null && success "Stopped mpv (PID ${PID})." \
                || warning "Could not kill PID ${PID} (may have already exited)."
        else
            info "Process ${PID} is not running."
        fi
    fi
    rm -f "${MARKER_FILE}"
fi

# ── Disable the extension ─────────────────────────────────────────────────────

if command -v gnome-extensions &>/dev/null; then
    if [[ -n "${DBUS_SESSION_BUS_ADDRESS:-}" ]] || [[ -n "${WAYLAND_DISPLAY:-}" ]] || [[ -n "${DISPLAY:-}" ]]; then
        info "Disabling extension..."
        gnome-extensions disable "${UUID}" 2>/dev/null \
            && success "Extension disabled." \
            || info "Extension was not enabled (or GNOME Shell is not running)."
    fi
fi

# ── Reset GSettings ───────────────────────────────────────────────────────────

if ! $KEEP_SETTINGS; then
    # Only reset if the schema is still resolvable
    SCHEMA_DIR="${EXT_DIR}/schemas"
    if [[ -d "${SCHEMA_DIR}" ]] && command -v gsettings &>/dev/null; then
        info "Resetting GSettings to defaults..."
        gsettings --schemadir "${SCHEMA_DIR}" reset-recursively "${SCHEMA_ID}" 2>/dev/null \
            && success "GSettings reset." \
            || warning "Could not reset GSettings (schema may already be gone)."
    fi

    # Also remove the dconf path so no stale keys remain
    if command -v dconf &>/dev/null; then
        dconf reset -f /org/gnome/shell/extensions/movie-screensaver/ 2>/dev/null || true
    fi
else
    info "Keeping GSettings values (--keep-settings was passed)."
fi

# ── Remove extension directory ────────────────────────────────────────────────

if [[ -d "${EXT_DIR}" ]]; then
    info "Removing ${EXT_DIR} ..."
    $SUDO rm -rf "${EXT_DIR}"
    success "Extension directory removed."
else
    warning "Extension directory not found: ${EXT_DIR}"
    warning "Nothing to remove."
fi

# ── Recompile system schemas (system install only) ────────────────────────────

if $SYSTEM_INSTALL && command -v glib-compile-schemas &>/dev/null; then
    info "Recompiling system schemas..."
    $SUDO glib-compile-schemas "${SYSTEM_SCHEMA_DIR}" 2>/dev/null \
        && success "System schemas recompiled." \
        || warning "Could not recompile system schemas."
fi

# ── Done ──────────────────────────────────────────────────────────────────────

echo ""
echo "────────────────────────────────────────────────────────"
success "Movie Screensaver uninstalled successfully."
echo ""
echo "  To apply the removal you may need to restart GNOME Shell:"
echo "       X11:    Alt+F2 → type 'r' → Enter"
echo "       Wayland: log out and log back in"
echo "────────────────────────────────────────────────────────"
