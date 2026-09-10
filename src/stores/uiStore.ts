import { writable, type Writable } from 'svelte/store';
import type { ClassId } from '../lib/types';

export type Screen =
  | 'menu' | 'class-select' | 'prologue' | 'floor-intro' | 'game'
  | 'reward' | 'death' | 'win' | 'summary' | 'stats' | 'codex' | 'how-to-play';

export type ModalName = 'inventory' | 'drop-choice';

export interface UiState {
  screen: Screen;
  modal: ModalName | null;
  selectedClass: ClassId | null;
}

export const ui: Writable<UiState> = writable({ screen: 'menu', modal: null, selectedClass: null });

export function goto(screen: Screen): void {
  ui.update((s) => ({ ...s, screen, modal: null }));
}

export function openModal(m: ModalName): void {
  ui.update((s) => ({ ...s, modal: m }));
}

export function closeModal(): void {
  ui.update((s) => ({ ...s, modal: null }));
}

export function chooseClass(id: ClassId): void {
  ui.update((s) => ({ ...s, selectedClass: id, screen: 'prologue', modal: null }));
}
