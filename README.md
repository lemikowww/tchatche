# Tchatche

Jeu d’humour entre amis, jouable en ligne depuis n’importe quel navigateur (téléphone, tablette, ordinateur) : on écrit un secret sur un copain, et un jury choisi en secret décide s’il faut le révéler.

## Lancer le jeu chez toi

Prérequis : [Node.js](https://nodejs.org) version 18 ou plus. Il n’y a aucune dépendance à installer.

```
node server.js
```

Ouvre ensuite http://localhost:3000. Pour jouer avec des amis sur le même Wi-Fi, ils ouvrent `http://<adresse IP de ton ordinateur>:3000`.

## Mettre le jeu en ligne

Il faut un hébergeur qui exécute Node.js en continu (pas un hébergement de simple page web). Exemple avec Render (offre gratuite) :

1. Mets le dossier sur GitHub.
2. Sur render.com, crée un « Web Service » relié à ce dépôt.
3. Commande de démarrage : `node server.js`. Pas de commande de build.
4. Render te donne une adresse en https, que tes amis ouvrent directement.

Railway, Fly.io ou un petit serveur à toi (VPS) fonctionnent aussi. Le port est lu dans la variable `PORT`.

À savoir : sur l’offre gratuite de Render, le serveur s’endort après un moment sans visite, et le premier chargement prend alors environ une minute. Les parties en cours sont perdues si le serveur redémarre (voir « Limites »).

## Règles implémentées (mode principal)

- **Salon** : l’hôte crée la partie, un code de 7 caractères (ex. Bimapo4) et un QR code s’affichent. De 4 à 36 joueurs. On ne peut plus rejoindre une partie commencée. L’hôte choisit le nombre de manches, de 3 à 40.
- **Têtes** : chaque joueur dessine la tête d’un autre joueur tiré au sort (60 s), en cercle fermé : Sam dessine Lola, Lola dessine Léo, etc. Le dessin devient la photo de profil du joueur dessiné pour toute la partie.
- **L’écran de jeu** : une ronde montre les photos de profil de tous les joueurs, avec l’ampoule au centre. Quand quelqu’un écrit, sa photo s’illumine.
- **Une manche** :
  1. Le jeu choisit un écrivain (chacun son tour, dans un ordre mélangé) et une cible tirée au sort parmi les autres. L’écrivain voit la cible et écrit un texte à son sujet (60 s, 200 caractères). Les autres voient seulement « X écrit… ».
  2. Le texte est montré en secret à des votants tirés au sort (un tiers des joueurs, au moins 2, ni l’écrivain ni la cible). Personne ne sait qui ils sont. Ils votent « révéler » ou « garder le secret » (25 s).
  3. Si plus de la moitié des votants dit « révéler », le texte est révélé à tout le monde avec la photo de la cible, et on voit sa réaction (en vrai ou en appel vidéo). Sinon, il reste secret. En cas d’égalité, il reste secret.
  4. Les joueurs qui ne votent pas voient l’ampoule : « Tu n’as pas été désigné pour voter. Attends que les autres votent. »
- **Fin** : après le nombre de manches choisi, un écran récapitule les secrets révélés. Pas de points pour l’instant. L’hôte peut relancer une partie.
- Une étape se termine dès que tous les joueurs concernés ont répondu. Si l’écrivain ne répond pas, la manche est sautée. Un joueur déconnecté peut revenir en rouvrant la page.
- Le serveur ne transmet un secret qu’aux joueurs autorisés : un texte n’arrive jamais sur l’appareil de quelqu’un qui n’a pas le droit de le voir.

Les durées sont dans le haut de `server.js` (objet `D`), ainsi que le minimum et le maximum de joueurs.

## Fichiers

- `server.js` : le serveur. Il garde l’état de chaque partie en mémoire et décide de tout (étapes, minuteurs, votes). Les joueurs ne peuvent donc pas tricher, et les secrets ne sont envoyés qu’aux joueurs autorisés.
- `public/index.html` : la structure de la page. `public/style.css` : tout le style (couleurs, polices, animations). `public/game.js` : l’interface du jeu.
- `public/icone-tchatche.svg` : l’icône. `public/manifest.webmanifest` : permet d’ajouter le site à l’écran d’accueil du téléphone. `public/robots.txt`.
- `package.json`, `render.yaml` (déploiement Render), `.gitignore`.

Le temps réel utilise les Server-Sent Events : le serveur envoie l’état à chaque joueur, et les joueurs répondent par de simples requêtes. Cela passe partout et ne demande aucune bibliothèque.

## Protections pour la version publique

- Chaque joueur a un **jeton secret** (jamais diffusé aux autres) : personne ne peut se faire passer pour quelqu’un d’autre.
- Les codes de partie ont plus de 6 millions de combinaisons, et les essais ratés sont limités par adresse IP.
- Limites de débit : 900 requêtes par minute et 20 créations de partie par 10 minutes, par adresse IP (assez large pour 36 amis sur le même Wi-Fi). 800 parties simultanées au maximum.
- Taille des messages limitée, dessins vérifiés (JPEG ou PNG uniquement), tous les textes des joueurs sont échappés à l’affichage.
- En-têtes de sécurité (politique de contenu, pas d’affichage dans un cadre externe, etc.) et adresse de contrôle `/health`.
- Aucune donnée personnelle n’est enregistrée : tout est en mémoire, et les parties inactives sont effacées après 3 heures.

## Mettre le site en ligne (exemple avec Render, offre gratuite)

1. Crée un compte sur github.com et un dépôt, puis envoie-y le contenu de ce dossier (le fichier `server.js` doit être à la racine du dépôt).
2. Sur render.com, choisis « New » puis « Blueprint » (ou « Web Service »), et relie ton dépôt GitHub. Le fichier `render.yaml` règle tout : commande de démarrage `node server.js`, adresse de contrôle `/health`.
3. Au bout de quelques minutes, Render te donne une adresse en https (du style tchatche.onrender.com). C’est l’adresse que tu partages.
4. Pour avoir ta propre adresse (ex. tchatche.fr), achète un nom de domaine, puis ajoute-le dans les réglages « Custom Domains » de Render.

À savoir : sur l’offre gratuite, le serveur s’endort sans visite et le premier chargement prend alors environ une minute (l’écran de chargement avec l’ampoule s’affiche pendant ce temps). Une offre payante supprime cet endormissement. Il faut un seul serveur : les parties sont en mémoire, donc ne lance pas plusieurs copies.

## Limites de cette version

- **Pas de sauvegarde** : un redémarrage du serveur efface les parties en cours.
- **Un seul serveur** : pour en lancer plusieurs, il faudrait stocker les parties dans une base partagée (par exemple Redis).
- **Pas de modération automatique** : les textes sont affichés tels quels. Le jeu est pensé pour des amis qui se connaissent, et un texte n’est révélé que si la majorité des votants le décide. Pense à un bouton de signalement et à des mentions légales si le site devient très public.
- **Pas de retrait d’un joueur par l’hôte** pour l’instant.
- **QR code** : généré dans le navigateur avec une bibliothèque chargée depuis cdnjs. Sans elle, le code à 7 caractères reste utilisable.

## Pistes pour la suite

Nom de domaine à toi, fichier d’installation sur l’écran d’accueil du téléphone (PWA), sons et animations, thèmes de situations, bouton « passer » pour l’hôte, historique des meilleures réponses, filtres de contenu.

## Écran de chargement, animations et erreurs

- **Chargement** : au lancement du site et pendant les attentes du serveur, l’icône de l’app s’affiche (la ronde des 5 personnages tourne autour de l’ampoule).
- **Animations** : transitions entre écrans, lettres du titre qui apparaissent, boutons qui rebondissent, minuteur qui s’accélère dans les 5 dernières secondes, ronde dont la photo de celui qui écrit s’illumine, révélation en effet d’apparition, confettis à la fin. Elles sont désactivées automatiquement pour les personnes qui ont réduit les animations sur leur appareil.
- **Mascotte** : l’ampoule désolée apparaît quand la connexion est perdue (le jeu se reconnecte seul), quand le code est inconnu, quand la partie a déjà commencé ou est pleine, et sur une page introuvable. L’ampoule joyeuse accompagne les écrans d’attente.
