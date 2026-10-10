# PROJECT STATE
Statut : bloqué (GitHub publié ; reste uniquement Cloudflare distant)
Objectif actuel : Phase 1 — fondation
Dernière étape validée : 10 — preuves de généricité A, B, C (en local)
En cours : 4, 5, 7 et parties distantes de 8–9 — en attente d'identifiants Cloudflare
Prochaine action exacte : avec les identifiants Cloudflare, lancer dans l'ordre :
  1. `npx wrangler d1 create comparateur-db` → copier le database_id dans wrangler.jsonc
  2. `npm run db:migrate:remote` puis `npm run db:seed:remote` (deux fois)
  3. `npm run deploy` → ouvrir https://comparateur.<sous-domaine>.workers.dev/comparatifs/produit-test-a-meilleur-prix
  4. cocher 4, 5, 7, 8 (distant), 9 (distant) ci-dessous, commit, push → Statut : terminé

## Reste à faire
- 4 déploiement workers.dev · 5 `wrangler d1 list` (base distante) · 7 migration distante
- 8 seed distant (2 passages) · 9 pages de test vérifiées sur l'URL workers.dev

## Blocages / À faire par Aymen
- Cloudflare : aucun identifiant dans l'environnement de l'agent. Soit `npx wrangler login` sur ton poste, soit un jeton d'API (Workers Scripts : Edit, D1 : Edit) dans CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID.

## Décisions prises
- GitHub : projet publié dans `Hamzaoui35/comparateur` via le connecteur. Le snapshot final local jusqu'à `ca3df22` est importé ; le connecteur n'a pas pu préserver les 5 commits locaux originaux dans le dépôt distant vide. À partir de maintenant, l'historique distant devient la source de vérité.
- Template officiel inaccessible (téléchargement GitHub bloqué par le réseau de l'agent) : projet monté à la main avec les paquets officiels (astro 7, @astrojs/cloudflare 14, wrangler 4). Configuration équivalente au template.
- Colonne `group` conservée (mot réservé SQL) : toujours entre guillemets doubles.
- Seeds par clés naturelles, sans id explicite : les id explicites entraient en collision avec un relevé ajouté pendant la preuve A (ligne perdue en silence). Test de non-régression ajouté.
- Une page n'est servie que si `published_at` est renseigné (brouillon → 404).
- Tests sans dépendance : `node --test` + `node:sqlite` en mémoire sur les migrations et seeds du dépôt.
- `npm test` lancé avec `--experimental-strip-types` : les tests importent du TypeScript (src/lib), ce qui exige ce drapeau sur les Node 22 antérieurs à 22.18.

## Vérifications (preuve en 1 ligne)
- 1 : `npm run build` → « Complete! »
- 3 : `npm run preview` → GET / = 200, meta robots noindex présente
- 5 (local) : binding DB dans wrangler.jsonc ; `wrangler types` → `DB: D1Database`
- 6 : base locale recréée de zéro → migration OK, 16 tables + 1 vue ; index partiel page_offers testé (2 actives refusées, fermées + 1 active acceptées)
- 8 (local) : seed appliqué 2 fois → 2 produits, 3 marchands, 6 offres, 12 relevés, 2 pages, 7 page_offers (aucun doublon)
- 9 (local) : /comparatifs/produit-test-a-meilleur-prix 200, ordre conforme (livraison connue → inconnue → rupture), « Livraison à vérifier », liens sponsored nofollow ; slug inconnu → 404
- 10A : relevé inséré en base → prix affiché 209,00 € → 205,00 € sur le serveur en cours, src/ inchangé
- 10B : seed/exemple-ajout-produit.sql (2 passages) → /comparatifs/produit-test-c-meilleur-prix passe de 404 à 200 avec ses 2 offres
- 10C : `npm test` 15/15 (avec `--experimental-strip-types`, Node 22.22) ; un « Dreame » ajouté dans src/ fait échouer le test (vérifié puis retiré)

Dernier commit : (voir `git log --oneline -1`)
