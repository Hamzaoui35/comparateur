# PROJECT STATE
Statut : en cours
Objectif actuel : Audit UX/UI + CRO + marketing + accessibilité + SEO comparateur
Dernière étape validée : audit des pages de production et du code ; modifications UX enregistrées sur branche audit-ux-cro-2026-10-11
En cours : validation tests/build, fusion et déploiement Cloudflare, vérification finale de production
Prochaine action exacte : contrôler le diff ; fusionner après vérification, contrôler le build Cloudflare et les smoke tests ; vérifier la production avant de déclarer terminé.

## Décisions UX
- Palette originale vert foncé / crème conservée : lisibilité et caractère sobre appropriés au comparateur.
- Accueil : message centré sur la comparaison de plusieurs offres d'un même produit.
- Prix : livraison inconnue annoncée avant et après le prix ; jamais présentée comme gratuite.
- Comparatifs : marque dans le H1, lien « Voir toutes les offres », boutons marchands nominatifs.
- Mobile : informations utiles rapprochées du haut, cible clavier/tactile minimum 44 px.
- Aucun nom de produit ou de marchand ajouté en dur dans src/.

## Invariants conservés
- Astro/TypeScript, Worker, D1 et données existantes ; aucun changement de migration ni de classement.
- Liens sortants exclusivement via /go/ ; UTM et tracking inchangés.
- Aucune image sans droit ; table product_media conservée.
- SEO : canonical, Product/AggregateOffer, Breadcrumb, sitemap et robots conservés ; noindex,follow maintenu.
- Les pages légales restent provisoires tant que l'éditeur ne fournit pas les éléments requis.

## Contrôle à terminer
- npm test et npm run build doivent réussir sur Cloudflare Builds.
- Smoke distant doit réussir avant tout verdict de déploiement.
- Vérifier les pages live, les deux comparatifs, /go/, 404, pages fixes, robots.txt, sitemap.xml.
- Inspecter les rendus mobile et desktop dès que l'accès aux captures n'est plus limité.

## Bloqueurs extérieurs
- Images : aucune licence prouvée, product_media = 0, ne rien importer.
- Identité de l'éditeur, coordonnées publiques, politique confidentialité : à valider avant l'ouverture.
- Aucun programme d'affiliation actif ; pas de promesse de rémunération.
- Garder noindex jusqu'à décision explicite.

Worker : https://comparateur.aymen-for-pic.workers.dev
D1 : comparateur-db / 60d9a7b4-ef44-464e-9fc7-ebf3a3e71178
