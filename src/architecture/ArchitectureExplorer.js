import React, { useState } from "react";
import styled from "styled-components";
import products from "./data";

const KIND_COLORS = {
  app: "#288c12",
  layer: "#1f6feb",
  component: "#8250df",
  module: "#bf8700",
};

const Container = styled.section`
  width: 70%;
  margin: 30px auto;
  font-family: inherit;
  @media screen and (max-width: 681px) {
    width: auto;
    margin: 20px 16px;
  }
  .breadcrumb {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin-bottom: 20px;
    button {
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      color: #288c12;
      font-size: 1rem;
    }
    .current {
      font-weight: bold;
    }
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
  }
  .empty {
    color: #666;
  }
`;

const Card = styled.button`
  text-align: left;
  background: white;
  border: 1px solid #ddd;
  border-top: 4px solid ${(props) => KIND_COLORS[props.kind]};
  border-radius: 6px;
  padding: 16px;
  box-shadow: 1px 2px 10px rgba(0, 0, 0, 0.08);
  cursor: ${(props) => (props.clickable ? "pointer" : "default")};
  transition: transform 0.15s ease-in-out;
  &:hover {
    transform: ${(props) => (props.clickable ? "translateY(-3px)" : "none")};
  }
  .kind {
    font-size: 0.75rem;
    text-transform: uppercase;
    color: ${(props) => KIND_COLORS[props.kind]};
  }
  h3 {
    margin: 6px 0;
  }
  p {
    margin: 0 0 8px;
    color: #555;
    font-size: 0.9rem;
  }
  .count {
    font-size: 0.8rem;
    color: #888;
  }
`;

const ArchitectureExplorer = () => {
  // Chemin depuis la racine : [] = liste des produits, [app, layer, ...] = niveaux ouverts
  const [path, setPath] = useState([]);

  const current = path[path.length - 1];
  const items = current ? current.children || [] : products;

  return (
    <Container>
      <nav className="breadcrumb">
        {path.length === 0 ? (
          <span className="current">Produits</span>
        ) : (
          <button onClick={() => setPath([])}>Produits</button>
        )}
        {path.map((node, i) => (
          <React.Fragment key={node.id}>
            <span>›</span>
            {i === path.length - 1 ? (
              <span className="current">{node.name}</span>
            ) : (
              <button onClick={() => setPath(path.slice(0, i + 1))}>
                {node.name}
              </button>
            )}
          </React.Fragment>
        ))}
      </nav>

      {items.length === 0 ? (
        <p className="empty">Aucun sous-composant.</p>
      ) : (
        <div className="grid">
          {items.map((node) => {
            const count = node.children ? node.children.length : 0;
            return (
              <Card
                key={node.id}
                kind={node.kind}
                clickable={count > 0}
                onClick={() => count > 0 && setPath([...path, node])}
              >
                <span className="kind">
                  {node.kind}
                  {node.archType ? ` · ${node.archType}` : ""}
                </span>
                <h3>{node.name}</h3>
                <p>{node.description}</p>
                <span className="count">
                  {count > 0 ? `${count} sous-composant(s) →` : "Feuille"}
                </span>
              </Card>
            );
          })}
        </div>
      )}
    </Container>
  );
};

export default ArchitectureExplorer;
