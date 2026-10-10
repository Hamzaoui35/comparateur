# PROJECT STATE
Statut : en cours
Objectif actuel : Phase 4 — affiliation réelle + préparation lancement public
Dernière étape validée : Phase 3 complète (données réelles + tracking en production)
En cours : 1 — rendre le tracking compatible avec les premiers réseaux.
Prochaine action exacte : valider le nouveau token lowercase en CI/Cloudflare, puis brancher les liens Awin/Effinity/Kwanko après acceptation d'Aymen.

## Phase 4 — périmètre
- Préparer le tracking pour les réseaux réels sans casser les clics historiques.
- Intégrer chaque réseau uniquement après acceptation et à partir de sa documentation officielle.
- Conserver merchant_url comme fallback tant qu'aucun lien affilié valide n'est disponible.
- Ne jamais favoriser une offre affiliée dans le classement.

## Décisions
- Les nouveaux tracking_token utilisent 18 caractères [a-z0-9].
- Les anciens tokens restent inchangés en base : aucune migration.
- Aucune affiliate_url active à ce stade.

## Action humaine nécessaire
- Awin : candidater à Darty, Fnac, E.Leclerc, Alternate.
- Effinity : candidater à Boulanger.
- Kwanko : candidater à Carrefour.
- Ne jamais mettre de secret dans GitHub ou dans le chat.

## État actuel
- Dreame H12 Pro FlexReach : 4 offres.
- Tineco Floor One S5 Stretch Extreme : 6 offres.
- Tests avant Phase 4 : 33/33.
- sales = 0 ; affiliate_url = NULL partout.
- Worker : `https://comparateur.aymen-for-pic.workers.dev`
- D1 : `comparateur-db`

STOP si l'activation d'un réseau exige une acceptation contractuelle non encore faite.
