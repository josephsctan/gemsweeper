import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { get } from 'svelte/store';
import { createRun, enterFloor } from '../lib/run';
import { createRng } from '../lib/rng';
import { makeItem } from '../lib/items';
import { addToInventory } from '../lib/inventory';
import { runState, setRun } from '../stores/runStore';
import InventoryPanel from './InventoryPanel.svelte';

let n = 0;
const item = (d: string) => makeItem(d, createRng(++n));

describe('InventoryPanel.svelte', () => {
  beforeEach(() => {
    const r = createRun(1, 'sapper', item('sappers-pick'), item('blast-plating'), 0);
    enterFloor(r);
    addToInventory(r, item('iron-maul'));
    setRun(r);
  });

  it('lists inventory items with their effect text and equips on click', async () => {
    render(InventoryPanel, { props: { open: true, onclose: vi.fn() } });
    expect(screen.getByText('Iron Maul')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /equip iron maul/i }));
    expect(get(runState)!.equipped.weapon!.defId).toBe('iron-maul');
  });

  it('unequips a slot back to inventory', async () => {
    render(InventoryPanel, { props: { open: true, onclose: vi.fn() } });
    await userEvent.click(screen.getByRole('button', { name: /unequip weapon/i }));
    expect(get(runState)!.equipped.weapon).toBeNull();
  });

  it('drops an inventory item', async () => {
    render(InventoryPanel, { props: { open: true, onclose: vi.fn() } });
    await userEvent.click(screen.getByRole('button', { name: /drop iron maul/i }));
    expect(get(runState)!.inventory.find((i) => i.defId === 'iron-maul')).toBeUndefined();
  });
});
