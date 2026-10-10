# PROJECT STATE
Statut : terminé
Objectif actuel : Audit UX/UI + CRO + marketing + accessibilité + SEO comparateur (passe 1 + passe 4D)
Dernière étape validée : passe 4D déployée ; smoke production complet jusqu'au marqueur D1 phase4d/complete (22:29:28Z) ; rendu production contrôlé
En cours : aucune
Prochaine action exacte : STOP. Attendre informations légales/contact de l'éditeur, images avec droits commerciaux, affiliation acceptée et décision explicite avant indexation.

## Livré — passe 1 (déployée, version 25a93b79)
- Homepage : proposition de valeur explicite ; comparatifs : H1 marque + modèle, lien vers les offres, CTA marchands nominatifs.
- Mobile : en-tête compact ; desktop : hero resserré ; cibles tactiles 44 px menu/pied de page ; quality gates GitHub Actions.

## Livré — passe 4D (captures réelles 360/390/768/1024/1440)
- Accueil : répétitions supprimées (encart « trois repères » + bandeau de coches = section méthode) ; repères chiffrés calculés depuis D1 (produits, offres, marchands, date) ; prix de la 1re carte dans le premier écran à 1440×900.
- Cartes : entièrement cliquables (lien unique, focus visible) ; « Meilleure offre en stock » + marchand + livraison ; fourchette de prix ; numérotation 01/02 retirée ; flèche → pour un lien interne.
- Comparatif : fourchette de prix et date de relevé une seule fois ; encart meilleure offre allégé ; date répétée par ligne retirée (gardée si différente) ; « Vendeur non précisé » ×6 et « Total non calculable » retirés ; livraison inconnue en ambre.
- Mobile : lignes d'offres compactes → page Tineco 4 555 → 3 196 px (390) ; CTA meilleure offre dans le premier écran à 360×780 et 390×844.
- Desktop : colonne CTA élargie (libellés « Voir chez … » sur une ligne).
- SEO : pages fixes servies sans redirection 307 (build.format file) ; canonical = lien interne = sitemap ; title comparatif « … au meilleur prix : N offres comparées » ; description avec prix d'appel et date ; espace manquant du H1 d'accueil corrigé.
- a11y : bordure boutons secondaires 3,75:1 ; fil d'Ariane ≥ 24 px ; liens isolés 44 px ; aria-current="true" pour la section Comparatifs.
- Méthode : libellés et règle vendeur/marketplace alignés sur l'affichage.
- Smoke : pages fixes sans redirection + canonical cohérent ; marqueur de fin D1 phase4d.

## Vérifications
- npm test 40/40 ; build OK ; smoke complet (phases 2, 3, 4B, 4C, 4D) en local puis en production.
- D1 production : vues/clics du smoke tous internal_test = 1 ; marqueur phase4d/complete présent.
- Production relue : accueil (nouveau hero, repères, cartes), comment-ça-marche (canonical sans slash, nouveaux libellés).
- 0 débordement horizontal 360 → 1440 ; 1 CSS (~19 Ko), 0 JS client, 0 police web, 0 image.
- Inchangés : /go/, UTM, tracking, classement, snapshots, product_media, JSON-LD, sitemap, robots, noindex,follow.
- Non mesuré en conditions réelles : Core Web Vitals terrain, audit WCAG exhaustif avec lecteur d'écran.

## Prérequis avant lancement public (décision humaine)
- Identité de l'éditeur, mentions légales, confidentialité et canal de contact réels.
- Images avec droits commerciaux documentés.
- Programmes d'affiliation acceptés (Awin, Effinity, Kwanko).
- Décision explicite d'Aymen avant retrait de noindex, puis Search Console/sitemap.

Worker : https://comparateur.aymen-for-pic.workers.dev
D1 : comparateur-db / 60d9a7b4-ef44-464e-9fc7-ebf3a3e71178
