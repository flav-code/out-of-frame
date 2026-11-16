# Out of Frame

Extension Chrome open source qui met un écran noir sur les sites de votre choix (Gmail, Stripe, votre panel admin…) pendant que vous streamez.

Disponible en anglais, français, espagnol, allemand et portugais (Brésil), selon la langue de Chrome.

## Ce que ça fait, et ce que ça ne fait pas

Quand le mode stream est actif, chaque site de votre liste devient noir, **pour vous comme pour ceux qui regardent votre écran**. Son titre d'onglet devient « 🔒 Masqué », parce que Gmail y affiche sinon l'objet du mail et votre adresse.

Une page web ne peut pas se cacher d'une capture d'écran comme le fait Netflix : le noir de Netflix vient du DRM, qui ne marche que pour de la vidéo protégée, et macOS n'offre aucune API pour exclure une fenêtre des captures. Out of Frame noircit donc la page à l'écran. Discord, OBS ou Zoom transmettent ce qu'ils voient, c'est-à-dire du noir.

Le mode ne s'active pas tout seul quand vous lancez un stream : l'app Discord ne prévient pas Chrome. Activez-le avant de streamer, ou laissez-le toujours actif et coupez-le le temps de lire vos mails hors stream.

## Installer

1. Téléchargez ce dépôt (bouton **Code**, puis **Download ZIP**, à décompresser) ou clonez-le : `git clone https://github.com/flav-code/out-of-frame.git`. Gardez le dossier à cet endroit : Chrome recharge l'extension depuis lui.
2. Ouvrez `chrome://extensions` et activez le **Mode développeur**.
3. Cliquez sur **Charger l'extension non empaquetée** et choisissez le dossier téléchargé.
4. Épinglez l'icône (pièce de puzzle 🧩 à droite de la barre d'adresse, puis la punaise) pour voir le badge **ON**.
5. Les réglages s'ouvrent : listez vos sites.

## Utiliser

- <kbd>Alt+Shift+H</kbd> (<kbd>⌥⇧H</kbd> sur Mac) ou un clic sur l'icône active ou coupe le mode stream. L'icône affiche **ON** quand il est actif.
- Réglages : clic droit sur l'icône, puis **Options**. Le raccourci se change dans `chrome://extensions/shortcuts`.
- L'écran est entièrement noir par défaut. Vous pouvez y ajouter un texte dans les réglages.

Une règle par ligne :

| Règle | Ce qui est caché |
|---|---|
| `mail.google.com` | Gmail : le domaine et ses sous-domaines |
| `example.com/admin` | toutes les URL qui commencent par `example.com/admin` |
| `localhost:3000` | ce port seulement |
| `*admin*` | toute URL qui contient « admin » |
| `*` | tous les sites |

## Fiabilité

Mesuré dans Chrome 157 :

- **Ouvrir un site listé** pendant que le mode est actif : la page est noire dès sa création, avant que Chrome dessine quoi que ce soit (30 chargements sur 30). Pendant que le mode est actif, Chrome noircit chaque nouvelle page avec une feuille de style, puis l'extension libère celles qui ne sont pas listées. Un site non listé peut donc rester noir une fraction de seconde au chargement.
- **Activer le mode** sur une page affichée : la page est noire en moins de 20 ms, puis à la prochaine image de l'écran.
- **Revenir sur un onglet** déjà noir, revenir en arrière dans l'historique, ou rouvrir un onglet que Chrome avait mis en veille : la page reste noire.

Ce qui reste visible :

- La barre d'adresse : l'URL de l'onglet et les suggestions quand vous tapez.
- Les notifications de Gmail, que macOS affiche hors de la page. Coupez-les ou activez « Ne pas déranger ».
- Les pages internes de Chrome (`chrome://…`, Chrome Web Store), où aucune extension ne peut agir.
- Un site listé affiché dans une iframe d'un site non listé.

Non testé : si vous activez le mode alors qu'un onglet sensible est en arrière-plan, Chrome pourrait réafficher une fraction de seconde sa dernière image quand vous revenez dessus. Activez plutôt le mode pendant que l'onglet sensible est affiché, ou repassez une fois sur chaque onglet sensible avant de lancer le stream.

## Développer

Pas de build ni de dépendance. Tests : `node --test`. Ajouter une langue : copiez `_locales/en/messages.json` dans `_locales/<code>/` et traduisez.

## Licence

[MIT](LICENSE)
