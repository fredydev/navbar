// Analyse de sécurité d'une architecture : à partir de l'exposition, des données et des flux
// déclarés dans architecture.json, liste les problèmes à regarder en priorité.

export const SENSITIVE = ["pii", "credentials", "payment", "health"];

export const DATA_LABELS = {
  pii: "Données perso",
  credentials: "Identifiants",
  payment: "Paiement",
  health: "Santé",
  public: "Publiques",
};

export const EXPOSURE_LABELS = {
  public: "Public",
  internal: "Interne",
  private: "Privé",
};

export const SEVERITIES = ["critical", "high", "medium"];

export const SEVERITY_LABELS = {
  critical: "Critique",
  high: "Élevée",
  medium: "Moyenne",
};

export const SEVERITY_COLORS = {
  critical: "#ff4d6d",
  high: "#ff9f43",
  medium: "#ffd166",
};

const sensitiveIn = (data) => (data || []).filter((d) => SENSITIVE.includes(d));

const labels = (data) => data.map((d) => DATA_LABELS[d]).join(", ");

const hasNoAuth = (node) => !node.auth || node.auth === "none";

export const analyzeSecurity = (model) => {
  const findings = [];
  const add = (severity, nodeId, title, detail) =>
    findings.push({ id: `${severity}:${nodeId}:${findings.length}`, severity, nodeId, title, detail });

  Object.values(model.index).forEach(({ node }) => {
    const sensitive = sensitiveIn(node.data);

    if (node.exposure === "public" && sensitive.length && hasNoAuth(node)) {
      add(
        "critical",
        node.id,
        "Données sensibles exposées sans authentification",
        `${node.name} est joignable depuis Internet sans authentification et sert : ${labels(sensitive)}.`
      );
    }

    if (node.exposure === "public" && sensitive.length && node.kind === "resource") {
      add(
        "high",
        node.id,
        "Stockage de données exposé sur Internet",
        `${node.name} stocke ${labels(sensitive)} et est accessible publiquement. Placez-le dans un réseau privé.`
      );
    }

    if (sensitive.length && node.encryptedAtRest === false) {
      add(
        "high",
        node.id,
        "Données sensibles stockées sans chiffrement",
        `${node.name} stocke ${labels(sensitive)} sans chiffrement au repos.`
      );
    }

    (node.flows || []).forEach((flow) => {
      const target = model.index[flow.to].node;
      const carried = sensitiveIn(flow.data);
      if (!carried.length) return;

      if (flow.encrypted === false) {
        add(
          "high",
          node.id,
          "Flux de données sensibles non chiffré",
          `${node.name} → ${target.name} transporte ${labels(carried)} en clair${
            flow.protocol ? ` (${flow.protocol})` : ""
          }.`
        );
      }

      if (target.kind === "external") {
        add(
          "medium",
          node.id,
          "Données sensibles partagées avec un tiers",
          `${node.name} envoie ${labels(carried)} à ${target.name}. Vérifiez le contrat de traitement (RGPD).`
        );
      }
    });
  });

  return findings.sort((a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity));
};

// Problèmes regroupés par nœud, avec la gravité la plus haute en premier.
export const findingsByNode = (findings) =>
  findings.reduce((acc, f) => {
    (acc[f.nodeId] = acc[f.nodeId] || []).push(f);
    return acc;
  }, {});
