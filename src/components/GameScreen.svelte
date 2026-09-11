<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { ui, closeModal, openModal } from '../stores/uiStore';
  import { runState } from '../stores/runStore';
  import { boardSession, applyReveal, applyChord } from '../stores/boardStore';
  import { deriveStats } from '../lib/stats';
  import { getFloor } from '../content/floors';
  import { getClass } from '../content/classes';
  import { armEmbers, isRoomClear } from '../lib/reveal';
  import { sfx } from '../lib/sfx';
  import {
    phase, rewardOffers, pendingPickup, targeting, lastOutcome,
    startNewRun, handleCaches, handleMines, resolveCombat, handleBoardClear,
    pickReward, skipReward, resolvePickup, continueToNextFloor, beginTargeting,
    handleTarget, retry, abandon, toMenu, toWonSummary, abilityView, noteReveals, tickTimers,
  } from '../stores/gameFlow';
  import Board from './Board.svelte';
  import Hud from './Hud.svelte';
  import CombatModal from './CombatModal.svelte';
  import InventoryPanel from './InventoryPanel.svelte';
  import DropChoiceModal from './DropChoiceModal.svelte';
  import RewardScreen from './RewardScreen.svelte';
  import DeathScreen from './DeathScreen.svelte';
  import WinScreen from './WinScreen.svelte';
  import RunSummary from './RunSummary.svelte';
  import FloorIntro from './FloorIntro.svelte';

  const run = $derived($runState);
  const rules = $derived(run ? deriveStats(run).rules : null);
  const ab = $derived(abilityView());

  let timer: ReturnType<typeof setInterval>;
  let shaking = $state(false);
  let shakeTimer: ReturnType<typeof setTimeout>;
  onMount(() => {
    if ($phase === 'loading') {
      const cls = $ui.selectedClass;
      if (cls) startNewRun(cls);
      else toMenu();
    }
    timer = setInterval(tickTimers, 500);
  });
  onDestroy(() => {
    clearInterval(timer);
    clearTimeout(shakeTimer);
  });

  function onReveal(kind: 'reveal' | 'chord', r: number, c: number) {
    if (!rules || !run) return;
    const res = kind === 'chord' ? applyChord(r, c, rules) : applyReveal(r, c, rules);
    armEmbers($boardSession!.board, res.revealed, Date.now(), getFloor(run.floor).emberRecoverMs, rules);
    if (res.revealed.length) noteReveals(res.revealed.length);
    if (res.caches.length) handleCaches(res.caches);
    if (res.mines.length) {
      sfx.play('mine');
      shaking = true;
      clearTimeout(shakeTimer);
      shakeTimer = setTimeout(() => { shaking = false; }, 200);
      handleMines(res.mines);
    } else if (isRoomClear($boardSession!.board)) {
      sfx.play('clear');
      handleBoardClear();
    } else if (res.revealed.length) {
      sfx.play('reveal');
    }
  }
</script>

{#if $phase === 'playing' || $phase === 'combat'}
  {#if run}
    <Hud
      abilityLabel={ab.label}
      abilityEnabled={ab.enabled}
      onuseAbility={() => beginTargeting(getClass(run.classId).ability.id === 'probe' ? 'probe' : 'scry')}
      onopenInventory={() => openModal('inventory')}
    />
  {/if}

  <div class="stage" class:targeting={$targeting !== null} class:shake={shaking}>
    <Board
      rules={rules ?? undefined}
      disabled={$phase === 'combat'}
      targetingMode={$targeting}
      ontarget={(r, c) => handleTarget(r, c)}
      onrevealrequest={(kind, r, c) => onReveal(kind, r, c)}
    />
  </div>

  {#if $phase === 'combat'}
    <CombatModal ondone={(s) => resolveCombat(s)} />
  {/if}
  {#if $ui.modal === 'inventory'}
    <InventoryPanel open onclose={() => closeModal()} />
  {/if}
{:else if $phase === 'reward'}
  <RewardScreen offers={$rewardOffers} onpick={(d) => pickReward(d)} onskip={() => skipReward()} />
{:else if $phase === 'floor-cleared' && run}
  <FloorIntro floorId={run.floor} oncontinue={() => continueToNextFloor()} />
{:else if $phase === 'dead' && run}
  <DeathScreen retriesLeft={run.retriesLeft} onretry={() => retry()} onabandon={() => abandon()} />
{:else if $phase === 'won'}
  <WinScreen oncontinue={() => toWonSummary()} />
{:else if $phase === 'summary' && run}
  <RunSummary run={run} outcome={$lastOutcome} onmenu={() => toMenu()} />
{/if}

{#if $ui.modal === 'drop-choice' && $pendingPickup}
  <DropChoiceModal incoming={$pendingPickup} onresolve={(id) => resolvePickup(id)} />
{/if}

<style>
  .stage { padding: 1.5rem; display: flex; justify-content: center; }
  .stage.targeting :global(.tile:not(:disabled)) { outline: 1px dashed var(--accent); cursor: crosshair; }
</style>
