<script lang="ts">
  import { CLASS_IDS, getClass } from '../content/classes';
  import { chooseClass } from '../stores/uiStore';
</script>

<section class="pick">
  <h2>Choose your delver</h2>
  <div class="cards">
    {#each CLASS_IDS as id (id)}
      {@const c = getClass(id)}
      <article class="card">
        <h3>{c.name}</h3>
        <p class="fantasy">{c.fantasy}</p>
        <p class="stats">HP {c.start.hp} · Power {c.start.power} · Guard {c.start.guard} · Focus {c.start.focus}/{c.start.focusCap}</p>
        <p class="ability"><strong>{c.ability.name}</strong> — {c.playstyle}</p>
        <button type="button" onclick={() => chooseClass(id)}>Choose {c.name}</button>
      </article>
    {/each}
  </div>
</section>

<style>
  .pick { max-width: 720px; margin: 8vh auto; text-align: center; }
  .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1.5rem; }
  .card { background: var(--panel); padding: 1rem; border-radius: 8px; }
  .fantasy { color: var(--muted); }
  .ability { margin-top: .5rem; }
  button { margin-top: 1rem; padding: .6rem 1rem; }
  @media (max-width: 640px) { .cards { grid-template-columns: 1fr; } }
</style>
