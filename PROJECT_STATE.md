# PROJECT STATE
Statut : terminé
Objectif actuel : Phase 1 — fondation
Dernière étape validée : 10 — preuves de généricité + validation distante
En cours : aucune
Prochaine action exacte : STOP. Ne pas commencer la phase 2 sans instruction explicite d'Aymen.

## Reste à faire
- Aucun élément bloquant pour la phase 1.
- Optionnel : ajouter un lockfile au dépôt pour activer le cache de dépendances Cloudflare Builds.

## Blocages / À faire par Aymen
- Aucun.

## Décisions prises
- Dépôt GitHub : `Hamzaoui35/comparateur` ; l'historique distant est la source de vérité.
- Cloudflare Workers Builds : build `npm run build`, deploy `npx wrangler deploy && node scripts/smoke-remote.mjs`.
- Les changements Markdown racine / docs sont exclus des builds de production.
- Worker public : `https://comparateur.aymen-for-pic.workers.dev`.
- D1 : `comparateur-db`, id `60d9a7b4-ef44-464e-9fc7-ebf3a3e71178`, région WEUR.
- Migration `0001_init.sql` appliquée et enregistrée dans `d1_migrations`.
- Astro 7 + @astrojs/cloudflare 14 utilisent l'entrée unifiée `@astrojs/cloudflare/entrypoints/server`.
- Le smoke test distant reste dans `scripts/smoke-remote.mjs` et s'exécute après chaque déploiement de production.

## Vérifications
- `npm test` local : 15/15.
- Build Astro Cloudflare : succès.
- Worker : déploiement réussi sur workers.dev.
- D1 distante : 16 tables métier + vue `current_offers`.
- Seed distant : 2 produits, 3 marchands, 6 offres, 12 snapshots, 2 pages, 7 page_offers.
- Seed distant exécuté une 2e fois : 0 écriture, donc idempotent.
- Smoke distant Cloudflare : `accueil=200 comparatif=200 contenu=OK inconnu=404`.
- Comparatif distant : contient `Produit Test A`, `Livraison à vérifier`, `noindex` et liens `sponsored nofollow`.
- Preuves A/B/C de généricité : validées.

Dernier commit fonctionnel : `37b68ad test: add post-deploy remote smoke checks`
