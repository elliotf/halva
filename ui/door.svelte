<style>
</style>

<script>
  export let name;
  export let is_closed;

  let disabled = false;
  let state = '?';

  $: if (is_closed) {
    state = 'closed';
  } else {
    state = 'open';
  }

  async function handleClick() {
    disabled = true;

    await self.fetch(`/toggle`, {
      method: 'POST',
      body: JSON.stringify({ toggle: name }),
      headers: {
        'Content-type': 'application/json',
      },
    });

    disabled = false;
  }
</script>

<button class:open="{state ==='open'}" on:click={ handleClick } { disabled }>{ name } ({ state })</button>
