import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import sample from "./architecture.json";
import { buildModel, parseArchitecture, ROOT_ID } from "./model";

export const KIND_COLORS = {
  home: "#e8ecf8",
  app: "#3ddc84",
  layer: "#4f9dff",
  infra: "#ff5c8a",
  component: "#b388ff",
  resource: "#2dd4bf",
  module: "#ffb547",
};

const KIND_LABELS = {
  home: "Accueil",
  app: "Application",
  layer: "Couche",
  infra: "Infra",
  component: "Composant",
  resource: "Ressource",
  module: "Module",
};

const DEPLOY_COLOR = "#e8ecf8";

const NODE_W = 230;
const NODE_H = 120;
const GAP_X = 120;
const GAP_Y = 22;
const FOCUS_W = 320;
const FOCUS_H = 196;

const SAMPLE_MODEL = buildModel(sample);

// Le dernier fichier importé est gardé dans le navigateur, pour le retrouver au rechargement.
const STORAGE_KEY = "architecture-explorer:file";

const loadSaved = () => {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    const { model } = text ? parseArchitecture(text) : {};
    return model ? { model, source: localStorage.getItem(`${STORAGE_KEY}:name`) || "fichier importé" } : null;
  } catch (e) {
    return null;
  }
};

const save = (text, name) => {
  try {
    if (text === null) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(`${STORAGE_KEY}:name`);
    } else {
      localStorage.setItem(STORAGE_KEY, text);
      localStorage.setItem(`${STORAGE_KEY}:name`, name);
    }
  } catch (e) {
    // Stockage indisponible (navigation privée…) : le fichier reste chargé pour cette session.
  }
};

const readFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });

const plural = (n, word) => `${n} ${word}${n > 1 ? "s" : ""}`;

const treeEdge = (source, target) => {
  const color = KIND_COLORS[target.kind];
  return {
    id: `${source.id}->${target.id}`,
    source: source.id,
    target: target.id,
    type: "smoothstep",
    animated: true,
    style: { stroke: color, strokeWidth: 2, filter: `drop-shadow(0 0 4px ${color})` },
  };
};

// Exploration : le parent à gauche, le nœud courant au centre, ses enfants à droite.
// Les ids restent ceux des nœuds réels : un enfant cliqué glisse jusqu'au centre.
const exploreLayout = (model, currentId, onGo) => {
  const current = model.index[currentId].node;
  const parent = model.index[currentId].parent;
  const children = current.children || [];
  const nodes = [];
  const edges = [];

  if (parent) {
    nodes.push({
      id: parent.id,
      type: "ghost",
      position: { x: -(NODE_W + GAP_X), y: -NODE_H / 2 },
      width: NODE_W,
      height: NODE_H,
      data: { node: parent, model },
    });
    edges.push({ ...treeEdge(parent, current), animated: false, style: { stroke: "rgba(232,236,248,0.25)", strokeWidth: 1.5 } });
  }

  nodes.push({
    id: current.id,
    type: "focus",
    position: { x: 0, y: -FOCUS_H / 2 },
    width: FOCUS_W,
    height: FOCUS_H,
    data: { node: current, model, onGo },
  });

  children.forEach((child, i) => {
    nodes.push({
      id: child.id,
      type: "card",
      position: {
        x: FOCUS_W + GAP_X,
        y: (i - (children.length - 1) / 2) * (NODE_H + GAP_Y) - NODE_H / 2,
      },
      width: NODE_W,
      height: NODE_H,
      data: { node: child, model },
    });
    edges.push(treeEdge(current, child));
  });

  return { nodes, edges };
};

// Vue d'ensemble : tout l'arbre déplié, de gauche à droite.
const overviewLayout = (model, showDeploy) => {
  const nodes = [];
  const edges = [];
  let row = 0;

  const place = (node, depth, parent) => {
    const children = node.children || [];
    let y;
    if (children.length) {
      const ys = children.map((child) => place(child, depth + 1, node));
      y = (ys[0] + ys[ys.length - 1]) / 2;
    } else {
      y = row * (NODE_H + GAP_Y);
      row += 1;
    }
    nodes.push({
      id: node.id,
      type: "card",
      position: { x: depth * (NODE_W + GAP_X), y },
      width: NODE_W,
      height: NODE_H,
      data: { node, model },
    });
    if (parent) edges.push(treeEdge(parent, node));
    return y;
  };
  model.products.forEach((p) => place(p, 0, null));

  if (showDeploy) {
    nodes.forEach(({ data: { node } }) =>
      (node.deployedOn || []).forEach((target) => {
        edges.push({
          id: `deploy:${node.id}->${target}`,
          source: node.id,
          sourceHandle: "deploy-out",
          target,
          targetHandle: "deploy-in",
          type: "smoothstep",
          pathOptions: { offset: 40, borderRadius: 18 },
          animated: true,
          label: "déployé sur",
          labelStyle: { fill: DEPLOY_COLOR, fontSize: 11 },
          labelBgStyle: { fill: "#0b0f1d", fillOpacity: 0.85 },
          labelBgPadding: [6, 3],
          labelBgBorderRadius: 6,
          style: { stroke: DEPLOY_COLOR, strokeWidth: 1.5, strokeDasharray: "2 6", opacity: 0.75 },
        });
      })
    );
  }
  return { nodes, edges };
};

const pop = keyframes`
  from { opacity: 0; transform: scale(0.6) translateX(-30px); filter: blur(6px); }
  to   { opacity: 1; transform: scale(1) translateX(0); filter: blur(0); }
`;

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 18px var(--glow), inset 0 0 0 1px var(--kind); }
  50%      { box-shadow: 0 0 40px var(--glow), inset 0 0 0 1px var(--kind); }
`;

const kindVars = (node) => {
  const color = KIND_COLORS[node.kind];
  return { "--kind": color, "--glow": `${color}66` };
};

const Handles = () => (
  <>
    <Handle type="target" position={Position.Left} />
    <Handle type="source" position={Position.Right} />
    <Handle id="deploy-out" type="source" position={Position.Right} style={{ top: "70%" }} />
    <Handle id="deploy-in" type="target" position={Position.Right} style={{ top: "30%" }} />
  </>
);

const KindRow = ({ node }) => (
  <div className="arch-kind">
    <span className="dot" />
    {KIND_LABELS[node.kind]}
    {node.archType ? ` · ${node.archType}` : ""}
    {node.repo && <span className="repo">⎇ {node.repo}</span>}
  </div>
);

const CardNode = ({ data: { node, model } }) => {
  const count = node.children ? node.children.length : 0;
  return (
    <div className="arch-node card" style={kindVars(node)}>
      <Handles />
      <KindRow node={node} />
      <div className="arch-name">{node.name}</div>
      {node.deployedOn && (
        <div className="deploy-hint">☁ {node.deployedOn.map((id) => model.index[id].node.name).join(", ")}</div>
      )}
      <div className="arch-meta">
        <span>{count > 0 ? plural(count, "sous-composant") : "Voir le détail"}</span>
        <span className="chevron">→</span>
      </div>
    </div>
  );
};

const GhostNode = ({ data: { node } }) => (
  <div className="arch-node ghost" style={kindVars(node)}>
    <Handles />
    <span className="up">← Remonter</span>
    <div className="ghost-name">{node.name}</div>
  </div>
);

const Chips = ({ label, ids, model, onGo }) => (
  <div className="row">
    <span className="row-label">{label}</span>
    <div className="chips">
      {ids.map((id) => {
        const target = model.index[id].node;
        return (
          <button
            key={id}
            className="chip nodrag"
            style={kindVars(target)}
            onClick={(e) => {
              e.stopPropagation();
              onGo(id);
            }}
          >
            {target.name}
          </button>
        );
      })}
    </div>
  </div>
);

const FocusNode = ({ data: { node, model, onGo } }) => {
  const count = node.children ? node.children.length : 0;
  const hosts = model.hostedBy[node.id];
  return (
    <div className="arch-node focus" style={kindVars(node)}>
      <Handles />
      <KindRow node={node} />
      <div className="arch-name">{node.name}</div>
      <p className="description">{node.description}</p>
      {node.deployedOn && <Chips label="Déployé sur" ids={node.deployedOn} model={model} onGo={onGo} />}
      {hosts && <Chips label="Héberge" ids={hosts.map((n) => n.id)} model={model} onGo={onGo} />}
      <div className="arch-meta">
        {count > 0 ? `${plural(count, "sous-composant")} →` : "Aucun sous-composant"}
      </div>
    </div>
  );
};

const nodeTypes = { card: CardNode, ghost: GhostNode, focus: FocusNode };

const Shell = styled.section`
  position: relative;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 90px);
  min-height: 560px;
  margin: 20px auto;
  width: 94%;
  border-radius: 20px;
  overflow: hidden;
  color: #e8ecf8;
  background: radial-gradient(circle at 15% 20%, #1d2b5a 0%, transparent 45%),
    radial-gradient(circle at 85% 80%, #3a1d5a 0%, transparent 45%), #0b0f1d;
  box-shadow: 0 20px 60px rgba(11, 15, 29, 0.45);
  @media screen and (max-width: 681px) {
    width: auto;
    margin: 12px;
    border-radius: 14px;
  }

  .header {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 18px 20px 10px;
    h2 {
      margin: 0;
      font-size: 1.5rem;
      background: linear-gradient(90deg, #3ddc84, #4f9dff, #b388ff);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    .hint {
      margin: 4px 0 0;
      color: rgba(232, 236, 248, 0.65);
      font-size: 0.9rem;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
  }
  .segmented {
    display: inline-flex;
    padding: 3px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    button {
      border: 0;
      background: transparent;
    }
    button.on {
      background: rgba(232, 236, 248, 0.9);
      color: #0b0f1d;
    }
  }
  .header button {
    cursor: pointer;
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: rgba(255, 255, 255, 0.06);
    color: #e8ecf8;
    border-radius: 999px;
    padding: 6px 14px;
    font: inherit;
    font-size: 0.85rem;
    &:hover {
      background: rgba(255, 255, 255, 0.14);
    }
    &.toggle.on {
      border-color: rgba(232, 236, 248, 0.6);
      background: rgba(232, 236, 248, 0.16);
    }
  }
  .crumbs {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    padding: 0 20px 6px;
    font-size: 0.9rem;
    min-height: 26px;
    button {
      background: none;
      border: 0;
      padding: 2px 4px;
      border-radius: 6px;
      cursor: pointer;
      color: rgba(232, 236, 248, 0.7);
      font: inherit;
      &:hover {
        color: #fff;
        background: rgba(255, 255, 255, 0.08);
      }
    }
    .sep {
      color: rgba(232, 236, 248, 0.35);
    }
    .current {
      color: var(--kind);
      font-weight: 700;
      padding: 2px 4px;
    }
  }
  .flow {
    position: relative;
    flex: 1;
    min-height: 0;
  }
  .drop-hint {
    position: absolute;
    inset: 12px;
    z-index: 10;
    display: grid;
    place-items: center;
    border: 2px dashed rgba(232, 236, 248, 0.6);
    border-radius: 16px;
    background: rgba(11, 15, 29, 0.7);
    font-size: 1.2rem;
    pointer-events: none;
  }
  .source {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    padding: 0 20px 8px;
    font-size: 0.8rem;
    color: rgba(232, 236, 248, 0.55);
    code {
      color: #e8ecf8;
    }
    button {
      cursor: pointer;
      background: none;
      border: 0;
      padding: 0;
      font: inherit;
      color: #4f9dff;
      text-decoration: underline;
    }
  }
  .errors {
    margin: 0 20px 10px;
    padding: 10px 14px;
    border-radius: 12px;
    border: 1px solid rgba(255, 92, 138, 0.6);
    background: rgba(255, 92, 138, 0.12);
    font-size: 0.85rem;
    .errors-title {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      button {
        cursor: pointer;
        background: none;
        border: 0;
        color: inherit;
        font-size: 1.2rem;
        line-height: 1;
      }
    }
    ul {
      margin: 6px 0 0;
      padding-left: 18px;
    }
  }

  .react-flow__node {
    transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .react-flow__handle {
    opacity: 0;
    pointer-events: none;
  }

  .arch-node {
    box-sizing: border-box;
    padding: 14px 16px;
    border-radius: 14px;
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.02));
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    display: flex;
    flex-direction: column;
    gap: 4px;
    cursor: pointer;
    animation: ${pop} 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
    transition: border-color 0.2s, transform 0.2s, opacity 0.2s;
  }
  .card {
    width: ${NODE_W}px;
    height: ${NODE_H}px;
    &:hover {
      transform: translateX(4px);
      border-color: var(--kind);
      .chevron {
        transform: translateX(3px);
      }
    }
  }
  .ghost {
    width: ${NODE_W}px;
    height: ${NODE_H}px;
    justify-content: center;
    opacity: 0.5;
    border-style: dashed;
    &:hover {
      opacity: 0.9;
      transform: translateX(-4px);
    }
    .up {
      font-size: 0.8rem;
      color: rgba(232, 236, 248, 0.7);
    }
    .ghost-name {
      font-size: 1.05rem;
      font-weight: 700;
    }
  }
  .focus {
    width: ${FOCUS_W}px;
    height: ${FOCUS_H}px;
    padding: 18px 20px;
    cursor: default;
    border-color: var(--kind);
    animation: ${pop} 0.6s cubic-bezier(0.22, 1, 0.36, 1) both,
      ${glow} 2.6s ease-in-out 0.6s infinite;
    .arch-name {
      font-size: 1.5rem;
    }
    .description {
      margin: 2px 0 6px;
      font-size: 0.9rem;
      color: rgba(232, 236, 248, 0.8);
    }
  }
  .arch-kind {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--kind);
    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--kind);
      box-shadow: 0 0 8px var(--kind);
    }
    .repo {
      margin-left: auto;
      padding: 2px 7px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      color: rgba(232, 236, 248, 0.75);
      text-transform: none;
      letter-spacing: 0;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }
  }
  .arch-name {
    font-size: 1.15rem;
    font-weight: 700;
    color: #fff;
  }
  .deploy-hint {
    font-size: 0.75rem;
    color: rgba(232, 236, 248, 0.6);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .arch-meta {
    margin-top: auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8rem;
    color: rgba(232, 236, 248, 0.6);
    .chevron {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: var(--kind);
      color: #0b0f1d;
      font-weight: 700;
      transition: transform 0.2s;
    }
  }
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.8rem;
    .row-label {
      color: rgba(232, 236, 248, 0.55);
      min-width: 78px;
    }
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .chip {
    cursor: pointer;
    font: inherit;
    font-size: 0.75rem;
    padding: 2px 8px;
    border-radius: 999px;
    border: 1px solid var(--kind);
    background: rgba(255, 255, 255, 0.04);
    color: var(--kind);
    &:hover {
      background: var(--kind);
      color: #0b0f1d;
    }
  }

  .react-flow__controls {
    box-shadow: none;
    button {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.1);
      fill: #e8ecf8;
      &:hover {
        background: rgba(255, 255, 255, 0.18);
      }
    }
  }
  .react-flow__minimap {
    border-radius: 10px;
    overflow: hidden;
  }
  .react-flow__attribution {
    background: transparent;
    a {
      color: rgba(232, 236, 248, 0.4);
    }
  }
`;

const Explorer = () => {
  const [mode, setMode] = useState("explore");
  const [currentId, setCurrentId] = useState(ROOT_ID);
  const [showDeploy, setShowDeploy] = useState(true);
  const [{ model, source }, setLoaded] = useState(() => loadSaved() || { model: SAMPLE_MODEL, source: null });
  const [errors, setErrors] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef(null);
  const { fitView } = useReactFlow();

  const show = (loaded) => {
    setLoaded(loaded);
    setErrors(null);
    setMode("explore");
    setCurrentId(ROOT_ID);
  };

  const importFile = (file) => {
    if (!file) return;
    readFile(file).then(
      (text) => {
        const result = parseArchitecture(text);
        if (result.errors) {
          setErrors({ name: file.name, list: result.errors });
          return;
        }
        save(text, file.name);
        show({ model: result.model, source: file.name });
      },
      () => setErrors({ name: file.name, list: ["Impossible de lire ce fichier."] })
    );
  };

  const backToSample = () => {
    save(null);
    show({ model: SAMPLE_MODEL, source: null });
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    importFile(e.dataTransfer.files[0]);
  };

  const go = useCallback((id) => {
    setMode("explore");
    setCurrentId(id);
  }, []);

  const { nodes, edges } = useMemo(
    () => (mode === "explore" ? exploreLayout(model, currentId, go) : overviewLayout(model, showDeploy)),
    [model, mode, currentId, go, showDeploy]
  );

  // La caméra suit chaque changement de vue.
  useEffect(() => {
    const timer = setTimeout(() => fitView({ duration: 700, padding: 0.15, maxZoom: 1 }), 60);
    return () => clearTimeout(timer);
  }, [model, mode, currentId, fitView]);

  // Échap remonte d'un niveau.
  useEffect(() => {
    const onKey = (e) => {
      const parent = model.index[currentId].parent;
      if (e.key === "Escape" && mode === "explore" && parent) setCurrentId(parent.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [model, currentId, mode]);

  const onNodeClick = useCallback(
    (_, flowNode) => {
      if (flowNode.type !== "focus") go(flowNode.id);
    },
    [go]
  );

  const path = model.pathTo(currentId);
  const current = model.index[currentId].node;

  return (
    <>
      <div className="header">
        <div>
          <h2>Explorateur d'architecture</h2>
          <p className="hint">
            {mode === "explore"
              ? "Clique sur un bloc à droite pour entrer dedans, sur celui de gauche pour remonter."
              : "Clique sur n'importe quel bloc pour l'explorer."}
          </p>
        </div>
        <div className="actions">
          <div className="segmented" role="group" aria-label="Mode d'affichage">
            <button className={mode === "explore" ? "on" : ""} onClick={() => setMode("explore")}>
              Exploration
            </button>
            <button className={mode === "overview" ? "on" : ""} onClick={() => setMode("overview")}>
              Vue d'ensemble
            </button>
          </div>
          {mode === "overview" && (
            <button
              className={`toggle${showDeploy ? " on" : ""}`}
              aria-pressed={showDeploy}
              onClick={() => setShowDeploy((v) => !v)}
            >
              Liens infra
            </button>
          )}
          <button onClick={() => fileInput.current.click()}>Importer un JSON</button>
          <input
            ref={fileInput}
            data-testid="architecture-file"
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              importFile(e.target.files[0]);
              e.target.value = "";
            }}
          />
        </div>
      </div>
      <div className="source">
        {source ? (
          <>
            <span>
              Fichier affiché : <code>{source}</code>
            </span>
            <button onClick={backToSample}>Revenir à l'exemple</button>
          </>
        ) : (
          <span>
            Exemple affiché. Importe ton <code>architecture.json</code> ou dépose-le sur le canevas.
          </span>
        )}
      </div>
      {errors && (
        <div className="errors" role="alert">
          <div className="errors-title">
            <strong>{errors.name} n'a pas pu être chargé :</strong>
            <button onClick={() => setErrors(null)} aria-label="Fermer">
              ×
            </button>
          </div>
          <ul>
            {errors.list.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        </div>
      )}
      {mode === "explore" && (
        <nav className="crumbs" aria-label="Fil d'Ariane" style={kindVars(current)}>
          {path.map((node, i) => (
            <React.Fragment key={node.id}>
              {i > 0 && <span className="sep">›</span>}
              {i === path.length - 1 ? (
                <span className="current">{node.name}</span>
              ) : (
                <button onClick={() => go(node.id)}>{node.name}</button>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
      <div
        className="flow"
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        {dragging && <div className="drop-hint">Dépose ton architecture.json</div>}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          fitView
          minZoom={0.2}
        >
          <Background variant="dots" gap={22} size={1.3} color="rgba(255,255,255,0.12)" />
          <Controls showInteractive={false} />
          {mode === "overview" && (
            <MiniMap
              pannable
              zoomable
              bgColor="rgba(11,15,29,0.85)"
              maskColor="rgba(11,15,29,0.6)"
              nodeColor={(n) => KIND_COLORS[n.data.node.kind]}
              nodeBorderRadius={8}
            />
          )}
        </ReactFlow>
      </div>
    </>
  );
};

const ArchitectureExplorer = () => (
  <Shell>
    <ReactFlowProvider>
      <Explorer />
    </ReactFlowProvider>
  </Shell>
);

export default ArchitectureExplorer;
