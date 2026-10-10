import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled, { keyframes } from "styled-components";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Panel,
  Handle,
  Position,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import products from "./data";

export const KIND_COLORS = {
  app: "#3ddc84",
  layer: "#4f9dff",
  component: "#b388ff",
  module: "#ffb547",
};

const NODE_W = 230;
const NODE_H = 100;
const GAP_X = 120;
const GAP_Y = 26;

// Index id -> { node, parent } pour retrouver le chemin d'un nœud.
const index = {};
const indexTree = (node, parent) => {
  index[node.id] = { node, parent };
  (node.children || []).forEach((child) => indexTree(child, node));
};
products.forEach((p) => indexTree(p, null));

const pathTo = (id) => {
  const path = [];
  for (let cur = index[id]; cur; cur = cur.parent && index[cur.parent.id]) {
    path.unshift(cur.node);
  }
  return path;
};

// Arbre horizontal : la profondeur donne x, les feuilles visibles s'empilent en y
// et chaque parent ouvert est centré sur ses enfants.
const layout = (expanded) => {
  const nodes = [];
  const edges = [];
  let row = 0;

  const place = (node, depth, parent) => {
    const children = node.children || [];
    const open = expanded.has(node.id) && children.length > 0;
    let y;
    if (open) {
      const ys = children.map((child) => place(child, depth + 1, node));
      y = (ys[0] + ys[ys.length - 1]) / 2;
    } else {
      y = row * (NODE_H + GAP_Y);
      row += 1;
    }
    nodes.push({
      id: node.id,
      type: "arch",
      position: { x: depth * (NODE_W + GAP_X), y },
      width: NODE_W,
      height: NODE_H,
      data: { node, open },
    });
    if (parent) {
      const color = KIND_COLORS[node.kind];
      edges.push({
        id: `${parent.id}->${node.id}`,
        source: parent.id,
        target: node.id,
        type: "smoothstep",
        animated: true,
        style: { stroke: color, strokeWidth: 2, filter: `drop-shadow(0 0 4px ${color})` },
      });
    }
    return y;
  };

  products.forEach((p) => place(p, 0, null));
  return { nodes, edges };
};

const pop = keyframes`
  from { opacity: 0; transform: scale(0.6) translateX(-30px); filter: blur(6px); }
  to   { opacity: 1; transform: scale(1) translateX(0); filter: blur(0); }
`;

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 18px var(--glow), inset 0 0 0 1px var(--kind); }
  50%      { box-shadow: 0 0 34px var(--glow), inset 0 0 0 1px var(--kind); }
`;

const ArchNode = ({ data, selected }) => {
  const { node, open } = data;
  const count = node.children ? node.children.length : 0;
  const color = KIND_COLORS[node.kind];
  return (
    <div
      className={`arch-node${selected ? " selected" : ""}${open ? " open" : ""}`}
      style={{ "--kind": color, "--glow": `${color}66` }}
    >
      <Handle type="target" position={Position.Left} />
      <div className="arch-kind">
        <span className="dot" />
        {node.kind}
        {node.archType ? ` · ${node.archType}` : ""}
      </div>
      <div className="arch-name">{node.name}</div>
      <div className="arch-meta">
        {count > 0 ? (
          <>
            <span>{count} sous-composant{count > 1 ? "s" : ""}</span>
            <span className="chevron">{open ? "−" : "+"}</span>
          </>
        ) : (
          <span>Feuille</span>
        )}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
};

const nodeTypes = { arch: ArchNode };

const Shell = styled.section`
  position: relative;
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

  .react-flow__node {
    transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .react-flow__handle {
    opacity: 0;
    pointer-events: none;
  }

  .arch-node {
    width: ${NODE_W}px;
    height: ${NODE_H}px;
    box-sizing: border-box;
    padding: 14px 16px;
    border-radius: 14px;
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.02));
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 0 0 transparent;
    display: flex;
    flex-direction: column;
    gap: 4px;
    cursor: pointer;
    animation: ${pop} 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
    transition: border-color 0.2s, transform 0.2s;
    &:hover {
      transform: translateY(-2px);
      border-color: var(--kind);
    }
    &.open,
    &.selected {
      border-color: var(--kind);
      animation: ${pop} 0.6s cubic-bezier(0.22, 1, 0.36, 1) both,
        ${glow} 2.4s ease-in-out 0.6s infinite;
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
  }
  .arch-name {
    font-size: 1.15rem;
    font-weight: 700;
    color: #fff;
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
    }
  }

  .header {
    h2 {
      margin: 0;
      font-size: 1.5rem;
      background: linear-gradient(90deg, #3ddc84, #4f9dff, #b388ff);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    p {
      margin: 4px 0 10px;
      color: rgba(232, 236, 248, 0.65);
      font-size: 0.9rem;
    }
    .actions {
      display: flex;
      gap: 8px;
    }
    button {
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
    }
  }

  .details {
    width: 260px;
    max-width: calc(100vw - 60px);
    padding: 16px;
    border-radius: 14px;
    background: rgba(11, 15, 29, 0.75);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    .crumbs {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      font-size: 0.75rem;
      color: rgba(232, 236, 248, 0.55);
      margin-bottom: 8px;
    }
    h3 {
      margin: 0 0 6px;
      color: var(--kind);
    }
    p {
      margin: 0 0 10px;
      font-size: 0.9rem;
      color: rgba(232, 236, 248, 0.8);
    }
    ul {
      margin: 0;
      padding-left: 18px;
      font-size: 0.85rem;
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
  const [expanded, setExpanded] = useState(() => new Set());
  const [selectedId, setSelectedId] = useState(null);
  const [focusId, setFocusId] = useState(null);
  const { fitView } = useReactFlow();

  const { nodes, edges } = useMemo(() => layout(expanded), [expanded]);
  const flowNodes = useMemo(
    () => nodes.map((n) => ({ ...n, selected: n.id === selectedId })),
    [nodes, selectedId]
  );

  // Après chaque ouverture, la caméra zoome sur le nœud et ses enfants.
  useEffect(() => {
    const target = focusId && index[focusId];
    const ids =
      target && expanded.has(focusId)
        ? [focusId, ...(target.node.children || []).map((c) => c.id)]
        : null;
    const timer = setTimeout(() => {
      fitView({
        nodes: ids ? ids.map((id) => ({ id })) : undefined,
        duration: 800,
        padding: 0.4,
        maxZoom: 0.95,
      });
    }, 60);
    return () => clearTimeout(timer);
  }, [expanded, focusId, fitView]);

  const onNodeClick = useCallback((_, flowNode) => {
    const id = flowNode.id;
    setSelectedId(id);
    if (!index[id].node.children) return;
    setFocusId(id);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = () => {
    setFocusId(null);
    setExpanded(new Set(Object.keys(index).filter((id) => index[id].node.children)));
  };
  const reset = () => {
    setFocusId(null);
    setSelectedId(null);
    setExpanded(new Set());
  };

  const selected = selectedId && index[selectedId].node;

  return (
    <ReactFlow
      nodes={flowNodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={onNodeClick}
      nodesDraggable={false}
      nodesConnectable={false}
      fitView
      minZoom={0.2}
    >
      <Background variant="dots" gap={22} size={1.3} color="rgba(255,255,255,0.12)" />
      <Panel position="top-left" className="header">
        <h2>Explorateur d'architecture</h2>
        <p>Clique sur un nœud pour révéler ses sous-composants.</p>
        <div className="actions">
          <button onClick={expandAll}>Tout déplier</button>
          <button onClick={reset}>Réinitialiser</button>
        </div>
      </Panel>
      {selected && (
        <Panel position="top-right">
          <div className="details" style={{ "--kind": KIND_COLORS[selected.kind] }}>
            <div className="crumbs">
              {pathTo(selected.id).map((n, i) => (
                <span key={n.id}>
                  {i > 0 && "› "}
                  {n.name}
                </span>
              ))}
            </div>
            <h3>{selected.name}</h3>
            <p>{selected.description}</p>
            {selected.children && (
              <ul>
                {selected.children.map((c) => (
                  <li key={c.id}>{c.name}</li>
                ))}
              </ul>
            )}
          </div>
        </Panel>
      )}
      <Controls showInteractive={false} />
      <MiniMap
        pannable
        zoomable
        bgColor="rgba(11,15,29,0.85)"
        maskColor="rgba(11,15,29,0.6)"
        nodeColor={(n) => KIND_COLORS[n.data.node.kind]}
        nodeBorderRadius={8}
      />
    </ReactFlow>
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
