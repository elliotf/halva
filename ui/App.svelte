<script>
  import { onMount } from 'svelte';
  import Door from './door.svelte';
  import Light from './light_switch.svelte';

  export let doors;
  export let display_video = true;

  let video_timestamp;
  let image_timestamp;

  const refreshImage = () => {
    image_timestamp = Date.now();
  };

  const refocus = () => {
    image_timestamp = video_timestamp = Date.now();
  };
  refocus();

  const refetch = () => {
    // get new state
  };

  let is_hidden = false;
  let hidden, visibilityChange;
  const handleVisibilityChange = (e) => {
    var new_status = (document[hidden]) ? true : false;

    if (is_hidden === true && new_status === false) {
      refetch();
    }

    is_hidden = new_status;
  }

  const forceImage = () => {
    display_video = false;
  };

  onMount(async () => {
    // handle backgrounding of page
    if (typeof document.hidden !== "undefined") { // Opera 12.10 and Firefox 18 and later support
      hidden = "hidden";
      visibilityChange = "visibilitychange";
    } else if (typeof document.msHidden !== "undefined") {
      hidden = "msHidden";
      visibilityChange = "msvisibilitychange";
    } else if (typeof document.webkitHidden !== "undefined") {
      hidden = "webkitHidden";
      visibilityChange = "webkitvisibilitychange";
    }

    window.addEventListener("focus", function() {
      refocus();
    });

    if (typeof document.addEventListener === "undefined") {
      console.log("This demo requires a browser, such as Google Chrome or Firefox, that supports the Page Visibility API.");
    } else {
      // Handle page visibility change
      document.addEventListener(visibilityChange, handleVisibilityChange, false);
    }

    // handle eventstream wiring
    const source = new EventSource('/updates');

    source.addEventListener('message', event => {
      var data;
      try {
        data = JSON.parse(event.data);

        image_timestamp = Date.now(); // trigger an image update if the door has closed.

        doors = data.doors;
      } catch(err) {
        console.log('err, err.stack', err, err.stack);
      }
    });

    source.addEventListener('error', event => {
      console.log('SSE error:', event);
    });
  });
</script>

<main>
  {#each doors as door, index (door.name)}
    <Door {...door}/>
  {/each}

  <Light title='on' />
  <Light title='off' />

  {#if display_video}
    <img alt="live video feed" src="/video.mjpeg?ts={ video_timestamp }">
    <p class="force-image" on:click={ forceImage }>Force to still image</p>
  {:else}
    <img on:click={ refreshImage } alt="live video feed" src="/recent_image.jpg?ts={ image_timestamp }">
  {/if}
</main>

<style>
</style>
