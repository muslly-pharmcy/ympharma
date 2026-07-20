import { createServerFn } from '@tanstack/react-start'

// Fix for SSR environments where fetch might not be globally available
if (typeof globalThis.fetch === 'undefined') {
  console.log('Global fetch not found, checking environment...')
}

export const getServerTime = createServerFn({ method: 'GET' }).handler(
  async () => new Date().toISOString(),
)

export default function server() {
  console.log('MUSLLY AI OS Server Initialized')
}
