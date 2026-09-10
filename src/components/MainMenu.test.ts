import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { get } from 'svelte/store';
import { ui } from '../stores/uiStore';
import MainMenu from './MainMenu.svelte';

describe('MainMenu.svelte', () => {
  beforeEach(() => ui.set({ screen: 'menu', modal: null, selectedClass: null }));

  it('New Run routes to class select', async () => {
    render(MainMenu, { props: {} });
    await userEvent.click(screen.getByRole('button', { name: /new run/i }));
    expect(get(ui).screen).toBe('class-select');
  });

  it('hides Continue without a save and shows it with one', async () => {
    const oncontinue = vi.fn();
    const { rerender } = render(MainMenu, { props: { hasSave: false, oncontinue } });
    expect(screen.queryByRole('button', { name: /continue/i })).toBeNull();
    await rerender({ hasSave: true, oncontinue });
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(oncontinue).toHaveBeenCalled();
  });
});
