import React from "react";
import { Handle, Position } from "@xyflow/react";

export const KIND_COLORS = {
  home: "#e8ecf8",
  app: "#3ddc84",
  layer: "#4f9dff",
  infra: "#ff5c8a",
  component: "#b388ff",
  resource: "#2dd4bf",
  module: "#ffb547",
  external: "#a5b4fc",
  internet: "#ff4d6d",
};

export const KIND_LABELS = {
  home: "Accueil",
  app: "Application",
  layer: "Couche",
  infra: "Infra",
  component: "Composant",
  resource: "Ressource",
  module: "Module",
  external: "Externe",
  internet: "Internet",
};

export const NODE_W = 230;
export const NODE_H = 120;
export const GAP_X = 120;
export const GAP_Y = 22;

export const plural = (n, word) => `${n} ${word}${n > 1 ? "s" : ""}`;

export const kindVars = (node) => {
  const color = KIND_COLORS[node.kind];
  return { "--kind": color, "--glow": `${color}66` };
};

export const Handles = () => (
  <>
    <Handle type="target" position={Position.Left} />
    <Handle type="source" position={Position.Right} />
    <Handle id="deploy-out" type="source" position={Position.Right} style={{ top: "70%" }} />
    <Handle id="deploy-in" type="target" position={Position.Right} style={{ top: "30%" }} />
    <Handle id="back-out" type="source" position={Position.Left} style={{ top: "70%" }} />
  </>
);

export const KindRow = ({ node }) => (
  <div className="arch-kind">
    <span className="dot" />
    {KIND_LABELS[node.kind]}
    {node.archType ? ` · ${node.archType}` : ""}
    {node.repo && <span className="repo">⎇ {node.repo}</span>}
  </div>
);
