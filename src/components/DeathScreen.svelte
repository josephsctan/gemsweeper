<script lang="ts">
  let { retriesLeft, onretry, onabandon }: {
    retriesLeft: number; onretry: () => void; onabandon: () => void;
  } = $props();
</script>

<section class="death">
  <h2>Down</h2>
  <p>The dark takes what it takes.</p>
  <div class="buttons">
    {#if retriesLeft > 0}
      <button type="button" onclick={onretry}>Retry from checkpoint ({retriesLeft} left)</button>
    {/if}
    <button type="button" onclick={onabandon}>Abandon run</button>
  </div>
</section>

<style>
  .death { max-width: 460px; margin: 16vh auto; text-align: center; }
  .buttons { display: grid; gap: .6rem; margin-top: 1.5rem; }
  .buttons button { padding: .7rem 1rem; }
</style>
