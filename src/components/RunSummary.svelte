<script lang="ts">
  import type { Item, RunState } from '../lib/types';
  import { ENDINGS } from '../content/narrative';
  import { itemEffectText } from '../lib/itemText';

  let { run, outcome, onmenu }: {
    run: RunState; outcome: 'win' | 'died-out' | 'abandoned'; onmenu: () => void;
  } = $props();

  const ending = $derived(
    outcome === 'win' ? ENDINGS.win : outcome === 'died-out' ? ENDINGS.diedOut : ENDINGS.abandoned,
  );
  const minutes = $derived(Math.max(0, Math.round((Date.now() - run.startedAtMs) / 60000)));
  const equipped = $derived(
    [run.equipped.weapon, run.equipped.armor, run.equipped.trinkets[0], run.equipped.trinkets[1]]
      .filter((x): x is Item => x != null),
  );
</script>

<section class="summary">
  <h2>{outcome === 'win' ? 'Run complete' : 'Run over'}</h2>
  <p class="ending">{ending}</p>
  <dl>
    <div><dt>Depth reached</dt><dd>{run.deepestDepth} (floor {run.floor})</dd></div>
    <div><dt>Time</dt><dd>~{minutes} min</dd></div>
    <div><dt>Monsters defused</dt><dd>{run.monstersDefused}</dd></div>
  </dl>
  <h3>Final loadout</h3>
  <ul>
    {#each equipped as it (it.id)}<li>{it.name} — <span class="fx">{itemEffectText(it)}</span></li>{/each}
  </ul>
  <button type="button" onclick={onmenu}>Back to menu</button>
</section>

<style>
  .summary { max-width: 560px; margin: 6vh auto; }
  .ending { color: var(--muted); font-style: italic; }
  dl div { display: flex; justify-content: space-between; border-bottom: 1px solid #2a2a36; padding: .35rem 0; }
  dt { color: var(--muted); }
  ul { list-style: none; padding: 0; }
  .fx { color: var(--muted); font-size: .9em; }
  button { margin-top: 1.5rem; padding: .6rem 1.2rem; }
</style>
