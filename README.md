# Out of Frame

[Français](README.fr.md)

Open-source Chrome extension that puts a black screen over the sites you choose (Gmail, Stripe, your admin panel…) while you stream.

Available in English, French, Spanish, German and Brazilian Portuguese, following Chrome's language.

## What it does, and what it doesn't

While stream mode is on, every site on your list turns black, **for you and for anyone watching your screen**. Its tab title becomes "🔒 Hidden", because Gmail would otherwise show the email subject and your address there.

A web page can't hide itself from a screen capture the way Netflix does: Netflix's black screen comes from DRM, which only works for protected video, and macOS offers no API to exclude a window from captures. So Out of Frame blacks out the page on your screen, and Discord, OBS or Zoom broadcast what they see: black.

The mode doesn't turn on by itself when you go live, because the Discord app doesn't tell Chrome. Turn it on before you stream, or leave it on all the time and switch it off just long enough to read your email off stream.

## Install

1. Download this repository (**Code** button, then **Download ZIP**, and unzip it) or clone it: `git clone https://github.com/flav-code/out-of-frame.git`. Keep the folder where it is: Chrome reloads the extension from it.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and pick the downloaded folder.
4. Pin the icon (puzzle piece 🧩 right of the address bar, then the pin) to see the **ON** badge.
5. The settings open: list your sites.

## Use

- <kbd>Alt+Shift+H</kbd> (<kbd>⌥⇧H</kbd> on Mac) or a click on the icon turns stream mode on or off. The icon shows **ON** while it's on.
- Settings: right-click the icon, then **Options**. Change the shortcut at `chrome://extensions/shortcuts`.
- The screen is plain black by default. You can add a text to it in the settings.

One rule per line:

| Rule | What gets hidden |
|---|---|
| `mail.google.com` | Gmail: the domain and its subdomains |
| `example.com/admin` | every URL that starts with `example.com/admin` |
| `localhost:3000` | that port only |
| `*admin*` | any URL that contains "admin" |
| `*` | every site |

## Reliability

Measured in Chrome 157:

- **Opening a listed site** while the mode is on: the page is black from the moment it's created, before Chrome draws anything (30 loads out of 30). While the mode is on, Chrome blacks out every new page with a stylesheet, then the extension releases the ones that aren't listed. A site that isn't listed can therefore stay black for a split second while it loads.
- **Turning the mode on** over a page on screen: the page is black within 20 ms, then on the next screen refresh.
- **Coming back to a tab** that's already black, going back in history, or reopening a tab Chrome had put to sleep: the page stays black.

What stays visible:

- The address bar: the tab's URL, and the suggestions as you type.
- Gmail notifications, which macOS shows outside the page. Turn them off or use Do Not Disturb.
- Chrome's internal pages (`chrome://…`, Chrome Web Store), where no extension can act.
- A listed site shown inside an iframe of a site that isn't listed.

Not tested: if you turn the mode on while a sensitive tab is in the background, Chrome might show its last frame for a split second when you switch back to it. Turn the mode on while the sensitive tab is on screen instead, or visit each sensitive tab once before you go live.

## Develop

No build step, no dependencies. Unit tests: `node --test`. End-to-end check in a real Chrome, which also prints the timings above: `node scripts/e2e.mjs` (set `CHROME` to your Chrome binary if it isn't in the default macOS location). To add a language, copy `_locales/en/messages.json` to `_locales/<code>/` and translate it. The icons are rendered from `icons/icon.svg`.

## License

[MIT](LICENSE)
