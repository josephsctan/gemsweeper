import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { get } from 'svelte/store';
import { DEFAULT_RULE_FLAGS } from '../lib/types';
import { boardSession, loadRoom, clearRoom, applyReveal } from '../stores/boardStore';
import Board from './Board.svelte';

const RULES = { ...DEFAULT_RULE_FLAGS };

function tileButton(r: number, c: number): HTMLElement {
  return screen.getByTestId
    ? screen.getByTestId(`tile-${r}-${c}`)
    : (document.querySelector(`[data-testid="tile-${r}-${c}"]`) as HTMLElement);
}

describe('Board.svelte', () => {
  beforeEach(() => {
    clearRoom();
    loadRoom(555, 1, 0, 5);
  });

  it('renders one button per tile', () => {
    render(Board, { props: { rules: RULES } });
    expect(document.querySelectorAll('[data-testid^="tile-"]').length).toBe(64);
  });

  it('left-click emits a reveal request for a covered tile', async () => {
    const onrevealrequest = vi.fn();
    render(Board, { props: { rules: RULES, onrevealrequest } });
    await userEvent.click(tileButton(4, 4));
    expect(onrevealrequest).toHaveBeenCalledWith('reveal', 4, 4);
  });

  it('left-click emits a chord request for an already-revealed number', async () => {
    applyReveal(4, 4, RULES); // places mines + opens a region through the store
    const numbered = get(boardSession)!.board.tiles.flat().find((t) => t.revealed && t.adjacent > 0)!;
    const onrevealrequest = vi.fn();
    render(Board, { props: { rules: RULES, onrevealrequest } });
    await userEvent.click(tileButton(numbered.r, numbered.c));
    expect(onrevealrequest).toHaveBeenCalledWith('chord', numbered.r, numbered.c);
  });

  it('right-click flags a covered tile internally', async () => {
    render(Board, { props: { rules: RULES } });
    await userEvent.pointer({ keys: '[MouseRight]', target: tileButton(0, 0) });
    expect(get(boardSession)!.board.tiles[0]![0]!.flagged).toBe(true);
  });

  it('in targeting mode a click emits ontarget instead of a reveal request', async () => {
    const ontarget = vi.fn();
    const onrevealrequest = vi.fn();
    render(Board, { props: { rules: RULES, targetingMode: 'probe', ontarget, onrevealrequest } });
    await userEvent.click(tileButton(2, 2));
    expect(ontarget).toHaveBeenCalledWith(2, 2);
    expect(onrevealrequest).not.toHaveBeenCalled();
  });

  it('does nothing on click when disabled', async () => {
    const onrevealrequest = vi.fn();
    render(Board, { props: { rules: RULES, disabled: true, onrevealrequest } });
    await userEvent.click(tileButton(2, 2));
    expect(onrevealrequest).not.toHaveBeenCalled();
  });
});
