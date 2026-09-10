<script lang="ts">
  import { combatSession, act, endCombat, scryCost, type CombatSession } from '../stores/combatStore';
  import { getMonsterDef } from '../content/monsters';

  let { ondone }: { ondone: (session: CombatSession) => void } = $props();

  const session = $derived($combatSession);
  const monster = $derived(session?.state.monster ?? null);
  const def = $derived(monster ? getMonsterDef(monster.type) : null);

  const abilityDisabled = $derived.by(() => {
    if (!session) return true;
    if (session.state.resolution !== 'ongoing') return true;
    if (session.ctx.classId === 'sapper') return true;
    return session.ctx.focus - session.focusSpent < scryCost(session.ctx);
  });

  function outcomeText(): string {
    if (!session) return '';
    if (session.state.resolution === 'win') return 'Monster defused.';
    if (session.state.resolution === 'timeout') {
      return session.state.hpLoss === 0
        ? 'It slips loose — but you take no hit.'
        : `It slips loose. You take ${session.state.hpLoss} damage.`;
    }
    return '';
  }

  function done() {
    ondone(endCombat()!);
  }
</script>

{#if session && monster && def}
  <div class="scrim" role="dialog" aria-modal="true" aria-label="Combat">
    <div class="modal">
      <header>
        <strong>{def.name}</strong>
        <span class="type">{monster.type}{monster.isBoss ? ' · BOSS' : ''}</span>
        <span class="threat">threat {monster.threat}</span>
      </header>

      <div class="pips" aria-label={`${monster.pips} of ${monster.maxPips} pips left`}>
        {#each Array(monster.maxPips) as _, i (i)}
          <span class="pip" class:spent={i >= monster.pips}></span>
        {/each}
      </div>

      <p class="round">round {session.state.round} / {session.state.roundLimit}</p>

      {#if session.state.resolution === 'ongoing'}
        <div class="actions">
          <button type="button" onclick={() => act('strike')}>Strike</button>
          <button type="button" onclick={() => act('block')}>Block</button>
          <button type="button" onclick={() => act('ability')} disabled={abilityDisabled}>
            Scry ({scryCost(session.ctx)})
          </button>
        </div>
      {:else}
        <p class="outcome">{outcomeText()}</p>
        <button type="button" onclick={done}>Continue</button>
      {/if}

      <footer class="readout">
        power {session.ctx.power} · guard {session.ctx.guard} ·
        focus {session.ctx.focus - session.focusSpent}
      </footer>
    </div>
  </div>
{/if}

<style>
  .scrim { position: fixed; inset: 0; background: rgba(0,0,0,.6); display: grid; place-items: center; z-index: 50; }
  .modal { background: var(--panel); padding: 1.25rem; border-radius: 8px; width: min(420px, 92vw); }
  header { display: flex; gap: .5rem; align-items: baseline; }
  .type { color: var(--muted); text-transform: capitalize; }
  .threat { margin-left: auto; color: var(--muted); }
  .pips { display: flex; gap: 6px; margin: .75rem 0; }
  .pip { width: 22px; height: 22px; border-radius: 50%; background: var(--danger); }
  .pip.spent { background: #333; }
  .round { color: var(--muted); }
  .actions { display: flex; gap: .5rem; }
  .actions button, .outcome + button { padding: .5rem .9rem; }
  .readout { margin-top: .75rem; color: var(--muted); font-size: .85em; }
</style>
