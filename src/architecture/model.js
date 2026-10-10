// Format d'un fichier architecture.json :
//
// {
//   "version": 1,
//   "products": [ Nœud, ... ]
// }
//
// Nœud : {
//   "id": "unique-dans-le-fichier",          obligatoire
//   "name": "Nom affiché",                    obligatoire
//   "kind": "app" | "layer" | "infra" | "component" | "resource" | "module",
//   "description": "Une phrase",              optionnel
//   "archType": "fullstack" | "static" | …,   optionnel (produits)
//   "repo": "nom-du-repo",                    optionnel
//   "deployedOn": ["id-d-une-ressource"],     optionnel
//   "children": [ Nœud, ... ]                 optionnel
//
//   Sécurité (tout est optionnel) :
//   "exposure": "public" | "internal" | "private",   joignable depuis Internet, le réseau interne, ou rien
//   "auth": "none" | "JWT" | "mTLS" | …,              authentification demandée pour y accéder
//   "data": ["pii", "credentials", …],                données stockées ou servies par ce bloc
//   "encryptedAtRest": true | false,                  données chiffrées sur disque
//   "flows": [{ "to": "id", "data": [...], "protocol": "HTTPS", "encrypted": true }]
// }

export const KINDS = ["app", "layer", "infra", "component", "resource", "module", "external"];

export const EXPOSURES = ["public", "internal", "private"];

export const DATA_TYPES = ["pii", "credentials", "payment", "health", "public"];

export const ROOT_ID = "__root";

const MAX_ERRORS = 8;

const isText = (v) => typeof v === "string" && v.trim() !== "";
const isOptionalText = (v) => v === undefined || typeof v === "string";

// Vérifie le fichier et renvoie la liste des erreurs, en français, avec le chemin du nœud fautif.
export const validateArchitecture = (data) => {
  const errors = [];
  const add = (msg) => errors.length < MAX_ERRORS && errors.push(msg);

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return ["Le fichier doit contenir un objet JSON { \"version\": 1, \"products\": [...] }."];
  }
  if (data.version !== 1) add("\"version\" doit valoir 1.");
  if (!Array.isArray(data.products) || data.products.length === 0) {
    add("\"products\" doit être une liste contenant au moins un produit.");
    return errors;
  }

  const seen = new Map();
  const references = [];

  const visit = (node, path) => {
    if (!node || typeof node !== "object" || Array.isArray(node)) {
      add(`${path} : doit être un objet.`);
      return;
    }
    const label = isText(node.name) ? `${path} (${node.name})` : path;
    if (!isText(node.id)) add(`${label} : "id" manquant.`);
    else if (node.id === ROOT_ID) add(`${label} : l'id "${ROOT_ID}" est réservé.`);
    else if (seen.has(node.id)) add(`${label} : l'id "${node.id}" est déjà utilisé par ${seen.get(node.id)}.`);
    else seen.set(node.id, label);

    if (!isText(node.name)) add(`${label} : "name" manquant.`);
    if (!KINDS.includes(node.kind)) {
      add(`${label} : "kind" doit être l'un de ${KINDS.join(", ")} (reçu : ${JSON.stringify(node.kind)}).`);
    }
    ["description", "archType", "repo"].forEach((field) => {
      if (!isOptionalText(node[field])) add(`${label} : "${field}" doit être un texte.`);
    });

    if (node.deployedOn !== undefined) {
      if (!Array.isArray(node.deployedOn) || !node.deployedOn.every(isText)) {
        add(`${label} : "deployedOn" doit être une liste d'ids.`);
      } else {
        node.deployedOn.forEach((id) => references.push({ id, label, field: '"deployedOn"' }));
      }
    }

    if (node.exposure !== undefined && !EXPOSURES.includes(node.exposure)) {
      add(`${label} : "exposure" doit être l'un de ${EXPOSURES.join(", ")}.`);
    }
    if (!isOptionalText(node.auth)) add(`${label} : "auth" doit être un texte.`);
    if (node.encryptedAtRest !== undefined && typeof node.encryptedAtRest !== "boolean") {
      add(`${label} : "encryptedAtRest" doit valoir true ou false.`);
    }
    const checkData = (data, where) => {
      if (data === undefined) return;
      if (!Array.isArray(data)) add(`${label} : ${where} doit être une liste.`);
      else {
        data
          .filter((d) => !DATA_TYPES.includes(d))
          .forEach((d) => add(`${label} : type de donnée inconnu "${d}" dans ${where} (attendu : ${DATA_TYPES.join(", ")}).`));
      }
    };
    checkData(node.data, '"data"');
    if (node.flows !== undefined) {
      if (!Array.isArray(node.flows)) add(`${label} : "flows" doit être une liste.`);
      else {
        node.flows.forEach((flow, i) => {
          const where = `"flows[${i}]"`;
          if (!flow || typeof flow !== "object" || !isText(flow.to)) {
            add(`${label} : ${where} doit avoir un "to".`);
            return;
          }
          references.push({ id: flow.to, label, field: where });
          checkData(flow.data, `${where}.data`);
          if (flow.encrypted !== undefined && typeof flow.encrypted !== "boolean") {
            add(`${label} : ${where}.encrypted doit valoir true ou false.`);
          }
          if (!isOptionalText(flow.protocol)) add(`${label} : ${where}.protocol doit être un texte.`);
        });
      }
    }

    if (node.children !== undefined) {
      if (!Array.isArray(node.children)) add(`${label} : "children" doit être une liste.`);
      else node.children.forEach((child, i) => visit(child, `${path}.children[${i}]`));
    }
  };

  data.products.forEach((product, i) => visit(product, `products[${i}]`));

  references.forEach(({ id, label, field }) => {
    if (!seen.has(id)) add(`${label} : ${field} cite l'id "${id}" qui n'existe pas.`);
  });

  return errors;
};

// Construit ce dont l'explorateur a besoin : racine virtuelle, index id -> nœud/parent,
// et l'inverse de `deployedOn` (ressource -> nœuds qu'elle héberge).
export const buildModel = (data) => {
  const root = {
    id: ROOT_ID,
    name: "Mes produits",
    kind: "home",
    description: "Choisis un produit pour explorer son architecture.",
    children: data.products,
  };

  const index = {};
  const indexTree = (node, parent) => {
    index[node.id] = { node, parent };
    (node.children || []).forEach((child) => indexTree(child, node));
  };
  indexTree(root, null);

  const hostedBy = {};
  Object.values(index).forEach(({ node }) =>
    (node.deployedOn || []).forEach((target) => {
      (hostedBy[target] = hostedBy[target] || []).push(node);
    })
  );

  // Flux entrants : nœud -> [{ from, flow }].
  const flowsIn = {};
  Object.values(index).forEach(({ node }) =>
    (node.flows || []).forEach((flow) => {
      (flowsIn[flow.to] = flowsIn[flow.to] || []).push({ from: node, flow });
    })
  );

  const pathTo = (id) => {
    const path = [];
    for (let cur = index[id]; cur; cur = cur.parent && index[cur.parent.id]) {
      path.unshift(cur.node);
    }
    return path;
  };

  return { root, products: data.products, index, hostedBy, flowsIn, pathTo };
};

// Lit un texte JSON : renvoie { model } si tout va bien, sinon { errors }.
export const parseArchitecture = (text) => {
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return { errors: [`JSON invalide : ${e.message}`] };
  }
  const errors = validateArchitecture(data);
  return errors.length ? { errors } : { model: buildModel(data) };
};
