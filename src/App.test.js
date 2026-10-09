import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import App from './App';

test('drills down from product to its layers and components', () => {
  const { getByText, queryByText } = render(<App />);
  expect(queryByText('Frontend')).toBeNull();

  fireEvent.click(getByText('CyberPath'));
  expect(getByText('Frontend')).toBeInTheDocument();
  expect(getByText('Backend')).toBeInTheDocument();

  fireEvent.click(getByText('Backend'));
  expect(getByText('Auth')).toBeInTheDocument();

  fireEvent.click(getByText('Produits'));
  expect(getByText('Portfolio')).toBeInTheDocument();
});

test('static product only exposes a frontend', () => {
  const { getByText, queryByText } = render(<App />);
  fireEvent.click(getByText('Portfolio'));
  expect(getByText('Frontend')).toBeInTheDocument();
  expect(queryByText('Backend')).toBeNull();
});
