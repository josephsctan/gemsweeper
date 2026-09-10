import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { ui, goto, openModal, closeModal, chooseClass } from './uiStore';

describe('uiStore', () => {
  beforeEach(() => ui.set({ screen: 'menu', modal: null, selectedClass: null }));

  it('goto changes the screen and clears any modal', () => {
    openModal('inventory');
    goto('game');
    expect(get(ui).screen).toBe('game');
    expect(get(ui).modal).toBeNull();
  });

  it('openModal / closeModal toggle the modal', () => {
    openModal('drop-choice');
    expect(get(ui).modal).toBe('drop-choice');
    closeModal();
    expect(get(ui).modal).toBeNull();
  });

  it('chooseClass records the class and advances to prologue', () => {
    chooseClass('diviner');
    expect(get(ui).selectedClass).toBe('diviner');
    expect(get(ui).screen).toBe('prologue');
  });
});
