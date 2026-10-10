# imports/ — données commerciales réelles (production)

Séparation stricte :
- `seed/` = fixtures de développement (MarqueTest, domaines `.example`). Jamais en production comme données réelles.
- `imports/data/` = données réelles vérifiées. Le validateur refuse tout marqueur de fixture.
- `tests/fixtures/imports/` = fixtures du système d'import (tests uniquement).

## Chaîne

```
source vérifiée (page marchand / fabricant, API ou flux autorisé)
→ imports/data/*.json (Git = trace de la preuve)
→ node scripts/import.mjs --check        (validation)
→ node scripts/import.mjs --out …sql      (SQL idempotent, clés naturelles)
→ D1 (wrangler d1 execute --file, ou connecteur D1)
→ contrôle : comptes + current_offers
```

Commandes : `npm run import:check` · `npm run import:sql` · `npm run import:local` · `npm run import:remote`.

## Fichiers

| Fichier | Contenu | Clé naturelle |
|---|---|---|
| `data/merchants.json` | marchands + statut d'affiliation documenté | `domain` |
| `data/products/<slug>.json` | produit, médias autorisés éventuels, page `/comparatifs/<slug>`, offres, offres écartées | `product.slug`, `page.slug`, `merchant_url` |
| `data/snapshots/<AAAA-MM-JJ>.json` | un lot de relevés datés | (offre, `checked_at`, `source`) |

Un nouveau relevé de prix = un **nouveau fichier** dans `snapshots/` (jamais une modification d'un lot existant) : l'historique reste dans `offer_snapshots`, le plus récent devient courant dans `current_offers`.

## Règles de vérification (aucune valeur inventée)

- Chaque valeur vient de la page du marchand ou du fabricant lue à la date du lot ; la citation est conservée dans `evidence`.
- Non affiché ou ambigu → `null` (texte, GTIN, MPN, livraison) ou `unknown` (disponibilité).
- `shipping_cents` : `0` uniquement si la page affiche une livraison gratuite **sans condition** ; « à partir de », astérisque ou conditions non visibles → `null` (= livraison inconnue, jamais gratuite).
- `availability` : `in_stock` uniquement si la page affiche « en stock », « disponible en livraison » ou une date de livraison ferme ; sinon `unknown`.
- Prix TTC affiché, éco-participation incluse, en centimes.
- Offres marketplace : `seller_name` = vendeur affiché ; une seule offre par URL marchand (contrainte `offers.merchant_url`), on retient l'offre vendue par l'enseigne quand elle existe. Les offres écartées sont listées dans `excluded_offers` avec la raison.
- GTIN : contrôle de la clé EAN par le validateur. URL : https uniquement, sans identifiants, sur le domaine du marchand.
- Aucune suppression : un import n'efface rien ; une offre existante rattachée à un autre produit n'est jamais écrasée.
- Médias : ne renseigner `media[]` que si le droit d'affichage commercial est documenté. Chaque entrée contient `url`, `alt_text`, `role`, `position`, `source_url`, `rights_basis`, `rights_note`, `checked_at`.
- Une image copiée depuis Google Images, un fabricant ou un marchand sans licence explicite est refusée par la règle projet.

## Affiliation

`affiliate_url` reste `null` tant qu'Aymen n'a pas été accepté dans le programme : `/go/` redirige alors vers `merchant_url` (clic enregistré avec `affiliate_active = 0`). Le classement ne dépend jamais de l'affiliation.

| Statut | Signification |
|---|---|
| A | programme actif, lien vérifié → `affiliate_network` + `affiliate_url` |
| B | programme existant, inscription d'Aymen requise → `affiliate_url = null`, réseau candidat documenté |
| C | aucun programme pertinent trouvé → `affiliate_url = null` |

Statut au 2026-10-10 : voir `data/merchants.json` (Darty, Fnac, E.Leclerc, Alternate : Awin · Boulanger : Effinity · Carrefour : Kwanko · BUT, Dreame FR : C).

### tracking_token → réseau

Le token est injecté via le placeholder `{tracking_token}` dans `affiliate_url`. Le paramètre propre à chaque réseau (`clickref`, `subid`, …) ne doit être ajouté **qu'après lecture de la documentation officielle du réseau**, réseau par réseau. Aucun réseau n'est branché à ce jour.

Point relevé dans la documentation Awin (ClickRef) : les références doivent rester en minuscules ; les nouveaux tokens utilisent désormais 18 caractères `[a-z0-9]`. Les anciens tokens historiques ne sont pas réécrits.

## Ventes et EPC (préparé, non branché)

- Import futur des ventes : export ou API du réseau → `sales(network, tracking_token, order_date, amount_cents, commission_cents, status, status_updated_at)`, rejouable par clé (network, tracking_token, order_date), mise à jour du statut quand le réseau le change. Aucune vente fictive en production.
- EPC = commissions **validées** / clics affiliés pertinents
  - numérateur : `sales.commission_cents` avec statut validé du réseau (annulées et refusées exclues ; correspondance des statuts à définir par réseau) ;
  - dénominateur : `clicks` avec `affiliate_active = 1`, `internal_test = 0`, `bot_suspected = 0`.


## SEO préparé (Phase 4C)

- Canonical propre sans paramètres UTM.
- Open Graph / Twitter Card génériques ; image uniquement si média autorisé.
- JSON-LD `Product` + `AggregateOffer` sur les comparatifs, avec GTIN quand disponible.
- JSON-LD `BreadcrumbList` et `WebSite`.
- `/sitemap.xml` et `/robots.txt` générés par l'application.
- `noindex,follow` reste actif jusqu'à décision explicite de lancement et validation des mentions légales/affiliation.
