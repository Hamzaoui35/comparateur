# AGENTS.md — règles permanentes du projet

Comparateur affilié piloté par la donnée. Ce fichier contient uniquement les règles permanentes.
L'avancement vit dans PROJECT_STATE.md, le modèle de données dans docs/SCHEMA.md, l'historique dans Git.

## Démarrage de chaque session (tout agent : Claude, ChatGPT, autre)
1. Lis ce fichier puis PROJECT_STATE.md (docs/SCHEMA.md seulement si nécessaire). Lance `git status` et `git log --oneline -5`.
2. Vérifie dans les fichiers, le build et les tests que l'état annoncé est réel. Ne crois pas un résumé sans vérifier ; corrige PROJECT_STATE.md s'il est faux.
3. Reprends à la première étape non validée. Ne refais jamais une étape validée, sauf si elle est cassée.

## Le projet
Plateforme data générique, pas un site sur un produit précis :
sources externes + données du site → historique → détection des produits intéressants → catalogue produits / marchands / offres → comparateur → visiteurs → vues / clics / ventes / commissions → agrégats quotidiens → Trend Score + Performance Score → décision humaine : pousser / garder / surveiller / remplacer.
« Remplacer » = retirer de la mise en avant ; une URL n'est jamais supprimée automatiquement.
Monétisation : affiliation. Parcours : produit → même produit chez plusieurs marchands → prix / livraison / disponibilité / conditions → jusqu'à 2 alternatives → verdict → clic marchand → achat → commission.
Le classement n'est jamais déterminé en secret par la commission : la meilleure offre pour le visiteur s'affiche même si elle n'est pas affiliée.
Plus tard : Trend Score (la demande externe accélère-t-elle ?) et Performance Score (le produit mérite-t-il sa visibilité ?) jamais mélangés ; estimation marquée performance_is_estimated = 1. Détecteur : Discovery ≠ Monitoring, mode observation, aucune décision ni publication automatique, aucune source utilisée contre ses CGU, pas de scraping.

## Stack figée
Astro + TypeScript · Cloudflare Workers (@astrojs/cloudflare) · Cloudflare D1 · GitHub · Markdown/MDX pour le texte éditorial.
Pages comparatives rendues à la demande (SSR, lecture D1) ; pages fixes pré-rendues (`export const prerender = true`).
Bindings : `import { env } from 'cloudflare:workers'` → `env.DB`.
Interdit : autre backend, serveur Python, BigQuery/Snowflake, framework front supplémentaire. Changement de stack uniquement si impossibilité technique démontrée et documentée.

## Règles data
- Montants en centimes (INTEGER). Dates UTC ISO 8601 (TEXT). Booléens 0/1.
- Jamais stockés : IP, cookie ou identifiant de visiteur, User-Agent brut.
- Tables RAW en ajout seul (sauf purge imposée par une source). Imports et seeds rejouables sans doublon.
- Imports et seeds par clés naturelles, jamais par id explicite : products.slug, merchants.domain, offers.merchant_url, pages.slug, relevé = (offre, checked_at, source), page_offers = (page, offre, valid_from). Modèle : seed/exemple-ajout-produit.sql.
- product ≠ merchant ≠ offer ≠ offer_snapshot. Le prix courant n'est jamais copié dans offers : il vient de la vue current_offers (dernier snapshot : checked_at DESC, id DESC).
- shipping_cents NULL = livraison INCONNUE, jamais gratuite → afficher « Livraison à vérifier ».
- availability ∈ {in_stock, preorder, out_of_stock, unknown}.
- Ordre d'affichage : (1) in_stock avec livraison connue, par prix + livraison ; (2) in_stock avec livraison inconnue, par prix ; (3) preorder puis unknown, par prix ; (4) out_of_stock.
- La recommandation appartient à la page (page_offers). Une ligne page_offers n'est jamais réécrite : on renseigne valid_to puis on insère une nouvelle ligne (index unique partiel WHERE valid_to IS NULL).
- Tracking (phase 2) : /go/<page_offer_id>?s=<snapshot_id> ; PK interne + tracking_token aléatoire unique ; la PK n'est jamais envoyée aux réseaux d'affiliation.
- Aucun nom de marque, modèle, marchand ou catégorie précise dans src/ : un nouveau produit = des données, jamais un composant (vérifié par `npm test`).
- Toutes les pages portent `<meta name="robots" content="noindex">` jusqu'à décision contraire.

## Boucle de travail
Pour chaque étape : PROJECT_STATE.md « En cours » → implémente → vérifie avec le critère → tests utiles → checkpoint → étape suivante.
Échec : 3 tentatives maximum sur le même blocage, puis note le problème et ce qu'il faut, et continue les étapes indépendantes.
Si tu es relancé automatiquement et que Statut = terminé : arrête. Ne commence jamais spontanément la phase suivante.

## Checkpoint
Tu ne peux pas prévoir quand tu seras coupé. Checkpoint = `git status` → tests utiles → PROJECT_STATE.md à jour avec la « Prochaine action exacte » → commit « phaseN: <action> » → push.
Après chaque étape, avant toute commande longue, en cas de blocage, et dès que la session devient longue. Jamais de `git push --force`, jamais de réécriture d'historique.
PROJECT_STATE.md = état actuel, pas un journal (60 lignes maximum) ; supprime l'obsolète, Git garde l'historique.

## Autonomie
Sans demander : fichiers du projet, dépendances npm, build et tests, migrations et seeds, Git (commit, push), créer et configurer D1, déployer sur workers.dev — si les connexions le permettent.
Jamais sans accord explicite d'Aymen : acheter un domaine, payer, changer de plan, exposer un secret, réécrire l'historique Git, supprimer des ressources externes ou des données réelles.
Authentification manquante : note-la dans « Blocages / À faire par Aymen », travaille en local (--local), continue, n'attends pas.
Choix ambigu : option la plus simple compatible avec ces règles, une ligne dans « Décisions prises », et continue.

## Économie de tokens
Pas de narration ni d'explication de code. Jamais de fichier entier dans les réponses. Lectures ciblées. Installations silencieuses, logs coupés (`| tail -n 30`).
Messages utilisateur : étape importante terminée, blocage nécessitant une action, rapport final.

## Hors périmètre tant qu'Aymen ne l'a pas lancé
Trend detector, agrégats réels, /go/ et tracking, e-mails, comptes utilisateurs, admin, IA de rédaction, publication automatique, multi-sites, publicité, intégration marchands automatique, scraping, SEO avancé, design final.

## Commandes
- `npm run build` · `npm run dev` · `npm run preview` · `npm test`
- `npm run db:migrate:local` / `db:migrate:remote` · `npm run db:seed:local` / `db:seed:remote`
- `npm run deploy` (build + wrangler deploy)
