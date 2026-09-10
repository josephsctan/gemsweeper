<script lang="ts">
  import type { Slot } from '../lib/types';
  import { runState, patchRun } from '../stores/runStore';
  import { equipFromInventory, unequip, dropFromInventory } from '../lib/inventory';
  import { itemEffectText } from '../lib/itemText';
  import { deriveStats } from '../lib/stats';

  let { open, onclose }: { open: boolean; onclose: () => void } = $props();

  const run = $derived($runState);
  const stats = $derived(run ? deriveStats(run) : null);

  const slots = $derived.by(() => {
    if (!run) return [];
    return [
      { key: 'weapon' as Slot, idx: undefined as 0 | 1 | undefined, item: run.equipped.weapon },
      { key: 'armor' as Slot, idx: undefined as 0 | 1 | undefined, item: run.equipped.armor },
      { key: 'trinket' as Slot, idx: 0 as 0 | 1 | undefined, item: run.equipped.trinkets[0] },
      { key: 'trinket' as Slot, idx: 1 as 0 | 1 | undefined, item: run.equipped.trinkets[1] },
    ];
  });

  function doEquip(id: string) { patchRun((r) => { equipFromInventory(r, id); }); }
  function doUnequip(slot: Slot, idx?: 0 | 1) { patchRun((r) => { unequip(r, slot, idx); }); }
  function doDrop(id: string) { patchRun((r) => { dropFromInventory(r, id); }); }
</script>

{#if open && run && stats}
  <aside class="panel" aria-label="Inventory">
    <header>
      <h2>Loadout</h2>
      <button type="button" onclick={onclose}>Close</button>
    </header>

    <p class="stats">
      HP {run.hp}/{stats.maxHp} · Power {stats.power} · Guard {stats.guard} ·
      Focus {run.focus}/{stats.focusCap}
    </p>

    <ul class="equipped">
      {#each slots as s (s.key + String(s.idx))}
        <li>
          <span class="slot">{s.key}{s.idx !== undefined ? ` ${s.idx + 1}` : ''}</span>
          {#if s.item}
            <span class="name">{s.item.name}</span>
            <span class="fx">{itemEffectText(s.item)}</span>
            <button type="button" onclick={() => doUnequip(s.key, s.idx)}
              aria-label={`Unequip ${s.key}${s.idx !== undefined ? ' ' + (s.idx + 1) : ''}`}>Unequip</button>
          {:else}
            <span class="empty">— empty —</span>
          {/if}
        </li>
      {/each}
    </ul>

    <h3>Carried ({run.inventory.length}/8)</h3>
    <ul class="carried">
      {#each run.inventory as it (it.id)}
        <li>
          <span class="name">{it.name}</span>
          <span class="fx">{itemEffectText(it)}</span>
          <button type="button" onclick={() => doEquip(it.id)} aria-label={`Equip ${it.name}`}>Equip</button>
          <button type="button" onclick={() => doDrop(it.id)} aria-label={`Drop ${it.name}`}>Drop</button>
        </li>
      {/each}
      {#if run.inventory.length === 0}<li class="empty">nothing carried</li>{/if}
    </ul>
  </aside>
{/if}

<style>
  .panel {
    position: fixed; top: 0; right: 0; height: 100vh; width: min(360px, 92vw);
    background: var(--panel); padding: 1rem; overflow-y: auto; z-index: 40;
    box-shadow: -8px 0 24px rgba(0,0,0,.4);
  }
  header { display: flex; justify-content: space-between; align-items: center; }
  .stats { color: var(--muted); font-size: .85em; }
  ul { list-style: none; padding: 0; display: grid; gap: .5rem; }
  li { background: #00000030; padding: .5rem; border-radius: 6px; }
  .slot { text-transform: capitalize; color: var(--accent); font-size: .8em; display: block; }
  .fx { color: var(--muted); font-size: .8em; display: block; margin: .15rem 0 .35rem; }
  .empty { color: var(--muted); }
</style>
