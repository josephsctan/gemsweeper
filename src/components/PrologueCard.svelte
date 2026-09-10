<script lang="ts">
  import { goto } from '../stores/uiStore';
  import { PROLOGUE } from '../content/narrative';
</script>

<section class="card">
  <p>{PROLOGUE}</p>
  <button type="button" onclick={() => goto('floor-intro')}>Descend</button>
</section>

<style>
  .card { max-width: 520px; margin: 14vh auto; text-align: center; }
  p { font-size: 1.1rem; line-height: 1.6; }
  button { margin-top: 2rem; padding: .7rem 1.4rem; }
</style>
