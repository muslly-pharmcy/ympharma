import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { createRouter } from './router'
import { AuthProvider } from './context/AuthContext'
import { AIProvider } from './context/AIContext'
import { NotificationsProvider } from './context/NotificationsContext'
import { ThemeProvider } from './context/ThemeContext'
import { cosmicOS } from './shared/services/cosmic-os'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

const router = createRouter()

// Activate Permanent Cosmic OS & Self-Healing
console.log('Starting MUSLLY AI OS with Persistent Cosmic Mode...');
const osStatus = cosmicOS.getStatus();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AIProvider>
            <NotificationsProvider>
              <RouterProvider router={router} />
              <Toaster 
                position="top-left"
                toastOptions={{
                  duration: 4000,
                  style: {
                    fontFamily: 'Noto Sans Arabic, Tahoma, sans-serif',
                    direction: 'rtl',
                  },
                }}
              />
            </NotificationsProvider>
          </AIProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
