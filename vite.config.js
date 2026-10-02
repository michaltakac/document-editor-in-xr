import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import graspableSource from './graspable-source.js'

// Dev server only: tag R3F elements with their source location for the Graspable preview.
export default defineConfig(({ command }) => ({
  plugins: [react(command === 'serve' ? { babel: { plugins: [graspableSource] } } : {})],
  // One copy of React for everything, including the dev-only headset panel, whatever the package manager installed.
  resolve: { dedupe: ['react', 'react-dom'] },
  // Physics must not be pre-bundled: when the dev server meets a new package while it runs, it
  // re-bundles, and the physics engine then exists twice (one copy never started) until a restart.
  optimizeDeps: { exclude: ['@react-three/rapier'] },
}))
