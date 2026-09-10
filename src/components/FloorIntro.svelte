<script lang="ts">
  import { goto } from '../stores/uiStore';
  import { runState } from '../stores/runStore';
  import { getFloorIntro } from '../content/narrative';

  let { floorId, oncontinue }: { floorId?: number; oncontinue?: () => void } = $props();
  const id = $derived(floorId ?? $runState?.floor ?? 1);
  const intro = $derived(getFloorIntro(id));
</script>

<section class="intro">
  <h2>{intro.title}</h2>
  <p class="mood">{intro.mood}</p>
  <p class="note">{intro.mechanicalNote}</p>
  <button type="button" onclick={() => (oncontinue ? oncontinue() : goto('game'))}>Enter</button>
</section>

<style>
  .intro { max-width: 520px; margin: 12vh auto; text-align: center; }
  .mood { font-size: 1.05rem; line-height: 1.6; }
  .note { color: var(--accent); }
  button { margin-top: 1.5rem; padding: .6rem 1.2rem; }
</style>
