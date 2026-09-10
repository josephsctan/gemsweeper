<script lang="ts">
  import { ENDINGS } from '../content/narrative';
  let { oncontinue }: { oncontinue: () => void } = $props();
</script>

<section class="win">
  <h2>Out</h2>
  <p>{ENDINGS.win}</p>
  <button type="button" onclick={oncontinue}>See the tally</button>
</section>

<style>
  .win { max-width: 480px; margin: 14vh auto; text-align: center; }
  p { font-size: 1.1rem; line-height: 1.6; }
  button { margin-top: 1.5rem; padding: .7rem 1.2rem; }
</style>
