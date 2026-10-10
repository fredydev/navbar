// Chaque nœud : { id, name, kind, description, repo?, deployedOn?, children? }
// Les couches de premier niveau dépendent du type d'architecture du produit :
// une app "static" n'a qu'un frontend, une app "fullstack" a frontend + backend.
// La couche "infra" vit souvent dans son propre repo (Terraform, Kubernetes…).
// `deployedOn` relie un nœud applicatif aux ressources infra qui l'hébergent.

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
        repo: "cyberpath-web",
        deployedOn: ["cp-cdn"],
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
        repo: "cyberpath-api",
        description: "API Node.js et services.",
        children: [
          {
            id: "cp-api",
            name: "API",
            kind: "component",
            deployedOn: ["cp-k8s"],
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
            deployedOn: ["cp-k8s"],
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
            deployedOn: ["cp-rds"],
            description: "Schéma PostgreSQL.",
            children: [
              { id: "cp-db-users", name: "users", kind: "module", description: "Table des utilisateurs." },
              { id: "cp-db-progress", name: "progress", kind: "module", description: "Avancement par cours." },
            ],
          },
        ],
      },
      {
        id: "cyberpath-infra",
        name: "Infra",
        kind: "infra",
        repo: "cyberpath-infra",
        description: "Terraform + Kubernetes sur AWS.",
        children: [
          {
            id: "cp-vpc",
            name: "Réseau (VPC)",
            kind: "resource",
            description: "Réseau privé isolé.",
            children: [
              { id: "cp-subnet-public", name: "Subnets publics", kind: "module", description: "Load balancer, NAT." },
              { id: "cp-subnet-private", name: "Subnets privés", kind: "module", description: "Cluster et base de données." },
            ],
          },
          {
            id: "cp-k8s",
            name: "Kubernetes (EKS)",
            kind: "resource",
            description: "Cluster qui exécute l'API.",
            children: [
              { id: "cp-k8s-ingress", name: "Ingress", kind: "module", description: "Routage HTTPS vers les services." },
              { id: "cp-k8s-api", name: "Deployment api", kind: "module", description: "3 réplicas, autoscaling." },
              { id: "cp-k8s-labs", name: "Pods labs", kind: "module", description: "Environnements d'exercice éphémères." },
            ],
          },
          {
            id: "cp-rds",
            name: "PostgreSQL (RDS)",
            kind: "resource",
            description: "Base managée, sauvegardes quotidiennes.",
          },
          {
            id: "cp-cdn",
            name: "CDN + S3",
            kind: "resource",
            description: "Hébergement du frontend (CloudFront + S3).",
          },
          {
            id: "cp-cicd",
            name: "CI/CD",
            kind: "resource",
            description: "GitHub Actions : build, tests, déploiement.",
            children: [
              { id: "cp-cicd-build", name: "Build & test", kind: "module", description: "À chaque pull request." },
              { id: "cp-cicd-deploy", name: "Deploy", kind: "module", description: "terraform apply + kubectl rollout." },
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
        repo: "portfolio",
        deployedOn: ["pf-pages"],
        description: "Site React statique.",
        children: [
          { id: "pf-navbar", name: "Navbar", kind: "component", description: "Liens et réseaux sociaux." },
          { id: "pf-projects", name: "Projects", kind: "component", description: "Galerie de projets." },
          { id: "pf-contact", name: "Contact", kind: "component", description: "Formulaire de contact." },
        ],
      },
      {
        id: "portfolio-infra",
        name: "Infra",
        kind: "infra",
        repo: "portfolio",
        description: "Hébergement statique, pas de serveur.",
        children: [
          { id: "pf-pages", name: "GitHub Pages", kind: "resource", description: "Sert le build statique." },
          { id: "pf-dns", name: "DNS", kind: "resource", description: "Domaine personnalisé." },
        ],
      },
    ],
  },
];

export default products;
