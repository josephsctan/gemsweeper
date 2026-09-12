<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { runState } from '../stores/runStore';
  import { boardSession } from '../stores/boardStore';
  import { deriveStats } from '../lib/stats';
  import { getFloor } from '../content/floors';
  import { tileGlyph } from '../lib/icons';

  let { abilityLabel, abilityEnabled, onuseAbility, onopenInventory }: {
    abilityLabel: string; abilityEnabled: boolean;
    onuseAbility: () => void; onopenInventory: () => void;
  } = $props();

  const run = $derived($runState);
  const d = $derived(run ? deriveStats(run) : null);
  const floorName = $derived(run ? getFloor(run.floor).name : '');

  // The mine counter and timer are classic-Minesweeper reads off the current
  // room's board: total mines minus flags placed (can go negative, same as
  // the original), and elapsed time since the first reveal seeded the room
  // (mirrors the original starting its clock on first click, not on load).
  let nowMs = $state(Date.now());
  let tickHandle: ReturnType<typeof setInterval>;
  onMount(() => { tickHandle = setInterval(() => { nowMs = Date.now(); }, 250); });
  onDestroy(() => clearInterval(tickHandle));

  const minesRemaining = $derived.by(() => {
    const s = $boardSession;
    if (!s) return 0;
    const flagged = s.board.tiles.flat().filter((t) => t.flagged).length;
    return s.cfg.mineCount - flagged;
  });
  const elapsedSeconds = $derived.by(() => {
    const s = $boardSession;
    if (!s?.roomStartedAtMs) return 0;
    return Math.max(0, Math.floor((nowMs - s.roomStartedAtMs) / 1000));
  });
  const elapsedLabel = $derived(
    `${Math.floor(elapsedSeconds / 60)}:${String(elapsedSeconds % 60).padStart(2, '0')}`,
  );
</script>

{#if run && d}
  <div class="hud">
    <div class="stat">HP <b>{run.hp}</b>/{d.maxHp}</div>
    <div class="stat">Focus <b>{run.focus}</b>/{d.focusCap}</div>
    <div class="stat">Power <b>{d.power}</b></div>
    <div class="stat">Guard <b>{d.guard}</b></div>
    <div class="stat mine-counter" title="mines remaining">{tileGlyph('flag')} <b>{minesRemaining}</b></div>
    <div class="stat timer" title="time in this room">⏱ <b>{elapsedLabel}</b></div>
    <div class="loc">{floorName} — room {run.roomIndex + 1}/{run.roomsThisFloor}</div>
    <div class="retries" aria-label={`${run.retriesLeft} retries left`}>
      {#each Array(3) as _, i (i)}<span class="dot" class:used={i >= run.retriesLeft}></span>{/each}
    </div>
    <button type="button" onclick={onuseAbility} disabled={!abilityEnabled}>{abilityLabel}</button>
    <button type="button" onclick={onopenInventory}>Loadout</button>
  </div>
{/if}

<style>
  .hud { display: flex; gap: .5rem; align-items: center; flex-wrap: wrap; padding: .5rem 1rem; background: var(--panel); }
  .stat {
    background: rgba(255, 255, 255, .06);
    border-radius: 999px;
    padding: .3rem .7rem;
  }
  .stat b { color: var(--accent); }
  .mine-counter { color: var(--flag); }
  .mine-counter b { color: var(--flag); }
  .loc { color: var(--muted); }
  .retries { display: flex; gap: 4px; }
  .dot { width: 10px; height: 10px; border-radius: 50%; background: var(--safe); }
  .dot.used { background: #444; }
  .hud button { margin-left: auto; padding: .35rem .7rem; }
  .hud button + button { margin-left: .4rem; }
</style>
