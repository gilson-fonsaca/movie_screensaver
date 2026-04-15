# Movie Screensaver

### Works on Wayland!

A GNOME Shell extension that plays video files from a local folder as a
fullscreen screensaver across all monitors after a configurable period of
user inactivity.

---

## Description

Movie Screensaver hooks into GNOME's idle monitor and, when the system has been
idle for the configured number of minutes, launches **mpv** to play all videos
found in the configured folder as a sequential playlist in fullscreen across
every monitor. The first mouse movement, mouse click, or key press dismisses
the screensaver and optionally locks the screen.

Videos are played in alphabetical order by default. An optional **shuffle**
mode randomises the playback order on each activation.

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
5. Print the `gsettings` commands needed to configure the videos folder and timeout.

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
| `videos-folder` | string | `''` | Absolute path to the folder containing video files |
| `shuffle-videos` | boolean | `false` | Play videos in random order instead of alphabetical |
| `lock-screen-after` | boolean | `false` | Lock the screen when dismissed |
| `mute-video` | boolean | `false` | Play video without audio |

### Supported video formats

Any format supported by mpv is accepted. The extension looks for files with
the following extensions inside the configured folder:

`.mp4` · `.mkv` · `.webm` · `.avi` · `.mov` · `.m4v`

### Set values from the terminal

```bash
BASE="org.gnome.shell.extensions.movie-screensaver"
SCHEMA_DIR="$HOME/.local/share/gnome-shell/extensions/movie-screensaver@gilsonf/schemas"

gsettings --schemadir "$SCHEMA_DIR" set $BASE videos-folder '/home/user/Videos/screensaver'
gsettings --schemadir "$SCHEMA_DIR" set $BASE idle-timeout-minutes 10
gsettings --schemadir "$SCHEMA_DIR" set $BASE shuffle-videos true
gsettings --schemadir "$SCHEMA_DIR" set $BASE lock-screen-after true
```

---

## Top-Bar Indicator

Clicking the **video-display** icon in the top bar opens a menu with:

- **Screensaver enabled** – toggle on/off
- **Lock screen after exit** – toggle
- **Mute video** – toggle audio on/off
- **Shuffle videos** – toggle random playback order
- **Idle timeout slider** – 0–30 minutes
- **Videos folder** – type the full folder path and press Enter
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
- General toggles (enable, lock screen after exit).
- Idle timeout spinner.
- **Video group:**
  - Mute audio toggle.
  - Shuffle videos toggle.
  - Videos folder path entry with an apply button.
  - Browse button to select the folder using a file manager dialog.

### Support tab

- Information about the project and a direct link to the donation page.

---

## How It Works

```
IdleMonitor detects idle threshold
  └─► _listVideoFiles() scans the configured folder
        └─► mpv launched per monitor (--fs --loop-playlist=inf --hwdec=auto)
              │   optional: --shuffle
              └─► Idle monitor listens for user activity
                    └─► mouse/keyboard/touch detected
                          ├─► mpv killed
                          └─► screen locked (if enabled)
```

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
- Confirm `videos-folder` points to an existing directory containing video files.
- Check GNOME Shell logs: `journalctl /usr/bin/gnome-shell -f`

### "No video files found in folder" error on screen

- Confirm the folder contains files with supported extensions
  (`.mp4`, `.mkv`, `.webm`, `.avi`, `.mov`, `.m4v`).
- Confirm the folder path is correct and the files are readable.

### "Failed to launch mpv" error on screen

- Verify mpv is installed: `which mpv`
- The preferences window shows an installation guide if mpv is missing.
- Test manually: `mpv --fs --loop-playlist=inf /path/to/video.mp4`

### Video plays but no audio / bad performance

- mpv uses hardware decoding (`--hwdec=auto`) by default.
- Ensure Mesa / VA-API / NVDEC drivers are installed.

### Screen does not lock after dismissal

- Ensure `lock-screen-after` is `true`.
- On Wayland the screen shield requires the session to be unlocked first —
  this is a GNOME limitation.

### Killing an orphaned mpv process manually

```bash
kill $(cat /run/user/$(id -u)/movie-screensaver.pid)
```

---

## Source Code

The project is hosted on GitHub:
[https://github.com/gilson-fonsaca/movie_screensaver.git](https://github.com/gilson-fonsaca/movie_screensaver.git)

Bug reports, pull requests and feature suggestions are welcome.

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
