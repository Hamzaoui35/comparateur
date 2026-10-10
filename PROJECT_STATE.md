# PROJECT STATE
Statut : bloqué (GitHub publié ; reste uniquement Cloudflare distant)
Objectif actuel : Phase 1 — fondation
Dernière étape validée : 10 — preuves de généricité A, B, C (en local)
En cours : 4, 5, 7 et parties distantes de 8–9 — en attente d'identifiants Cloudflare
Prochaine action exacte :
  1. Sur un poste connecté à Internet : `npm install` puis `npm run cf-typegen`
  2. `npx wrangler login`
  3. `npx wrangler d1 create comparateur-db` → copier le database_id dans wrangler.jsonc
  4. `npm run db:migrate:remote` puis `npm run db:seed:remote` deux fois
  5. `npm run deploy` → ouvrir /comparatifs/produit-test-a-meilleur-prix
  6. vérifier le distant, mettre Statut : terminé, commit/push

## Reste à faire
- Générer package-lock.json avec `npm install` et les types avec `npm run cf-typegen` (le connecteur GitHub n'a pas pu transférer ces 2 gros fichiers générés)
- 4 déploiement workers.dev · 5 D1 distante · 7 migration distante
- 8 seed distant (2 passages) · 9 pages de test vérifiées sur workers.dev

## Blocages / À faire par Aymen
- Cloudflare : aucun identifiant dans l'environnement de l'agent. Faire `npx wrangler login` sur ton poste, ou fournir un jeton via variables d'environnement (jamais dans le chat).

## Décisions prises
- GitHub : source du projet publiée dans `Hamzaoui35/comparateur` via le connecteur. Le connecteur n'a pas pu préserver les 5 commits locaux originaux ni transférer package-lock.json / worker-configuration.d.ts ; le code source, schéma, migrations, seeds, tests et mémoire projet sont présents. À partir de maintenant, l'historique distant est la source de vérité.
- Versions directes npm figées dans package.json ; package-lock sera régénéré avec `npm install`. worker-configuration.d.ts est généré par `npm run cf-typegen` et ignoré par Git.
- Template officiel inaccessible lors de la session initiale : projet monté avec les paquets officiels Astro/Cloudflare.
- Colonne `group` conservée : toujours entre guillemets doubles.
- Seeds par clés naturelles, sans id explicite.
- Une page n'est servie que si `published_at` est renseigné.
- Tests : node --test + node:sqlite ; npm test utilise --experimental-strip-types.

## Vérifications
- build local initial : OK
- migration locale : 16 tables + 1 vue ; index partiel page_offers testé
- seed local 2 fois : aucun doublon
- page comparative locale : ordre livraison connue → inconnue → rupture, 404 OK
- preuve A : nouveau snapshot modifie le prix sans code
- preuve B : 3e produit ajouté uniquement par données
- preuve C : test anti-marque en dur
- npm test : 15/15

Dernier commit distant : voir `git log --oneline -1`
