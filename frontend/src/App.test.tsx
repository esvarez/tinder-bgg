import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { App } from './App';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('App routing', () => {
  it('shows the collection page with the main navigation', () => {
    renderAt('/');

    expect(screen.getByRole('heading', { name: 'Collection' })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(nav).toHaveTextContent('Add game');
    expect(nav).toHaveTextContent('Duel');
    expect(nav).toHaveTextContent('Ranking');
    expect(nav).toHaveTextContent('Stats');
  });

  it('navigates between pages', async () => {
    const user = userEvent.setup();
    renderAt('/');

    for (const name of ['Add game', 'Duel', 'Ranking', 'Stats', 'Collection']) {
      await user.click(screen.getByRole('link', { name }));
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    }
  });

  it('marks the current page in the navigation', async () => {
    const user = userEvent.setup();
    renderAt('/');

    expect(screen.getByRole('link', { name: 'Collection' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await user.click(screen.getByRole('link', { name: 'Duel' }));
    expect(screen.getByRole('link', { name: 'Duel' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Collection' })).not.toHaveAttribute('aria-current');
  });

  it('renders the login page without the navigation', () => {
    renderAt('/login');

    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();
  });

  it('shows a not-found page for unknown addresses', () => {
    renderAt('/nope');

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });
});
