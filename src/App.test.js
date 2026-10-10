import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import App from './App';

// Bloc affiché dans le canevas (carte ou bloc central), hors fil d'Ariane.
const block = (name) =>
  screen.queryAllByText(name).find((el) => el.classList.contains('arch-name'));
const open = (name) => fireEvent.click(block(name));
const focusName = () =>
  document.querySelector('.focus .arch-name').textContent;

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
