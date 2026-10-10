# PROJECT STATE
Statut : terminé
Objectif actuel : Phase 2 — tracking serveur vues + clics sortants
Dernière étape validée : validation distante D1 + smoke après déploiement
En cours : aucune
Prochaine action exacte : STOP. Ne pas commencer la phase suivante sans instruction explicite d'Aymen.

## Phase 2 livrée
- Vue comparative : tracking serveur dans `views`.
- HEAD/prefetch/prerender ignorés.
- UTM : source/campaign/content ; aucune IP, cookie, visitor id ou User-Agent brut stocké.
- `internal_test` via `x-comparateur-internal-test: 1`; `bot_suspected` calculé en mémoire.
- Tous les liens marchands passent par `/go/<page_offer_id>?s=<snapshot_id>`.
- Tokens opaques alphanumériques de 18 caractères.
- Snapshot appartenant à l'offre → conservé ; absent/mismatch → NULL sans bloquer la redirection.
- page_offer inconnu → 404 ; destination hors HTTP(S) → refus.
- Une panne d'écriture tracking ne doit pas bloquer un clic vers une destination valide.
- Pipeline Cloudflare : `npm test && npm run build`, puis deploy + smoke distant.

## Vérifications
- Tests : 22/22, 0 échec.
- Build Astro + déploiement Worker : succès.
- Smoke : accueil=200, comparatif=200, /go=302, mismatch=302, go inconnu=404, page inconnue=404.
- D1 vue smoke : source=smoke, campaign=phase2, content=remote, internal_test=1, bot_suspected=0.
- D1 clic valide : token 18 chars, page_offer_id=2, offer_snapshot_id=2, affiliate_active=1.
- D1 clic mismatch : token 18 chars, même page_offer, offer_snapshot_id=NULL, redirection conservée.
- Worker version validée : `ba0d61c8-efd8-4718-ab93-5443a98eeec1`.

## Blocages / À faire par Aymen
- Aucun.

## Hors Phase 2
- Pas encore de vrais produits/marchands.
- Pas encore d'intégration réseau affilié ni propagation d'un sub-ID spécifique au réseau.
- Pas de sales import, agrégats, Performance Score, Trend Detector, SEO ou publication automatique.

Worker : `https://comparateur.aymen-for-pic.workers.dev`
D1 : `comparateur-db` / `60d9a7b4-ef44-464e-9fc7-ebf3a3e71178`
Dernier commit fonctionnel : `844941dd phase2: tolerate Workers rollout in smoke test`
