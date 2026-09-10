<script lang="ts">
  import { ui } from './stores/uiStore';
  import { hasRunSave } from './lib/storage';
  import { continueSavedRun } from './stores/gameFlow';
  import MainMenu from './components/MainMenu.svelte';
  import HowToPlay from './components/HowToPlay.svelte';
  import PrologueCard from './components/PrologueCard.svelte';
  import FloorIntro from './components/FloorIntro.svelte';
  import ClassSelect from './components/ClassSelect.svelte';
  import GameScreen from './components/GameScreen.svelte';
  import StatsScreen from './components/StatsScreen.svelte';
  import CodexScreen from './components/CodexScreen.svelte';

  const screen = $derived($ui.screen);
</script>

{#if screen === 'how-to-play'}
  <HowToPlay />
{:else if screen === 'class-select'}
  <ClassSelect />
{:else if screen === 'prologue'}
  <PrologueCard />
{:else if screen === 'floor-intro'}
  <FloorIntro />
{:else if screen === 'game'}
  <GameScreen />
{:else if screen === 'stats'}
  <StatsScreen />
{:else if screen === 'codex'}
  <CodexScreen />
{:else}
  <MainMenu hasSave={hasRunSave()} oncontinue={() => continueSavedRun()} />
{/if}
