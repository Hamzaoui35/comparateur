# PROJECT STATE
Statut : bloqué (D1 distant terminé ; reste le déploiement du vrai build Astro)
Objectif actuel : Phase 1 — fondation
Dernière étape validée : 8 — seed distant rejouable sans doublon
En cours : 4 et 9 (distant) — déploiement Worker Astro
Prochaine action exacte :
  1. Dans Cloudflare Dashboard, autoriser une fois l'intégration GitHub / Workers Builds pour le dépôt `Hamzaoui35/comparateur`.
  2. Reprendre avec l'agent : créer/configurer le Worker depuis ce dépôt, build `npm run build`, deploy `npm run deploy`.
  3. Vérifier l'URL workers.dev et /comparatifs/produit-test-a-meilleur-prix, puis mettre Statut : terminé.

## Reste à faire
- 4 : déployer le vrai build Astro sur workers.dev
- 9 (distant) : vérifier page comparative publique + 404

## Blocages / À faire par Aymen
- Cloudflare Workers Builds refuse la connexion API au dépôt tant que l'intégration GitHub Cloudflare n'a pas été autorisée une première fois. D1 et GitHub sont déjà terminés.

## Décisions prises
- D1 créée via API Cloudflare dans la région WEUR : `comparateur-db`, id `60d9a7b4-ef44-464e-9fc7-ebf3a3e71178`.
- Migration 0001 appliquée via API puis enregistrée dans la table Wrangler-compatible `d1_migrations` sous `0001_init.sql`, afin que Wrangler ne la rejoue pas plus tard.
- Seed distant appliqué 2 fois : second passage = 0 écriture, donc idempotence confirmée.
- GitHub : source du projet publiée dans `Hamzaoui35/comparateur`; l'historique distant est la source de vérité.
- Versions directes npm figées ; worker-configuration.d.ts générable par `npm run cf-typegen`.
- Colonne `group` toujours entre guillemets doubles ; seeds par clés naturelles ; page servie uniquement si `published_at` non NULL.

## Vérifications
- build local initial : OK
- npm test local : 15/15
- D1 distante : 16 tables métier + vue `current_offers` (+ tables internes Cloudflare / migrations)
- seed distant : 2 produits, 3 marchands, 6 offres, 12 snapshots, 2 pages, 7 page_offers
- seed distant 2e passage : 0 changement
- `d1_migrations` : 0001_init.sql enregistré
- page comparative locale : ordre livraison connue → inconnue → rupture, 404 OK
- preuves A/B/C de généricité : validées en local

Dernier commit distant : voir `git log --oneline -1`
