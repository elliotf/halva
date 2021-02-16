<style>
</style>

<script>
  export let title;

  let disabled = false;

  async function handleClick() {
    disabled = true;

    await self.fetch(`/lights/${title}`, {
      method: 'POST',
    });

    disabled = false;
  }
</script>

<button on:click={ handleClick }>Lights { title }</button>
