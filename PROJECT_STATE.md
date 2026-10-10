# PROJECT STATE
Statut : en cours
Objectif actuel : Phase 3 — données réelles + affiliation mesurable
Dernière étape validée : 4 — import des données réelles en D1 distante (contrôlé)
En cours : 5 — déploiement + smoke distant sur les pages réelles
Prochaine action exacte : après le push, vérifier en D1 les vues/clics internes `utm_campaign = 'phase3'` (dont la vue `utm_content = 'complete'`)

## Livré (phase 3)
- `imports/` : données réelles vérifiées (JSON + preuve citée), `scripts/import.mjs` (validation → SQL idempotent par clés naturelles), process dans `imports/README.md`.
- Page : affichage du vendeur marketplace (« vendu par … ») ; toujours 100 % pilotée par D1, liens uniquement via `/go/`, noindex.
- Smoke distant : pages de `imports/data/products/` contrôlées (200, contenu, aucun lien direct, 1 lien /go/ par offre, /go/ → 302 vers le marchand), marqueur final `utm_content=complete`.

## Données réelles importées (relevé manuel du 2026-10-10 17:55 UTC)
- Dreame H12 Pro FlexReach (EAN 6977328065582) : Dreame boutique officielle, Darty (vendu par Dreame Tech Store), Fnac (vendu par DreameTechStore), BUT — 269 € partout.
- Tineco Floor One S5 Stretch Extreme (EAN 6932485001682) : Carrefour 179 €, E.Leclerc 209,99 €, Alternate 253 €, Boulanger 299 €, Darty 299,99 €, Fnac 299,99 €.
- 8 marchands réels, 10 offres, 10 relevés, 2 pages `/comparatifs/<slug-produit>`. Aucune affiliation active (`affiliate_url` NULL partout).

## Vérifications
- Tests : 33/33 (22 phase 1-2 + 11 import). Build OK.
- D1 distante avant import : aucune donnée réelle ni conflit (slug, GTIN, domaine, URL).
- D1 distante après import : 4 produits (2 réels + 2 fixtures), 11 marchands, 16 offres, 22 relevés, 4 pages, 17 page_offers, current_offers = 16, sales = 0.
- Rejeu distant (page, page_offer, relevé) : 0 changement. Rejeu local complet ×2 : 0 doublon.
- Local : page réelle 200, 0 lien direct, 4 et 6 liens /go/, /go/ → 302 darty.com, clic `affiliate_active = 0`, `internal_test = 1`.

## Blocages / À faire par Aymen
- Affiliation : s'inscrire aux programmes (Awin : Darty, Fnac, E.Leclerc, Alternate · Effinity : Boulanger · Kwanko : Carrefour). Détails dans `imports/data/merchants.json`.

## Décisions prises
- Fixtures phase 1-2 conservées en D1 distante (référencées par les vues/clics de smoke), non indexées ; à dépublier sur décision d'Aymen.
- Offres marketplace hors marché (> 500 €) écartées et documentées (`excluded_offers`).
- Pas de recommandation éditoriale (`is_recommended = 0`) tant qu'aucun verdict n'est écrit.
- Aucune migration : le schéma 0001 suffit.

## Hors phase 3
Trend Detector, Opportunity/Performance Score, agrégats, Search Console, SEO avancé, levée du noindex, automatisation des prix, multi-sites, dashboard.

Worker : `https://comparateur.aymen-for-pic.workers.dev`
D1 : `comparateur-db` / `60d9a7b4-ef44-464e-9fc7-ebf3a3e71178`
