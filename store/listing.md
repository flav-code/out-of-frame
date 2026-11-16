# Chrome Web Store listing

Everything the [developer dashboard](https://chrome.google.com/webstore/devconsole) asks for, ready to paste. Before the first upload you need a Chrome Web Store developer account (one-time registration fee) with a verified contact email.

## 1. Package

```sh
sh scripts/package.sh
```

It writes `dist/out-of-frame-<version>.zip` with the extension files only: no tests, docs or store images. In the dashboard, click **New item** and upload the ZIP. For an update, raise `version` in `manifest.json` first.

## 2. Store listing tab

| Field | Value |
|---|---|
| Name and summary | Read from the ZIP (`manifest.json`, translated in `_locales`) |
| Category | Privacy & Security if the dashboard lists it, otherwise Tools |
| Language | English, then add French with the description below |
| Store icon | `icons/128.png` |
| Screenshots | `store/screenshot-1.png`, `store/screenshot-2.png`, `store/screenshot-3.png` |
| Small promo tile | `store/promo-small.png` |
| Homepage URL | https://github.com/flav-code/out-of-frame |
| Support URL | https://github.com/flav-code/out-of-frame/issues |

### Description (English)

```text
Out of Frame puts a black screen over the websites you choose while stream mode is on: your inbox, your payment dashboard, your admin panel, or every site.

The page turns black on your own screen, so whatever shares it (Discord, OBS, Zoom, Meet…) only broadcasts black. It's black for you too: a web page can't hide itself from a screen capture, so this is the reliable way to make sure a stray tab switch never shows your email on stream.

• One shortcut, Alt+Shift+H (⌥⇧H on Mac), or a click on the icon turns stream mode on or off. The icon shows ON while it's on.
• Choose sites by domain (subdomains included), by path (example.com/admin), with wildcards (*admin*), or hide every site with *.
• While stream mode is on, new pages are black from the moment they're created, before Chrome draws anything.
• Tab titles are masked too, so the tab bar doesn't give away email subjects.
• Plain black by default. Add your own text if you like.
• Available in English, French, Spanish, German and Brazilian Portuguese.

Turn stream mode on before you go live: Chrome can't tell when another app is sharing your screen.

Privacy: nothing leaves your computer. Your settings stay in Chrome's local storage, with no tracking or analytics.

Open source (MIT): https://github.com/flav-code/out-of-frame
```

### Description (français)

```text
Out of Frame met un écran noir sur les sites de votre choix quand le mode stream est actif : votre messagerie, votre tableau de bord de paiement, votre panel admin, ou tous les sites.

La page devient noire sur votre propre écran, donc ce qui la partage (Discord, OBS, Zoom, Meet…) ne diffuse que du noir. Elle est noire pour vous aussi : une page web ne peut pas se cacher d'une capture d'écran, et c'est la façon fiable d'éviter qu'un changement d'onglet montre vos mails en plein stream.

• Un raccourci, Alt+Maj+H (⌥⇧H sur Mac), ou un clic sur l'icône active ou coupe le mode stream. L'icône affiche ON quand il est actif.
• Choisissez les sites par domaine (sous-domaines compris), par chemin (example.com/admin), avec des jokers (*admin*), ou cachez tous les sites avec *.
• Quand le mode stream est actif, les nouvelles pages sont noires dès leur création, avant que Chrome dessine quoi que ce soit.
• Les titres d'onglets sont masqués aussi : la barre d'onglets ne révèle pas l'objet de vos mails.
• Noir uni par défaut, avec un texte optionnel.
• Disponible en anglais, français, espagnol, allemand et portugais (Brésil).

Activez le mode avant de lancer votre live : Chrome ne peut pas savoir quand une autre application partage votre écran.

Confidentialité : rien ne quitte votre ordinateur. Vos réglages restent dans le stockage local de Chrome, sans pistage ni statistiques.

Open source (MIT) : https://github.com/flav-code/out-of-frame
```

## 3. Privacy tab

**Single purpose**

```text
While stream mode is on, Out of Frame puts a black screen over the websites the user lists, so they don't show up when the user shares or records their screen.
```

**Permission justifications**

`storage`

```text
Saves the user's settings on the device with chrome.storage.local: the list of sites to hide, the stream mode switch and the optional text shown on the black screen.
```

`scripting`

```text
Two uses. When the extension is installed or updated, it adds its content script to the tabs that are already open, so they can be covered too. While stream mode is on, it registers a stylesheet that makes new pages start black before Chrome draws them, so a listed site never flashes on screen while the settings load.
```

Host permission (`<all_urls>`)

```text
The user chooses which sites to hide, and that can be any site, or every site. The content script has to run on every page to compare its address with the user's list and put the black screen on top. It doesn't collect, store or send page content.
```

**Remote code:** No, I am not using remote code.

**Data usage:** leave every data type unchecked, because the extension collects nothing. Tick the three certifications: no selling or transferring of user data, no use unrelated to the single purpose, no use for creditworthiness or lending.

**Privacy policy URL:** https://github.com/flav-code/out-of-frame/blob/main/PRIVACY.md

## 4. Distribution tab

Free, public, all regions.

## Review

Access to every site usually triggers a warning that the extension may need an in-depth review, so the first review can take longer than usual. The justifications above explain why the access is needed.
