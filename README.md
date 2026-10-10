# Explorateur d'architecture

Affiche l'architecture de tes produits niveau par niveau : produit → couches (frontend, backend, infra) → composants → modules.
Les données viennent d'un fichier `architecture.json`. L'exemple livré est dans `src/architecture/architecture.json` ;
dans l'app, **Importer un JSON** (ou un glisser-déposer sur le canevas) affiche ton propre fichier.

## Format `architecture.json`

```json
{
  "version": 1,
  "products": [
    {
      "id": "shop",
      "name": "Shop",
      "kind": "app",
      "archType": "fullstack",
      "description": "Boutique en ligne.",
      "children": [
        { "id": "shop-web", "name": "Frontend", "kind": "layer", "repo": "shop-web", "deployedOn": ["shop-cdn"] },
        {
          "id": "shop-infra", "name": "Infra", "kind": "infra", "repo": "shop-infra",
          "children": [{ "id": "shop-cdn", "name": "CDN", "kind": "resource" }]
        }
      ]
    }
  ]
}
```

| Champ | Obligatoire | Rôle |
|---|---|---|
| `id` | oui | Identifiant unique dans tout le fichier |
| `name` | oui | Nom affiché |
| `kind` | oui | `app`, `layer`, `infra`, `component`, `resource` ou `module` |
| `description` | non | Une phrase affichée dans le bloc central |
| `archType` | non | Type d'architecture d'un produit (`fullstack`, `static`…) |
| `repo` | non | Repo qui contient ce bloc |
| `deployedOn` | non | Ids des ressources infra qui hébergent ce bloc |
| `children` | non | Sous-blocs |

### Sécurité

Ces champs alimentent l'onglet **Sécurité** : une carte par zones (Internet & tiers → exposé → interne → données),
les flux de données colorés selon le risque, et la liste des problèmes détectés.

| Champ | Rôle |
|---|---|
| `exposure` | `public` (joignable depuis Internet), `internal` (réseau interne) ou `private` (aucun accès direct) |
| `auth` | Authentification demandée : `none`, `JWT`, `mTLS`… |
| `data` | Données stockées ou servies : `pii`, `credentials`, `payment`, `health`, `public` |
| `encryptedAtRest` | `true` / `false` : données chiffrées sur disque |
| `flows` | Flux sortants : `[{ "to": "id", "data": ["pii"], "protocol": "HTTPS", "encrypted": true }]` |

Le `kind` `external` désigne un service tiers (Stripe, Google OAuth…).

Problèmes détectés (`src/architecture/security.js`) :

| Gravité | Règle |
|---|---|
| Critique | Bloc public, sans authentification, qui sert des données sensibles |
| Élevée | Ressource de stockage de données sensibles exposée sur Internet |
| Élevée | Données sensibles stockées sans chiffrement au repos |
| Élevée | Flux de données sensibles non chiffré |
| Moyenne | Données sensibles envoyées à un service tiers (à couvrir par un contrat RGPD) |

Un fichier invalide est refusé avec la liste des erreurs (id manquant ou en double, `kind` inconnu, `deployedOn` vers un id qui n'existe pas…).
La validation est dans `src/architecture/model.js`.

---

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `yarn start`

Runs the app in the development mode.<br />
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br />
You will also see any lint errors in the console.

### `yarn test`

Launches the test runner in the interactive watch mode.<br />
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `yarn build`

Builds the app for production to the `build` folder.<br />
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br />
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `yarn eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: https://facebook.github.io/create-react-app/docs/code-splitting

### Analyzing the Bundle Size

This section has moved here: https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size

### Making a Progressive Web App

This section has moved here: https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app

### Advanced Configuration

This section has moved here: https://facebook.github.io/create-react-app/docs/advanced-configuration

### Deployment

This section has moved here: https://facebook.github.io/create-react-app/docs/deployment

### `yarn build` fails to minify

This section has moved here: https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify
