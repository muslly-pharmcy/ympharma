import { createServerFn } from '@tanstack/react-start'

// Fix for SSR environments where fetch might not be globally available
if (typeof globalThis.fetch === 'undefined') {
  // In modern Node.js environments, fetch is available globally.
  // This is a safety check for older or restricted environments.
  console.log('Global fetch not found, checking environment...')
}

export const getServerTime = createServerFn('GET', async () => {
  return new Date().toISOString()
})

export default function server() {
  // SSR Initialization logic
  console.log('MUSLLY AI OS Server Initialized')
}
