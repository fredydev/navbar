import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

const nodeNamed = (name) =>
  screen.getAllByText(name).find((el) => el.classList.contains('arch-name'));
const queryNodeNamed = (name) =>
  screen.queryAllByText(name).find((el) => el.classList.contains('arch-name'));

test('drills down from product to its layers and components', () => {
  render(<App />);
  expect(queryNodeNamed('Frontend')).toBeUndefined();

  fireEvent.click(nodeNamed('CyberPath'));
  expect(nodeNamed('Frontend')).toBeInTheDocument();
  expect(nodeNamed('Backend')).toBeInTheDocument();

  fireEvent.click(nodeNamed('Backend'));
  expect(nodeNamed('Auth')).toBeInTheDocument();

  fireEvent.click(nodeNamed('CyberPath'));
  expect(queryNodeNamed('Backend')).toBeUndefined();
});

test('static product only exposes a frontend', () => {
  render(<App />);
  fireEvent.click(nodeNamed('Portfolio'));
  expect(nodeNamed('Frontend')).toBeInTheDocument();
  expect(queryNodeNamed('Backend')).toBeUndefined();
});

test('reset collapses everything', () => {
  render(<App />);
  fireEvent.click(screen.getByText('Tout déplier'));
  expect(nodeNamed('JWT')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Réinitialiser'));
  expect(queryNodeNamed('JWT')).toBeUndefined();
});
