<script lang="ts">
  import { goto } from '../stores/uiStore';
</script>

<section class="how">
  <h2>How to Play</h2>
  <ul>
    <li>Left-click reveals a tile. Numbers count adjacent monsters.</li>
    <li>Right-click flags. Click a satisfied number to chord its neighbours.</li>
    <li>Reveal a monster and you fight it: <strong>Strike</strong>, <strong>Block</strong>, or your class ability across up to three rounds. Losing the fight costs HP — it never ends the run outright.</li>
    <li>Clear every safe tile to finish a room. Pick one reward, or skip it for a small heal.</li>
    <li>Four floors, each with its own hazard. The last room of a floor is a boss. Two retries per run, then it's over.</li>
  </ul>
  <button type="button" onclick={() => goto('menu')}>Back</button>
</section>

<style>
  .how { max-width: 560px; margin: 8vh auto; }
  li { margin: .5rem 0; }
</style>
