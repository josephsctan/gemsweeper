import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { get } from 'svelte/store';
import { ui } from '../stores/uiStore';
import ClassSelect from './ClassSelect.svelte';

describe('ClassSelect.svelte', () => {
  beforeEach(() => ui.set({ screen: 'class-select', modal: null, selectedClass: null }));

  it('shows both classes and confirms a choice', async () => {
    render(ClassSelect, { props: {} });
    expect(screen.getByText('Sapper')).toBeInTheDocument();
    expect(screen.getByText('Diviner')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /choose diviner/i }));
    expect(get(ui).selectedClass).toBe('diviner');
    expect(get(ui).screen).toBe('prologue');
  });
});
