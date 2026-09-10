import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { persistMeta, reloadMeta } from '../stores/metaStore';
import CodexScreen from './CodexScreen.svelte';

describe('CodexScreen.svelte', () => {
  beforeEach(() => { localStorage.clear(); reloadMeta(); });

  it('shows locked entries until unlocked', async () => {
    render(CodexScreen, { props: {} });
    expect(screen.getAllByText(/locked/i).length).toBeGreaterThan(0);
  });

  it('reveals flavor for an unlocked monster', async () => {
    persistMeta((m) => ({ ...m, codexUnlocks: ['monster:fast'] }));
    render(CodexScreen, { props: {} });
    expect(screen.getByText(/Flicker/)).toBeInTheDocument();
  });
});
