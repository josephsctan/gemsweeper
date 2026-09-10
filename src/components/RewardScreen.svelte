<script lang="ts">
  import type { ItemDef } from '../lib/types';
  import { itemEffectText } from '../lib/itemText';

  let { offers, onpick, onskip }: {
    offers: ItemDef[]; onpick: (defId: string) => void; onskip: () => void;
  } = $props();
</script>

<section class="reward">
  <h2>Salvage</h2>
  <div class="cards">
    {#each offers as o (o.defId)}
      <article class="card" data-rarity={o.rarity}>
        <h3>{o.name}</h3>
        <p class="rarity">{o.rarity} {o.slot}</p>
        <p class="fx">{itemEffectText({ ...o, id: o.defId })}</p>
        <p class="flavor">{o.flavor}</p>
        <button type="button" onclick={() => onpick(o.defId)}>Take {o.name}</button>
      </article>
    {/each}
  </div>
  <button type="button" class="skip" onclick={onskip}>Skip for a heal</button>
</section>

<style>
  .reward { max-width: 760px; margin: 6vh auto; text-align: center; }
  .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin: 1.5rem 0; }
  .card { background: var(--panel); padding: 1rem; border-radius: 8px; }
  .card[data-rarity='rare'] { outline: 1px solid #3f7fbf; }
  .card[data-rarity='cursed'] { outline: 1px solid var(--danger); }
  .rarity { color: var(--muted); text-transform: capitalize; }
  .fx { color: var(--accent); }
  .flavor { color: var(--muted); font-style: italic; font-size: .9em; }
  .skip { padding: .5rem 1rem; }
  @media (max-width: 680px) { .cards { grid-template-columns: 1fr; } }
</style>
