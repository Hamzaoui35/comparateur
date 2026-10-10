# PROJECT STATE
Statut : terminé
Objectif actuel : Phase 3 — données réelles + affiliation mesurable
Dernière étape validée : 5 — déploiement + smoke distant sur les pages réelles + contrôle D1
En cours : aucune
Prochaine action exacte : STOP. Ne pas commencer la phase suivante sans instruction explicite d'Aymen.

## Livré (phase 3)
- `imports/` : données réelles vérifiées (JSON + preuve citée), `scripts/import.mjs` (validation → SQL idempotent par clés naturelles, aucune suppression), process + règles + affiliation + ventes/EPC dans `imports/README.md`.
- Page `/comparatifs/<slug-produit>` : affichage du vendeur marketplace (« vendu par … ») ; 100 % pilotée par D1, liens uniquement via `/go/`, noindex.
- Smoke distant : chaque page de `imports/data/products/` (200, marque/modèle/vendeurs, noindex, 0 lien direct, 1 lien /go/ par offre avec snapshot + UTM, /go/ → 302 https vers le marchand), marqueur final `utm_content=complete`.

## Données réelles (relevé manuel du 2026-10-10 17:55 UTC)
- Dreame H12 Pro FlexReach (EAN 6977328065582) : Dreame boutique officielle, Darty (vendu par Dreame Tech Store), Fnac (vendu par DreameTechStore), BUT — 269 € partout.
- Tineco Floor One S5 Stretch Extreme (EAN 6932485001682) : Carrefour 179 € (promo « 1 acheté = 120€ de remise », conditions non affichées), E.Leclerc 209,99 €, Alternate 253 €, Boulanger 299 €, Darty 299,99 €, Fnac 299,99 €.
- 8 marchands, 10 offres, 10 relevés, 2 pages. Non vérifiable → NULL / unknown (6 livraisons inconnues, 4 disponibilités inconnues). Offres écartées documentées (`excluded_offers`).
- Affiliation : aucune active (`affiliate_url` NULL partout, clics `affiliate_active = 0`).

## Vérifications
- Tests : 33/33 (22 phase 1-2 + 11 import : idempotence, historique, page pilotée par données, HTTPS seul, fixtures interdites, GTIN, non-écrasement). Build OK.
- D1 distante : import contrôlé avant/après, rejeu = 0 changement ; current_offers = 16 (10 réelles + 6 fixtures) ; sales = 0.
- Pipeline Cloudflare (commit 919b4e2) : smoke exécuté 18:11:29Z jusqu'au marqueur `complete` ; « vendu par … » présent → nouveau code déployé.
- D1 smoke : vues internes Dreame + Tineco (phase3/remote) ; clics internes po=9 snap=14 et po=13 snap=18, token 18 car., affiliate_active=0 ; vues/clics business (internal_test=0) = 0.

## Blocages / À faire par Aymen
- Aucun blocage pour la phase 3.
- Pour activer l'affiliation (phase suivante) : s'inscrire à Awin (Darty, Fnac, E.Leclerc, Alternate), Effinity (Boulanger), Kwanko (Carrefour). BUT et Dreame FR : pas de programme pertinent trouvé.
- Avant Awin : passer le token en minuscules (doc ClickRef Awin : lettres minuscules, 50 car. max).

## Décisions prises
- Fixtures phase 1-2 conservées en D1 distante (référencées par les vues/clics de smoke), non indexées ; à dépublier sur décision d'Aymen.
- Offres marketplace hors marché (> 500 €) écartées ; une offre par URL marchand (offre de l'enseigne retenue).
- `in_stock` seulement si « en stock », « disponible » ou date de livraison affichée ; livraison 0 seulement si gratuite sans condition.
- Pas de recommandation éditoriale (`is_recommended = 0`). Aucune migration (schéma 0001 suffisant).
- Dépôt GitHub `Hamzaoui35/comparateur` actuellement public.

## Hors phase 3
Trend Detector, Opportunity/Performance Score, agrégats, Search Console, SEO avancé, levée du noindex, automatisation des prix, multi-sites, dashboard.

Worker : `https://comparateur.aymen-for-pic.workers.dev`
D1 : `comparateur-db` / `60d9a7b4-ef44-464e-9fc7-ebf3a3e71178`
Dernier commit fonctionnel : `919b4e2 phase3: smoke asserts marketplace seller display on real pages`
