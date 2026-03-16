# Movie Screensaver

A GNOME Shell extension that plays a local `.mp4` video file as a fullscreen
screensaver across all monitors after a configurable period of user inactivity.

---

## Description

Movie Screensaver hooks into GNOME's idle monitor and, when the system has been
idle for the configured number of minutes, covers every monitor with a
fullscreen overlay and launches **mpv** to play the chosen video in a looping
fullscreen window. The first mouse movement, mouse click, or key press
dismisses the screensaver and optionally locks the screen.

A top-bar indicator gives quick access to all settings and an instant
"Start Screensaver Now" action.

---

## Requirements

| Requirement | Version |
|---|---|
| GNOME Shell | 47 or newer |
| GJS | bundled with GNOME Shell |
| **mpv** | any recent version (**required**) |

### Installing mpv

mpv **must** be installed before the screensaver can play any video.
The preferences window will show a warning banner if mpv is not detected.

```bash
# Fedora / RHEL
sudo dnf install mpv

# Ubuntu / Debian
sudo apt install mpv

# Arch Linux
sudo pacman -S mpv

# openSUSE
sudo zypper install mpv
```

---

## Installation

### Automatic (recommended)

Use the provided `install.sh` script:

```bash
# User install (no sudo required)
./install.sh

# System-wide install (requires sudo)
./install.sh --system
```

The script will:

1. Check for required tools (`glib-compile-schemas`) and warn if mpv is missing.
2. Copy all extension files to the correct location.
3. Compile the GSettings schema automatically.
4. Attempt to enable the extension via `gnome-extensions enable`.
5. Print the `gsettings` commands needed to configure the video path and timeout.

### Manual

1. Copy the extension directory into your GNOME extensions folder:

```bash
cp -r movie-screensaver \
    ~/.local/share/gnome-shell/extensions/movie-screensaver@gilsonf
```

2. Compile the GSettings schema:

```bash
glib-compile-schemas \
    ~/.local/share/gnome-shell/extensions/movie-screensaver@gilsonf/schemas/
```

3. Restart GNOME Shell:

   - **X11:** press `Alt+F2`, type `r`, press Enter.
   - **Wayland:** log out and log back in.

4. Enable the extension:

```bash
gnome-extensions enable movie-screensaver@gilsonf
```

---

## Removal

### Automatic (recommended)

```bash
# Remove user install and reset all settings
./uninstall.sh

# Remove user install but keep GSettings values
./uninstall.sh --keep-settings

# Remove a system-wide install (requires sudo)
./uninstall.sh --system
```

The script will:

1. Stop any orphaned mpv process left by the screensaver.
2. Disable the extension.
3. Reset all GSettings keys to their defaults (unless `--keep-settings`).
4. Delete the extension directory.

### Manual

```bash
gnome-extensions disable movie-screensaver@gilsonf
rm -rf ~/.local/share/gnome-shell/extensions/movie-screensaver@gilsonf
dconf reset -f /org/gnome/shell/extensions/movie-screensaver/
```

---

## Compiling the GSettings Schema

The schema **must** be compiled before the extension can run.
`install.sh` does this automatically. If you change the `.gschema.xml` file
manually, recompile with:

```bash
glib-compile-schemas \
    ~/.local/share/gnome-shell/extensions/movie-screensaver@gilsonf/schemas/
```

---

## Configuration

All settings are stored in GSettings under
`org.gnome.shell.extensions.movie-screensaver`.

| Key | Type | Default | Description |
|---|---|---|---|
| `enabled` | boolean | `true` | Enable/disable the screensaver |
| `idle-timeout-minutes` | integer (0–30) | `5` | Minutes of inactivity before activation |
| `video-path` | string | `''` | Absolute path to the `.mp4` file |
| `lock-screen-after` | boolean | `false` | Lock the screen when dismissed |
| `mute-video` | boolean | `false` | Play video without audio |
| `continue-video-after-extension-reload` | boolean | `false` | Keep the player alive across reloads |

### Set values from the terminal

```bash
BASE="org.gnome.shell.extensions.movie-screensaver"
SCHEMA_DIR="$HOME/.local/share/gnome-shell/extensions/movie-screensaver@gilsonf/schemas"

gsettings --schemadir "$SCHEMA_DIR" set $BASE video-path '/home/user/videos/my-video.mp4'
gsettings --schemadir "$SCHEMA_DIR" set $BASE idle-timeout-minutes 10
gsettings --schemadir "$SCHEMA_DIR" set $BASE lock-screen-after true
```

---

## Top-Bar Indicator

Clicking the **video-display** icon in the top bar opens a menu with:

- **Screensaver enabled** – toggle on/off
- **Lock screen after exit** – toggle
- **Continue video after reload** – toggle
- **Mute video** – toggle audio on/off
- **Idle timeout slider** – 0–30 minutes
- **Video file path entry** – type the full path and press Enter
- **Start Screensaver Now** – immediately activate (useful for testing)

---

## Preferences Window

Open the preferences window from the GNOME Extensions app or with:

```bash
gnome-extensions prefs movie-screensaver@gilsonf
```

The window has two tabs:

### Settings tab

- **Dependency banner** – shows a green notice if mpv is installed, or an
  orange warning with installation commands for common distros if it is not.
- General toggles (enable, lock screen, continue after reload).
- Idle timeout spinner.
- Video file path entry with a file chooser button.

### Support tab

- Information about the project and a direct link to the donation page.

---

## How It Works

```
IdleMonitor detects idle threshold
  └─► fullscreen ScreensaverActor created on every monitor
        └─► mpv launched (--fs --loop=inf --hwdec=auto)
              └─► Clutter stage listens for input events
                    └─► mouse/keyboard detected
                          ├─► mpv killed
                          ├─► actors removed
                          └─► screen locked (if enabled)
```

### Reload / disable behaviour

| `continue-video-after-extension-reload` | Behaviour on disable/reload |
|---|---|
| `false` (default) | mpv is killed immediately |
| `true` | mpv keeps running; extension reconnects on next enable |

---

## Troubleshooting

### Extension does not load after installation

The UUID in `metadata.json` **must** match the folder name exactly.
The correct folder name is `movie-screensaver@gilsonf`.

If the extension was previously installed with the wrong folder name, reinstall:

```bash
# Remove old installation
./uninstall.sh

# Reinstall (creates the correct folder name automatically)
./install.sh
```

Check the GNOME Shell log for UUID errors:

```bash
journalctl /usr/bin/gnome-shell -f
```

### The screensaver never starts

- Confirm `enabled` is `true` and `idle-timeout-minutes` is > 0.
- Confirm `video-path` points to an existing readable file.
- Check GNOME Shell logs: `journalctl /usr/bin/gnome-shell -f`

### "Failed to launch mpv" error on screen

- Verify mpv is installed: `which mpv`
- The preferences window shows an installation guide if mpv is missing.
- Test manually: `mpv --fs --loop=inf /path/to/video.mp4`

### Video plays but no audio / bad performance

- mpv uses hardware decoding (`--hwdec=auto`) by default.
- Ensure Mesa / VA-API / NVDEC drivers are installed.

### Screen does not lock after dismissal

- Ensure `lock-screen-after` is `true`.
- On Wayland the screen shield requires the session to be unlocked first —
  this is a GNOME limitation.

### Orphaned mpv after a crash

If `continue-video-after-extension-reload` was `true` and the extension
crashed, a PID file is left at `$XDG_RUNTIME_DIR/movie-screensaver.pid`.
Kill the process manually, or run `./uninstall.sh` which handles this
automatically:

```bash
kill $(cat /run/user/$(id -u)/movie-screensaver.pid)
```

---

## Source Code

The project is hosted on GitLab:
[https://gitlab.com/gilson.fonsaca/movie_screensaver](https://gitlab.com/gilson.fonsaca/movie_screensaver)

Bug reports, merge requests and feature suggestions are welcome.

---

## Support

If you find Movie Screensaver useful, consider buying me a coffee:

[![Buy me a coffee](https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=%E2%98%95&slug=Gilsonf&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff)](https://buymeacoffee.com/Gilsonf)

---

## License

This project is licensed under the **GNU General Public License v2.0 or later**.

See the [LICENSE](LICENSE) file for the full license text.

```
Movie Screensaver – video screensaver GNOME Shell extension
Copyright (C) 2026  Gilson F.

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 2 of the License, or
(at your option) any later version.
```
