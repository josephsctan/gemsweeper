<script lang="ts">
  import { meta } from '../stores/metaStore';
  import { goto } from '../stores/uiStore';
  import { MONSTER_TYPES } from '../content/monsters';
  import { getCodexEntry } from '../content/narrative';

  const unlocked = $derived(new Set($meta.codexUnlocks));
</script>

<section class="codex">
  <h2>Codex</h2>
  <ul>
    {#each MONSTER_TYPES as t (t)}
      {@const e = getCodexEntry(t)}
      <li>
        {#if unlocked.has(e.codexId)}
          <h3>{e.name}</h3>
          <p>{e.flavor}</p>
        {:else}
          <h3 class="locked">▢ Locked</h3>
          <p class="locked">Defeat one to learn its nature.</p>
        {/if}
      </li>
    {/each}
  </ul>
  <button type="button" onclick={() => goto('menu')}>Back</button>
</section>

<style>
  .codex { max-width: 560px; margin: 8vh auto; }
  li { background: var(--panel); padding: .75rem 1rem; border-radius: 6px; margin-bottom: .5rem; }
  .locked { color: var(--muted); }
  button { margin-top: 1rem; padding: .6rem 1.2rem; }
</style>
