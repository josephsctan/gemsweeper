<script lang="ts">
  import { runState } from '../stores/runStore';
  import { deriveStats } from '../lib/stats';
  import { getFloor } from '../content/floors';

  let { abilityLabel, abilityEnabled, onuseAbility, onopenInventory }: {
    abilityLabel: string; abilityEnabled: boolean;
    onuseAbility: () => void; onopenInventory: () => void;
  } = $props();

  const run = $derived($runState);
  const d = $derived(run ? deriveStats(run) : null);
  const floorName = $derived(run ? getFloor(run.floor).name : '');
</script>

{#if run && d}
  <div class="hud">
    <div class="stat">HP <b>{run.hp}</b>/{d.maxHp}</div>
    <div class="stat">Focus <b>{run.focus}</b>/{d.focusCap}</div>
    <div class="stat">Power <b>{d.power}</b></div>
    <div class="stat">Guard <b>{d.guard}</b></div>
    <div class="loc">{floorName} — room {run.roomIndex + 1}/{run.roomsThisFloor}</div>
    <div class="retries" aria-label={`${run.retriesLeft} retries left`}>
      {#each Array(3) as _, i (i)}<span class="dot" class:used={i >= run.retriesLeft}></span>{/each}
    </div>
    <button type="button" onclick={onuseAbility} disabled={!abilityEnabled}>{abilityLabel}</button>
    <button type="button" onclick={onopenInventory}>Loadout</button>
  </div>
{/if}

<style>
  .hud { display: flex; gap: .75rem; align-items: center; flex-wrap: wrap; padding: .5rem 1rem; background: var(--panel); }
  .stat b { color: var(--accent); }
  .loc { color: var(--muted); }
  .retries { display: flex; gap: 4px; }
  .dot { width: 10px; height: 10px; border-radius: 50%; background: var(--safe); }
  .dot.used { background: #444; }
  .hud button { margin-left: auto; padding: .35rem .7rem; }
  .hud button + button { margin-left: .4rem; }
</style>
