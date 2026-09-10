<script lang="ts">
  import type { Item } from '../lib/types';
  import { itemEffectText } from '../lib/itemText';
  import { runState } from '../stores/runStore';

  let { incoming, onresolve }: { incoming: Item; onresolve: (dropId: string) => void } = $props();
  const inv = $derived($runState?.inventory ?? []);
</script>

<div class="scrim" role="dialog" aria-modal="true" aria-label="Inventory full">
  <div class="modal">
    <p>Inventory is full. Drop something to take <strong>{incoming.name}</strong>, or discard the find.</p>
    <ul>
      {#each inv as it (it.id)}
        <li>
          <button type="button" onclick={() => onresolve(it.id)}>
            Drop {it.name} <span class="fx">{itemEffectText(it)}</span>
          </button>
        </li>
      {/each}
      <li>
        <button type="button" class="discard" onclick={() => onresolve(incoming.id)}>
          Discard {incoming.name}
        </button>
      </li>
    </ul>
  </div>
</div>

<style>
  .scrim { position: fixed; inset: 0; background: rgba(0,0,0,.6); display: grid; place-items: center; z-index: 60; }
  .modal { background: var(--panel); padding: 1.25rem; border-radius: 8px; width: min(460px, 92vw); }
  ul { list-style: none; padding: 0; display: grid; gap: .35rem; }
  button { width: 100%; text-align: left; padding: .5rem .75rem; }
  .fx { color: var(--muted); font-size: .85em; display: block; }
  .discard { color: var(--danger); }
</style>
