import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import App from './App';

// Bloc affiché dans le canevas (carte ou bloc central), hors fil d'Ariane.
const block = (name) =>
  screen.queryAllByText(name).find((el) => el.classList.contains('arch-name'));
const open = (name) => fireEvent.click(block(name));
const focusName = () =>
  document.querySelector('.focus .arch-name').textContent;

beforeEach(() => window.localStorage.clear());

test('drills down from products to layers, one level at a time', () => {
  render(<App />);
  expect(focusName()).toBe('Mes produits');
  expect(block('CyberPath')).toBeInTheDocument();
  expect(block('Frontend')).toBeUndefined();

  open('CyberPath');
  expect(focusName()).toBe('CyberPath');
  expect(block('Frontend')).toBeInTheDocument();
  expect(block('Backend')).toBeInTheDocument();
  expect(block('Infra')).toBeInTheDocument();

  open('Backend');
  expect(focusName()).toBe('Backend');
  expect(block('Auth')).toBeInTheDocument();
  expect(block('Frontend')).toBeUndefined();

  const crumbs = screen.getByRole('navigation', { name: "Fil d'Ariane" });
  fireEvent.click(within(crumbs).getByText('Mes produits'));
  expect(block('Portfolio')).toBeInTheDocument();
});

test('the parent block on the left goes back up', () => {
  render(<App />);
  open('CyberPath');
  open('Backend');
  fireEvent.click(screen.getByText('CyberPath', { selector: '.ghost-name' }));
  expect(focusName()).toBe('CyberPath');
});

test('static product has no backend', () => {
  render(<App />);
  open('Portfolio');
  expect(block('Frontend')).toBeInTheDocument();
  expect(block('Infra')).toBeInTheDocument();
  expect(block('Backend')).toBeUndefined();
});

test('infra resources link to what they host', () => {
  render(<App />);
  open('CyberPath');
  open('Infra');
  open('Kubernetes (EKS)');
  expect(screen.getByText('Héberge')).toBeInTheDocument();

  fireEvent.click(screen.getByText('API', { selector: '.chip' }));
  expect(focusName()).toBe('API');
  expect(block('/courses')).toBeInTheDocument();
  expect(screen.getByText('Kubernetes (EKS)', { selector: '.chip' })).toBeInTheDocument();
});

test('overview shows the whole tree and opens any block', () => {
  const { container } = render(<App />);
  fireEvent.click(screen.getByText("Vue d'ensemble"));
  expect(block('JWT')).toBeInTheDocument();
  expect(container.querySelector('[data-id="deploy:cp-api->cp-k8s"]')).not.toBeNull();

  fireEvent.click(screen.getByText('Liens infra'));
  expect(container.querySelector('[data-id="deploy:cp-api->cp-k8s"]')).toBeNull();

  open('JWT');
  expect(focusName()).toBe('JWT');
  expect(screen.getByText('Auth', { selector: '.ghost-name' })).toBeInTheDocument();
});

const upload = (content, name = 'architecture.json') =>
  fireEvent.change(screen.getByTestId('architecture-file'), {
    target: { files: [new File([content], name, { type: 'application/json' })] },
  });

const shop = JSON.stringify({
  version: 1,
  products: [{ id: 'shop', name: 'Shop', kind: 'app', children: [{ id: 'web', name: 'Web', kind: 'layer' }] }],
});

test('imports an architecture.json and goes back to the example', async () => {
  render(<App />);
  upload(shop, 'shop.json');
  expect(await screen.findByText('shop.json')).toBeInTheDocument();
  expect(block('Shop')).toBeInTheDocument();
  expect(block('CyberPath')).toBeUndefined();

  open('Shop');
  expect(block('Web')).toBeInTheDocument();

  fireEvent.click(screen.getByText("Revenir à l'exemple"));
  expect(block('CyberPath')).toBeInTheDocument();
});

test('keeps the imported file after a reload', async () => {
  const { unmount } = render(<App />);
  upload(shop, 'shop.json');
  await screen.findByText('shop.json');
  unmount();

  render(<App />);
  expect(block('Shop')).toBeInTheDocument();
});

test('shows why an invalid file was rejected', async () => {
  render(<App />);
  upload('{"version": 1, "products": [{"id": "x", "kind": "app"}]}', 'broken.json');
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent('broken.json');
  expect(alert).toHaveTextContent('"name" manquant');
  expect(block('CyberPath')).toBeInTheDocument();
});
