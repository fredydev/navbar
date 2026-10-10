import React from "react";
import { MarkerType } from "@xyflow/react";
import { NODE_W, NODE_H, GAP_Y, kindVars, Handles, KindRow } from "./shared";
import {
  SENSITIVE,
  DATA_LABELS,
  EXPOSURE_LABELS,
  SEVERITIES,
  SEVERITY_LABELS,
  SEVERITY_COLORS,
} from "./security";

export const INTERNET_ID = "__internet";

const ZONE_GAP_X = 170;

// Les zones vont de l'extérieur (à gauche) vers les données (à droite) :
// une attaque traverse la carte de gauche à droite.
const ZONES = [
  { key: "internet", title: "Internet & tiers", hint: "Hors de ton contrôle" },
  { key: "public", title: "Exposé", hint: "Joignable depuis Internet" },
  { key: "internal", title: "Interne", hint: "Réseau interne seulement" },
  { key: "private", title: "Données", hint: "Aucun accès direct" },
];

const zoneOf = (node) => (node.kind === "external" ? "internet" : node.exposure || "internal");

const FLOW_COLORS = { danger: "#ff4d6d", sensitive: "#ffb547", normal: "rgba(232,236,248,0.55)" };

export const worstSeverity = (findings) =>
  findings && findings.length
    ? SEVERITIES.find((s) => findings.some((f) => f.severity === s))
    : null;

export const SecurityBadges = ({ node }) => {
  const sensitive = (node.data || []).filter((d) => SENSITIVE.includes(d));
  if (!node.exposure && !node.auth && !(node.data || []).length) return null;
  return (
    <div className="sec-badges">
      {node.exposure && (
        <span className={`badge exposure-${node.exposure}`}>
          {node.exposure === "public" ? "🌐" : node.exposure === "internal" ? "🏢" : "🔒"}{" "}
          {EXPOSURE_LABELS[node.exposure]}
        </span>
      )}
      {node.auth && (
        <span className={`badge ${node.auth === "none" ? "auth-none" : "auth"}`}>
          {node.auth === "none" ? "Sans auth" : `🔑 ${node.auth}`}
        </span>
      )}
      {(node.data || []).map((d) => (
        <span key={d} className={`badge ${sensitive.includes(d) ? "data-sensitive" : "data"}`}>
          {DATA_LABELS[d]}
        </span>
      ))}
    </div>
  );
};

export const SeverityPill = ({ findings }) => {
  const worst = worstSeverity(findings);
  if (!worst) return null;
  return (
    <span
      className="severity-pill"
      style={{ "--sev": SEVERITY_COLORS[worst] }}
      title={`${findings.length} problème(s), gravité max : ${SEVERITY_LABELS[worst]}`}
    >
      ⚠ {findings.length}
    </span>
  );
};

const SecNode = ({ data: { node, findings, selected } }) => {
  const worst = worstSeverity(findings);
  return (
    <div
      className={`arch-node sec${selected ? " selected" : ""}${worst ? " has-findings" : ""}`}
      style={{ ...kindVars(node), "--sev": worst ? SEVERITY_COLORS[worst] : "transparent" }}
    >
      <Handles />
      <KindRow node={node} />
      <div className="arch-name">{node.name}</div>
      <SecurityBadges node={node} />
      <div className="arch-meta">
        <span>{findings ? "Voir les problèmes" : "Aucun problème détecté"}</span>
        <SeverityPill findings={findings} />
      </div>
    </div>
  );
};

const InternetNode = () => (
  <div className="arch-node internet" style={kindVars({ kind: "internet" })}>
    <Handles />
    <div className="internet-icon">🌍</div>
    <div className="arch-name">Internet</div>
    <div className="arch-meta">N'importe qui, y compris un attaquant</div>
  </div>
);

const ZoneNode = ({ data: { zone, width, height } }) => (
  <div className={`zone zone-${zone.key}`} style={{ width, height }}>
    <div className="zone-title">{zone.title}</div>
    <div className="zone-hint">{zone.hint}</div>
  </div>
);

export const securityNodeTypes = { sec: SecNode, internet: InternetNode, zone: ZoneNode };

// Blocs d'un produit qui comptent pour la sécurité : exposés, avec des données, ou reliés par un flux.
const relevantNodes = (model, productId) =>
  Object.values(model.index)
    .map(({ node }) => node)
    .filter((node) => {
      const path = model.pathTo(node.id);
      if (path.length < 3 || path[1].id !== productId) return false;
      return node.exposure || (node.data || []).length || (node.flows || []).length || model.flowsIn[node.id];
    });

export const securityLayout = (model, productId, byNode, selectedId) => {
  const relevant = relevantNodes(model, productId);
  const ids = new Set(relevant.map((n) => n.id));
  const column = (node) => ZONES.findIndex((z) => z.key === zoneOf(node));
  const columns = ZONES.map((zone) => ({ zone, nodes: relevant.filter((n) => zoneOf(n) === zone.key) }));
  const hasPublic = columns[1].nodes.length > 0;
  if (hasPublic) columns[0].nodes.unshift({ id: INTERNET_ID, kind: "internet", name: "Internet" });

  const step = NODE_H + GAP_Y;
  const rows = Math.max(1, ...columns.map((c) => c.nodes.length));
  const zoneHeight = rows * step + 90;
  const nodes = [];
  const edges = [];

  columns.forEach(({ zone, nodes: colNodes }, col) => {
    const x = col * (NODE_W + ZONE_GAP_X);
    nodes.push({
      id: `zone:${zone.key}`,
      type: "zone",
      position: { x: x - 24, y: -zoneHeight / 2 - 30 },
      width: NODE_W + 48,
      height: zoneHeight,
      zIndex: -1,
      selectable: false,
      data: { zone, width: NODE_W + 48, height: zoneHeight },
    });
    colNodes.forEach((node, i) => {
      const position = { x, y: (i - (colNodes.length - 1) / 2) * step - NODE_H / 2 + 20 };
      if (node.id === INTERNET_ID) {
        nodes.push({ id: INTERNET_ID, type: "internet", position, width: NODE_W, height: NODE_H, data: { node } });
      } else {
        nodes.push({
          id: node.id,
          type: "sec",
          position,
          width: NODE_W,
          height: NODE_H,
          data: { node, findings: byNode[node.id], selected: node.id === selectedId },
        });
      }
    });
  });

  // Surface d'attaque : Internet atteint tout ce qui est public.
  columns[1].nodes.forEach((node) =>
    edges.push({
      id: `${INTERNET_ID}->${node.id}`,
      source: INTERNET_ID,
      target: node.id,
      animated: true,
      style: { stroke: "rgba(255,77,109,0.45)", strokeWidth: 1.5, strokeDasharray: "4 6" },
    })
  );

  // Flux de données déclarés.
  relevant.forEach((node) =>
    (node.flows || [])
      .filter((flow) => ids.has(flow.to))
      .forEach((flow, i) => {
        const sensitive = (flow.data || []).some((d) => SENSITIVE.includes(d));
        const level = sensitive && flow.encrypted === false ? "danger" : sensitive ? "sensitive" : "normal";
        const color = FLOW_COLORS[level];
        const what = (flow.data || []).map((d) => DATA_LABELS[d]).join(", ");
        // Vers la droite : bord droit -> bord gauche. Même colonne : arc par la droite.
        // Vers la gauche (un tiers) : bord gauche -> bord droit, sans boucle.
        const from = column(node);
        const to = column(model.index[flow.to].node);
        const handles =
          to > from
            ? {}
            : to === from
            ? { sourceHandle: "deploy-out", targetHandle: "deploy-in", type: "smoothstep", pathOptions: { offset: 36, borderRadius: 16 } }
            : { sourceHandle: "back-out", targetHandle: "deploy-in" };
        edges.push({
          id: `flow:${node.id}->${flow.to}:${i}`,
          source: node.id,
          target: flow.to,
          ...handles,
          animated: true,
          className: `flow-${level}`,
          label: `${level === "danger" ? "⚠ en clair · " : flow.encrypted ? "🔒 " : ""}${what || flow.protocol || ""}`,
          labelStyle: { fill: color, fontSize: 11, fontWeight: 600 },
          labelBgStyle: { fill: "#0b0f1d", fillOpacity: 0.9 },
          labelBgPadding: [6, 3],
          labelBgBorderRadius: 6,
          markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
          style: { stroke: color, strokeWidth: level === "normal" ? 1.5 : 2.5 },
        });
      })
  );

  return { nodes, edges };
};

export const FindingsPanel = ({ findings, productName, model, selectedId, onSelect, onExplore }) => {
  const selected = selectedId && model.index[selectedId] && model.index[selectedId].node;
  const shown = selected ? findings.filter((f) => f.nodeId === selectedId) : findings;
  const counts = SEVERITIES.map((s) => [s, findings.filter((f) => f.severity === s).length]).filter(
    ([, n]) => n > 0
  );

  return (
    <aside className="findings" aria-label="Problèmes de sécurité">
      {selected ? (
        <div className="findings-head">
          <button className="link" onClick={() => onSelect(null)}>
            ← Tous les problèmes
          </button>
          <h3 style={kindVars(selected)}>{selected.name}</h3>
          <SecurityBadges node={selected} />
          {(selected.flows || []).length > 0 && (
            <ul className="flow-list">
              {selected.flows.map((flow, i) => (
                <li key={i}>
                  → {model.index[flow.to].node.name}
                  {flow.data && ` · ${flow.data.map((d) => DATA_LABELS[d]).join(", ")}`}
                  {flow.protocol && ` · ${flow.protocol}`}
                  {flow.encrypted === false && <strong className="clear"> · en clair</strong>}
                </li>
              ))}
            </ul>
          )}
          <button className="link" onClick={() => onExplore(selected.id)}>
            Ouvrir dans l'exploration →
          </button>
        </div>
      ) : (
        <div className="findings-head">
          <h3>
            {findings.length === 0
              ? `Aucun problème détecté dans ${productName}`
              : `${findings.length} problème${findings.length > 1 ? "s" : ""} dans ${productName}`}
          </h3>
          <div className="counts">
            {counts.map(([s, n]) => (
              <span key={s} className="count" style={{ "--sev": SEVERITY_COLORS[s] }}>
                {n} {SEVERITY_LABELS[s].toLowerCase()}
              </span>
            ))}
          </div>
        </div>
      )}
      {shown.length > 0 ? (
        <ul className="finding-list">
          {shown.map((f) => (
            <li key={f.id}>
              <button className="finding" style={{ "--sev": SEVERITY_COLORS[f.severity] }} onClick={() => onSelect(f.nodeId)}>
                <span className="sev">{SEVERITY_LABELS[f.severity]}</span>
                <strong>{f.title}</strong>
                <span className="detail">{f.detail}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        selected && <p className="none">Aucun problème détecté sur ce bloc.</p>
      )}
    </aside>
  );
};
