# PROJECT STATE
Statut : en cours
Objectif actuel : Phase 2 — tracking serveur vues + clics sortants
Dernière étape validée : Phase 1 complète en production
En cours : 1 — couche tracking générique + tests
Prochaine action exacte : implémenter helpers tracking, vue SSR, route /go, liens internes puis tests/smoke distant.

## Critères de fin Phase 2
- Une visite GET normale sur un comparatif publié ajoute une ligne `views`.
- HEAD/prefetch/prerender ne compte pas comme vue.
- Source + utm_campaign + utm_content sont capturés sans cookie/IP/visitor id.
- `internal_test` et `bot_suspected` sont calculés sans stocker le User-Agent brut.
- Tous les boutons marchands passent par `/go/<page_offer_id>?s=<snapshot_id>`.
- /go génère un `tracking_token` opaque alphanumérique <=20 caractères, ajoute `clicks`, puis redirige.
- Snapshot correct → offer_snapshot_id enregistré ; snapshot absent/mismatch → NULL mais redirection conservée.
- page_offer inexistant → 404 ; destination non HTTP(S) → refus.
- Échec de tracking ne bloque jamais un clic marchand valide.
- Tests automatiques + build Cloudflare + smoke distant réussissent.
- D1 distante vérifiée : lignes vues/clics de smoke marquées `internal_test=1`.
- STOP : pas de Trend Detector, score, SEO, import de vrais produits ou intégration réseau dans cette phase.

## Blocages / À faire par Aymen
- Aucun.

## Décisions prises
- Phase 2 réutilise le schéma 0001 : aucune migration supplémentaire nécessaire.
- `source` vue = utm_source sinon `direct`; source clic = utm_source sinon `site`.
- Tests internes automatisés utilisent l'en-tête `x-comparateur-internal-test: 1`.
- Détection bot par heuristique transitoire sur User-Agent ; seul le booléen est persisté.
- Tracking réseau/sub-ID spécifique à chaque plateforme d'affiliation est reporté à l'intégration du réseau ; le token est déjà prêt côté base.

## Vérifications Phase 1 conservées
- npm test : 15/15 ; build Astro + Worker workers.dev : OK.
- D1 : 16 tables métier + current_offers ; seed distant idempotent.
- Smoke phase 1 : accueil=200, comparatif=200, contenu=OK, inconnu=404.

Worker : `https://comparateur.aymen-for-pic.workers.dev`
D1 : `comparateur-db` / `60d9a7b4-ef44-464e-9fc7-ebf3a3e71178`
