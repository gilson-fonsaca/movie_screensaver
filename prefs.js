/**
 * Movie Screensaver – Preferences window
 *
 * Shown when the user clicks "Settings" in GNOME Extensions or
 * gnome-extensions-app. Uses libadwaita widgets (Adw) available
 * in GNOME 47+.
 */

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {ExtensionPreferences, gettext as _} from
    'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const SCHEMA_ID = 'org.gnome.shell.extensions.movie-screensaver';
const DONATION_URL = 'https://buymeacoffee.com/Gilsonf';
const GITLAB_URL = 'https://gitlab.com/gilson.fonsaca/movie_screensaver';

export default class MovieScreensaverPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings(SCHEMA_ID);

        window.set_default_size(640, 580);

        // ── Page 1: Settings ──────────────────────────────────────────────────
        const settingsPage = new Adw.PreferencesPage({
            title: _('Settings'),
            icon_name: 'preferences-system-symbolic',
        });
        window.add(settingsPage);

        // ── Group: Dependency notice ─────────────────────────────────────────
        const depGroup = new Adw.PreferencesGroup();
        settingsPage.add(depGroup);

        const mpvInstalled = this._isMpvInstalled();
        const depBanner = new Adw.Banner({
            title: mpvInstalled
                ? _('mpv is installed — video playback is ready.')
                : _('mpv is not installed. The screensaver will not work until mpv is available.'),
            button_label: mpvInstalled ? '' : _('How to install'),
            revealed: true,
        });

        // Style: green when installed, yellow/warning when missing
        if (mpvInstalled) {
            depBanner.add_css_class('success');
        } else {
            depBanner.add_css_class('warning');
            depBanner.connect('button-clicked', () => {
                Gtk.show_uri(window, 'https://mpv.io/installation/', 0);
            });
        }
        depGroup.add(depBanner);

        // Fallback: if Adw.Banner is not available (older libadwaita), use an ActionRow
        // (Adw.Banner was added in libadwaita 1.3 / GNOME 45, so it is always present
        //  on GNOME 47+.  The check above is therefore safe.)

        // ── Group: mpv installation hint (collapsible) ───────────────────────
        if (!mpvInstalled) {
            const hintGroup = new Adw.PreferencesGroup({
                title: _('Installing mpv'),
                description: _('Run one of the following commands in a terminal:'),
            });
            settingsPage.add(hintGroup);

            const commands = [
                ['Fedora / RHEL', 'sudo dnf install mpv'],
                ['Ubuntu / Debian', 'sudo apt install mpv'],
                ['Arch Linux', 'sudo pacman -S mpv'],
                ['openSUSE', 'sudo zypper install mpv'],
            ];

            for (const [distro, cmd] of commands) {
                const row = new Adw.ActionRow({title: distro, subtitle: cmd});
                // Copy-to-clipboard button
                const copyBtn = new Gtk.Button({
                    icon_name: 'edit-copy-symbolic',
                    valign: Gtk.Align.CENTER,
                    tooltip_text: _('Copy command'),
                    css_classes: ['flat'],
                });
                copyBtn.connect('clicked', () => {
                    _setClipboardText(window, cmd);
                });
                row.add_suffix(copyBtn);
                hintGroup.add(row);
            }
        }

        // ── Group: General ───────────────────────────────────────────────────
        const generalGroup = new Adw.PreferencesGroup({
            title: _('General'),
        });
        settingsPage.add(generalGroup);

        const enableRow = new Adw.SwitchRow({
            title: _('Enable screensaver'),
            subtitle: _('Activate video screensaver after idle timeout'),
        });
        settings.bind('enabled', enableRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        generalGroup.add(enableRow);

        const lockRow = new Adw.SwitchRow({
            title: _('Lock screen after exit'),
            subtitle: _('Lock the session when input dismisses the screensaver'),
        });
        settings.bind('lock-screen-after', lockRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        generalGroup.add(lockRow);

        const continueRow = new Adw.SwitchRow({
            title: _('Restart video after extension reload'),
            subtitle: _('Restart the video if the extension is reloaded'),
        });
        settings.bind(
            'continue-video-after-extension-reload',
            continueRow,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );
        generalGroup.add(continueRow);

        // ── Group: Timing ────────────────────────────────────────────────────
        const timingGroup = new Adw.PreferencesGroup({
            title: _('Timing'),
        });
        settingsPage.add(timingGroup);

        const spinRow = new Adw.SpinRow({
            title: _('Idle timeout (minutes)'),
            subtitle: _('Minutes of inactivity before the screensaver starts (0 = disabled)'),
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 30,
                step_increment: 1,
                page_increment: 5,
                value: settings.get_int('idle-timeout-minutes'),
            }),
        });
        settings.bind('idle-timeout-minutes', spinRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        timingGroup.add(spinRow);

        // ── Group: Video ─────────────────────────────────────────────────────
        const videoGroup = new Adw.PreferencesGroup({
            title: _('Video'),
            description: _('Select the local video file to play as screensaver.'),
        });
        settingsPage.add(videoGroup);

        // Mute audio
        const muteRow = new Adw.SwitchRow({
            title: _('Mute audio'),
            subtitle: _('Play the video without sound'),
        });
        settings.bind('mute-video', muteRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        videoGroup.add(muteRow);

        const pathRow = new Adw.EntryRow({
            title: _('Video file path'),
            text: settings.get_string('video-path'),
            show_apply_button: true,
        });
        pathRow.connect('apply', row => {
            settings.set_string('video-path', row.get_text().trim());
        });
        settings.connect('changed::video-path', s => {
            if (pathRow.get_text() !== s.get_string('video-path'))
                pathRow.set_text(s.get_string('video-path'));
        });
        videoGroup.add(pathRow);

        const fileRow = new Adw.ActionRow({
            title: _('Browse for video file'),
            subtitle: _('Select an .mp4, .mkv or .webm file'),
            activatable: true,
        });
        fileRow.add_suffix(new Gtk.Image({icon_name: 'document-open-symbolic'}));
        fileRow.connect('activated', () => {
            this._openFileChooser(window, settings, pathRow);
        });
        videoGroup.add(fileRow);

        // ── Page 2: Donate ────────────────────────────────────────────────────
        const donatePage = new Adw.PreferencesPage({
            title: _('Support'),
            icon_name: 'emblem-favorite-symbolic',
        });
        window.add(donatePage);

        this._buildDonatePage(donatePage, window);
    }

    // ── Donation page ─────────────────────────────────────────────────────────

    _buildDonatePage(page, window) {
        // Hero group
        const heroGroup = new Adw.PreferencesGroup();
        page.add(heroGroup);

        // Coffee cup icon
        const icon = new Gtk.Image({
            icon_name: 'emblem-favorite-symbolic',
            pixel_size: 64,
            margin_top: 24,
            margin_bottom: 8,
            css_classes: ['accent'],
        });
        heroGroup.add(icon);

        // Title
        const titleLabel = new Gtk.Label({
            label: _('Support Movie Screensaver'),
            css_classes: ['title-1'],
            margin_bottom: 8,
        });
        heroGroup.add(titleLabel);

        // Description
        const descLabel = new Gtk.Label({
            label: _(
                'Movie Screensaver is free and open-source software.\n' +
                'If you enjoy it, consider buying me a coffee ☕\n' +
                'Your support helps keep the project maintained and growing.'
            ),
            justify: Gtk.Justification.CENTER,
            wrap: true,
            css_classes: ['body'],
            margin_bottom: 16,
        });
        heroGroup.add(descLabel);

        // ── Donate button ────────────────────────────────────────────────────
        const btnGroup = new Adw.PreferencesGroup();
        page.add(btnGroup);

        const donateRow = new Adw.ActionRow({
            title: _('Buy me a coffee ☕'),
            subtitle: DONATION_URL,
            activatable: true,
        });
        donateRow.add_suffix(new Gtk.Image({
            icon_name: 'go-next-symbolic',
            valign: Gtk.Align.CENTER,
        }));
        donateRow.connect('activated', () => {
            Gtk.show_uri(window, DONATION_URL, 0);
        });
        btnGroup.add(donateRow);

        // Copy link button row
        const copyRow = new Adw.ActionRow({
            title: _('Copy donation link'),
            subtitle: _('Paste it in your browser if the link above does not open'),
            activatable: true,
        });
        copyRow.add_suffix(new Gtk.Image({
            icon_name: 'edit-copy-symbolic',
            valign: Gtk.Align.CENTER,
        }));
        copyRow.connect('activated', () => {
            _setClipboardText(window, DONATION_URL);
            // Brief visual feedback
            copyRow.subtitle = _('Link copied!');
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => {
                copyRow.subtitle = _('Paste it in your browser if the link above does not open');
                return GLib.SOURCE_REMOVE;
            });
        });
        btnGroup.add(copyRow);

        // ── About group ──────────────────────────────────────────────────────
        const aboutGroup = new Adw.PreferencesGroup({
            title: _('About'),
            margin_top: 12,
        });
        page.add(aboutGroup);

        // Source code on GitLab
        const gitlabRow = new Adw.ActionRow({
            title: _('Source code'),
            subtitle: GITLAB_URL,
            activatable: true,
        });
        gitlabRow.add_suffix(new Gtk.Image({
            icon_name: 'go-next-symbolic',
            valign: Gtk.Align.CENTER,
        }));
        gitlabRow.connect('activated', () => {
            Gtk.show_uri(window, GITLAB_URL, 0);
        });
        aboutGroup.add(gitlabRow);

        // Copy GitLab link
        const copyGitlabRow = new Adw.ActionRow({
            title: _('Copy source code link'),
            subtitle: _('Paste it in your browser if the link above does not open'),
            activatable: true,
        });
        copyGitlabRow.add_suffix(new Gtk.Image({
            icon_name: 'edit-copy-symbolic',
            valign: Gtk.Align.CENTER,
        }));
        copyGitlabRow.connect('activated', () => {
            _setClipboardText(window, GITLAB_URL);
            copyGitlabRow.subtitle = _('Link copied!');
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => {
                copyGitlabRow.subtitle = _('Paste it in your browser if the link above does not open');
                return GLib.SOURCE_REMOVE;
            });
        });
        aboutGroup.add(copyGitlabRow);

        const licenseRow = new Adw.ActionRow({
            title: _('License'),
            subtitle: _('GNU General Public License v2.0 or later'),
        });
        licenseRow.add_suffix(new Gtk.Image({
            icon_name: 'text-x-generic-symbolic',
            valign: Gtk.Align.CENTER,
        }));
        aboutGroup.add(licenseRow);

        const authorRow = new Adw.ActionRow({
            title: _('Author'),
            subtitle: 'Gilson F.',
        });
        aboutGroup.add(authorRow);
    }

    // ── File chooser ──────────────────────────────────────────────────────────

    _openFileChooser(parentWindow, settings, pathRow) {
        const dialog = new Gtk.FileDialog({
            title: _('Select Video File'),
            modal: true,
        });

        const current = settings.get_string('video-path');
        if (current && GLib.file_test(current, GLib.FileTest.EXISTS))
            dialog.set_initial_file(Gio.File.new_for_path(current));

        const filter = new Gtk.FileFilter();
        filter.set_name(_('Video files'));
        filter.add_mime_type('video/mp4');
        filter.add_mime_type('video/x-matroska');
        filter.add_mime_type('video/webm');
        filter.add_pattern('*.mp4');
        filter.add_pattern('*.mkv');
        filter.add_pattern('*.webm');
        filter.add_pattern('*.avi');
        const store = new Gio.ListStore({item_type: Gtk.FileFilter});
        store.append(filter);
        dialog.set_filters(store);

        dialog.open(parentWindow, null, (_d, result) => {
            try {
                const file = dialog.open_finish(result);
                if (file) {
                    const path = file.get_path();
                    settings.set_string('video-path', path);
                    pathRow.set_text(path);
                }
            } catch (_e) {
                // User cancelled
            }
        });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Returns true if mpv is found anywhere in $PATH. */
    _isMpvInstalled() {
        return GLib.find_program_in_path('mpv') !== null;
    }
}

// ─── Module-level helpers ─────────────────────────────────────────────────────

/**
 * Copy text to the system clipboard using the GTK4 ContentProvider API.
 * @param {Gtk.Window} parentWindow - any GTK window (used to get the display)
 * @param {string} text - the text to copy
 */
function _setClipboardText(parentWindow, text) {
    try {
        const display = parentWindow.get_display() ?? Gdk.Display.get_default();
        const clipboard = display.get_clipboard();
        const bytes = GLib.Bytes.new(new TextEncoder().encode(text));
        const provider = Gdk.ContentProvider.new_for_bytes(
            'text/plain;charset=utf-8', bytes);
        clipboard.set_content(provider);
    } catch (e) {
        console.warn('[MovieScreensaver] Could not set clipboard:', e.message);
    }
}
