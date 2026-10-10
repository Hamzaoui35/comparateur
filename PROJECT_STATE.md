# PROJECT STATE
Statut : en cours
Objectif actuel : Phase 4B — design public et préparation affiliation
Dernière étape validée : audit du dépôt, D1 et déploiement actuel réussi (244907d).
En cours : interface publique, composants et pages de confiance.
Prochaine action exacte : implémenter accueil SSR D1, comparatifs responsive et pages fixes ; tester avant push.

## Décisions prises
- Direction comparateur éditorial : ivoire, bleu nuit, vert profond ; CSS natif, aucune dépendance UI.
- Identité temporaire « Comparateur » ; aucun domaine ni image produit inventée.
- Classement, /go/, tracking et historique conservés ; noindex partout.
- Accueil dynamique, fixtures source=seed exclues de la vitrine par provenance ; aucune suppression D1.
- 3 directions étudiées : éditorial (retenu avec cartes fonctionnelles), catalogue shopping, tech grand public.
- GitHub main déclenche le build Cloudflare existant (tests + build + déploiement + smoke).

## Validation à faire
- Tests existants + tests catalogue et interface ; npm run build.
- Vérification visuelle 360/390/768/1024/1440 px ; clavier et états limites.
- Déploiement comparateur + smoke distant + relecture production.

## À fournir par Aymen avant lancement public
- Identité juridique de l’éditeur, statut et mentions d’immatriculation applicables.
- Adresse de publication, responsable de publication, coordonnées de contact publiques.
- Contact confidentialité, durées de conservation et validation des mentions/confidentialité.
- Nom définitif éventuel ; acceptations d’affiliation (aucune activation dans cette phase).

## Ressources conservées
- Worker : https://comparateur.aymen-for-pic.workers.dev
- D1 : comparateur-db ; aucune migration prévue.
- Affiliation : aucun nouveau lien actif ; tokens lowercase de phase 4 conservés.
