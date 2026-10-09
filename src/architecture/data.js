// Chaque nœud : { id, name, kind, description, children? }
// Les vues de premier niveau dépendent du type d'architecture du produit :
// une app "static" n'a qu'un frontend, une app "fullstack" a frontend + backend.

const products = [
  {
    id: "cyberpath",
    name: "CyberPath",
    kind: "app",
    archType: "fullstack",
    description: "Plateforme d'apprentissage en cybersécurité.",
    children: [
      {
        id: "cyberpath-frontend",
        name: "Frontend",
        kind: "layer",
        description: "Application web React.",
        children: [
          {
            id: "cp-ui",
            name: "UI",
            kind: "component",
            description: "Composants visuels réutilisables.",
            children: [
              { id: "cp-navbar", name: "Navbar", kind: "module", description: "Navigation principale." },
              { id: "cp-dashboard", name: "Dashboard", kind: "module", description: "Progression de l'utilisateur." },
              { id: "cp-lab", name: "Lab Viewer", kind: "module", description: "Affichage des exercices pratiques." },
            ],
          },
          {
            id: "cp-router",
            name: "Router",
            kind: "component",
            description: "Gestion des pages et des routes protégées.",
          },
          {
            id: "cp-state",
            name: "State",
            kind: "component",
            description: "État global de l'application.",
            children: [
              { id: "cp-store-user", name: "User store", kind: "module", description: "Session et profil." },
              { id: "cp-store-course", name: "Course store", kind: "module", description: "Cours et progression." },
            ],
          },
          {
            id: "cp-api-client",
            name: "API Client",
            kind: "component",
            description: "Appels HTTP vers le backend.",
          },
        ],
      },
      {
        id: "cyberpath-backend",
        name: "Backend",
        kind: "layer",
        description: "API Node.js et services.",
        children: [
          {
            id: "cp-api",
            name: "API",
            kind: "component",
            description: "Endpoints REST.",
            children: [
              { id: "cp-api-courses", name: "/courses", kind: "module", description: "Catalogue de cours." },
              { id: "cp-api-labs", name: "/labs", kind: "module", description: "Lancement des labs." },
              { id: "cp-api-users", name: "/users", kind: "module", description: "Gestion des comptes." },
            ],
          },
          {
            id: "cp-auth",
            name: "Auth",
            kind: "component",
            description: "Authentification et rôles.",
            children: [
              { id: "cp-jwt", name: "JWT", kind: "module", description: "Émission et vérification des tokens." },
              { id: "cp-oauth", name: "OAuth", kind: "module", description: "Connexion Google / GitHub." },
            ],
          },
          {
            id: "cp-db",
            name: "Database",
            kind: "component",
            description: "PostgreSQL.",
            children: [
              { id: "cp-db-users", name: "users", kind: "module", description: "Table des utilisateurs." },
              { id: "cp-db-progress", name: "progress", kind: "module", description: "Avancement par cours." },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "portfolio",
    name: "Portfolio",
    kind: "app",
    archType: "static",
    description: "Site vitrine statique : pas de backend.",
    children: [
      {
        id: "portfolio-frontend",
        name: "Frontend",
        kind: "layer",
        description: "Site React statique.",
        children: [
          { id: "pf-navbar", name: "Navbar", kind: "component", description: "Liens et réseaux sociaux." },
          { id: "pf-projects", name: "Projects", kind: "component", description: "Galerie de projets." },
          { id: "pf-contact", name: "Contact", kind: "component", description: "Formulaire de contact." },
        ],
      },
    ],
  },
];

export default products;
