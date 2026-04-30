import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
        tailwindcss(),

    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png','bell.webm', 'pwa-64x64.png', 'pwa-192x192.png', 'pwa-512x512.png', 'maskable-icon-512x512.png'],
      manifest: {
        name: 'Timer App',
        short_name: 'TimerApp',
        description: 'Simple timer application built with Svelte and Rust',
        theme_color: '#1e293b',
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
  build: {
    // 'esnext' → kein Transpiling, Oxc macht nur Minification
    // Voraussetzung: VPS serviert an moderne Browser (kein IE-Support nötig)
    target: 'esnext',

    // Svelte runtime + vendor in eigenen Chunk → besseres Browser-Caching
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('svelte')) {
            return 'svelte';
          }
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    },

    // Kein gzip-Report → schnellerer Build
    reportCompressedSize: false,

    assetsDir: 'assets',
    outDir: 'dist',
  },
})
