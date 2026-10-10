# PROJECT STATE
Statut : en cours
Objectif actuel : Phase 3 — données réelles + affiliation mesurable
Dernière étape validée : Phase 2 terminée (tracking vues + /go/ en production)
En cours : 1 — vérification de l'état réel puis recherche des données réelles
Prochaine action exacte : rechercher et vérifier les offres des 2 produits cibles, puis construire `imports/` + `scripts/import.mjs`

## État vérifié au démarrage de la phase 3 (2026-10-10)
- GitHub `Hamzaoui35/comparateur`, branche main, dernier commit `aed2797 docs: mark phase 2 complete`.
- Local : `npm test` 22/22, `npm run build` OK (installation : `npm install`, pas de package-lock dans le dépôt).
- D1 distante `comparateur-db` (60d9a7b4-ef44-464e-9fc7-ebf3a3e71178) : 16 tables + 1 vue, migration 0001 seule ; fixtures uniquement (2 produits test, 3 marchands .example, 6 offres, 12 relevés, 2 pages, 7 page_offers) ; views 1 (interne), clicks 2 (internes), sales 0.
- Worker `comparateur` présent ; https://comparateur.aymen-for-pic.workers.dev inaccessible depuis le réseau de l'agent → contrôles HTTP via le smoke du pipeline Cloudflare + lecture D1.

## Reste à faire (phase 3)
1. Données réelles vérifiées (2 produits, marchands, offres, relevés, affiliation)
2. Système d'import `imports/` (JSON validé → SQL idempotent par clés naturelles)
3. Tests : import idempotent, historique des prix, page pilotée par les données, URLs HTTP(S) seulement
4. Import en D1 distante + contrôles
5. Smoke étendu aux pages réelles + vérification D1 des vues/clics internes

## Blocages / À faire par Aymen
- (aucun pour l'instant)

## Décisions prises
- Phases 1 et 2 : voir l'historique Git.

## Hors phase 3
Trend Detector, Opportunity/Performance Score, agrégats, Search Console, SEO avancé, levée du noindex, automatisation des prix, multi-sites, dashboard.

Worker : `https://comparateur.aymen-for-pic.workers.dev`
D1 : `comparateur-db` / `60d9a7b4-ef44-464e-9fc7-ebf3a3e71178`
