# PROJECT STATE
Statut : en cours
Objectif actuel : Phase 4C — médias produits + préparation SEO Google
Dernière étape validée : Phase 4B design public déployé ; build Cloudflare et smoke Phase 4B réussis.
En cours : schéma média avec contrôle des droits, SEO technique, données structurées, sitemap/robots.
Prochaine action exacte : créer migration product_media, adapter import/lecture/UI/SEO, appliquer D1, tester et déployer.

## Décisions
- noindex reste actif pendant toute la Phase 4C.
- Aucun visuel fabricant n'est copié sans droit commercial explicite.
- Les médias ne peuvent être importés que si leur base de droit est documentée : owned, licensed, affiliate_feed, manufacturer_permission ou public_domain.
- Dreame et Tineco interdisent actuellement la réutilisation commerciale de leurs contenus de site sans autorisation : leurs images officielles ne sont donc pas copiées.
- L'UI accepte 1 image principale + galerie ; elle reste propre sans image.
- SEO cible : canonical, Open Graph, Product + AggregateOffer JSON-LD, BreadcrumbList, sitemap.xml, robots.txt.
- Les résultats Google seront préparés mais pas activés tant que noindex n'est pas retiré.

## Blocage externe pour les vraies photos
- Obtenir un visuel autorisé via réseau d'affiliation/feed, permission fabricant, photo appartenant à Aymen ou autre licence commerciale.
- Ne jamais coller/copier une image trouvée sur Google ou sur une fiche fabricant sans droit.

## À fournir par Aymen avant lancement public
- Identité/statut/adresse/contact public pour mentions légales/confidentialité.
- Acceptation d'au moins un réseau d'affiliation.
- Validation explicite avant retrait de noindex et soumission Search Console.

## Ressources
- Worker : https://comparateur.aymen-for-pic.workers.dev
- D1 : comparateur-db
- GitHub : Hamzaoui35/comparateur
