<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  let inputMinutes = 3;
  let inputSeconds = 0;

  let totalSeconds = 0;
  let currentSeconds = 0;
  let isRunning = false;
  let intervalId: number | null = null;
  let audioElement: HTMLAudioElement;

  // Berechnet gesamte Sekunden
  function calculateTotalSeconds() {
    return inputMinutes * 60 + inputSeconds;
  }

  // Formatierung
  function pad(num: number) {
    return num.toString().padStart(2, '0');
  }

  $: displayHours = Math.floor(currentSeconds / 3600);
  $: displayMinutes = Math.floor((currentSeconds % 3600) / 60);
  $: displaySecs = currentSeconds % 60;

  $: progress = totalSeconds === 0 ? 0 : (currentSeconds / totalSeconds) * 100;

  function toggleTimer() {
    if (isRunning) {
      stop();
    } else {
      // Notification-Berechtigung anfragen, falls noch nicht geschehen
      if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
      
      if (currentSeconds === 0) {
        totalSeconds = calculateTotalSeconds();
        currentSeconds = totalSeconds;
      }
      if (currentSeconds > 0) {
        start();
      }
    }
  }

  function start() {
    isRunning = true;
    intervalId = setInterval(() => {
      if (currentSeconds > 0) {
        currentSeconds--;
      } else {
        stop();
        if (audioElement) {
          audioElement.currentTime = 0;
          audioElement.play().catch(e => console.error("Audio playback error:", e));
        }
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification("Timer abgelaufen!", {
            body: "Deine Zeit ist um.",
            icon: "/favicon.svg"
          });
        }
      }
    }, 1000) as unknown as number;
  }

  function stop() {
    isRunning = false;
    if (intervalId) clearInterval(intervalId);
  }

  function reset() {
    stop();
    totalSeconds = calculateTotalSeconds();
    currentSeconds = totalSeconds;
  }

  onDestroy(() => {
    stop();
  });
</script>

<div class="flex flex-col items-center p-6 bg-white dark:bg-gray-800 max-w-md w-full font-sans">

  <div class="flex justify-center items-center mb-6 w-64 h-64">
    {#if !isRunning && currentSeconds === 0 && totalSeconds === 0}
      <!-- Eingabemodus -->
      <div class="flex items-baseline space-x-2 text-5xl font-light text-gray-800 dark:text-gray-100">

        <input type="number" min="0" max="59" bind:value={inputMinutes} class="w-16 text-center bg-transparent border-b-2 border-transparent focus:border-blue-500 outline-none" />
        <span class="text-xl">m</span>
        <input type="number" min="0" max="59" bind:value={inputSeconds} class="w-16 text-center bg-transparent border-b-2 border-transparent focus:border-blue-500 outline-none" />
        <span class="text-xl">s</span>
      </div>
    {:else}
      <!-- Anzeigemodus mit Kreis SVG -->
      <div class="relative flex justify-center items-center w-full h-full text-gray-800 dark:text-gray-100">
        <svg class="absolute w-full h-full transform -rotate-90">
          <circle cx="128" cy="128" r="120" stroke="currentColor" stroke-width="4" fill="transparent" class="text-gray-200 dark:text-gray-700" />
          <circle cx="128" cy="128" r="120" stroke="currentColor" stroke-width="6" fill="transparent"
            class="text-blue-500 transition-all duration-1000 ease-linear"
            stroke-dasharray="753.6"
            stroke-dashoffset={753.6 * (1 - progress / 100)} />
        </svg>
        <div class="text-6xl font-light z-10">
          {#if displayHours > 0}{displayHours}:{/if}{pad(displayMinutes)}:{pad(displaySecs)}
        </div>
      </div>
    {/if}
  </div>

  <!-- Controls -->
  <div class="flex space-x-4 w-full">
        <button on:click={toggleTimer} class="flex-1 py-3 {isRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'} text-white font-medium rounded-full transition">
      {isRunning ? 'Stopp' : 'Starten'}
    </button>
    <button on:click={() => { stop(); currentSeconds = 0; totalSeconds = 0; }} class="flex-1 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition">
      Reset
    </button>

  </div>

  <!-- Audioplayer für den Alarm -->
  <audio bind:this={audioElement} src="/bell.webm" preload="auto"></audio>
</div>

<style>
  input[type="number"]::-webkit-outer-spin-button,
  input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type="number"] {
    appearance: textfield;
    -moz-appearance: textfield;
  }
</style>