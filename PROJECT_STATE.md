# PROJECT STATE
Statut : terminé
Objectif actuel : Phase 4C — médias produits + préparation SEO Google
Dernière étape validée : déploiement production + smoke Phase 4C + contrôle D1
En cours : aucune
Prochaine action exacte : STOP. Attendre des visuels avec droit commercial explicite et les prérequis de lancement avant retrait de noindex.

## Livré
- Migration `0002_product_media.sql` appliquée sur D1 : table `product_media` avec provenance et base de droit obligatoire.
- Import média idempotent ; une image sans droit documenté est refusée.
- Support UI : image principale + galerie, homepage et comparatif, responsive et sans régression quand aucune image n’existe.
- SEO : canonical sans UTM, Open Graph/Twitter, JSON-LD `WebSite`, `Product` + `AggregateOffer`, `BreadcrumbList`.
- GTIN exposé dans les données structurées quand disponible.
- `/sitemap.xml` dynamique et `/robots.txt` opérationnels.
- `noindex,follow` conservé : Google ne doit pas encore indexer le site.
- Aucun lien marchand direct réintroduit ; `/go/` et tracking inchangés.

## Vérifications
- Tests : 40/40, 0 échec.
- Build Astro : succès.
- Déploiement Worker : succès.
- Version validée : `6f721769-0a0f-4d53-94cb-04dc32f1a26a`.
- Smoke Phase 2 : OK.
- Smoke Phase 3 : 2 pages réelles + /go : OK.
- Smoke Phase 4B : homepage, pages fixes, 404, disclosure, noindex : OK.
- Smoke Phase 4C : canonical, Product/AggregateOffer, Breadcrumb, sitemap, robots : OK.
- D1 : migrations 0001 + 0002 ; product_media = 0 ; 16 offres courantes inchangées.
- Builds automatiques GitHub → Cloudflare réactivés.

## Médias — blocage externe
- Aucun visuel produit n’est encore affiché en production.
- Les conditions publiques de Dreame et Tineco ne permettent pas de considérer leurs images de site comme librement réutilisables commercialement.
- Sources acceptables : photo appartenant à Aymen, licence commerciale, flux/créatif d’un réseau affilié autorisé, permission fabricant écrite, domaine public.
- Ne jamais copier une image Google/fabricant/marchand sans droit explicite.

## Avant indexation Google
- Compléter mentions légales / contact / confidentialité avec les vraies informations de l’éditeur.
- Activer au moins un programme d’affiliation si souhaité pour la monétisation.
- Ajouter les visuels autorisés lorsqu’ils deviennent disponibles.
- Décision explicite d’Aymen pour retirer `noindex`.
- Puis connecter Google Search Console, envoyer le sitemap et demander l’indexation.

Worker : `https://comparateur.aymen-for-pic.workers.dev`
D1 : `comparateur-db` / `60d9a7b4-ef44-464e-9fc7-ebf3a3e71178`
Dernier commit fonctionnel : `d3f3560 phase4c: accept noindex follow directive in smoke`
