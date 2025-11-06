import React from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TypinkProvider } from 'typink'
import App from './App'
import './index.css'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <TypinkProvider appName="Polkadot Crowdloan Unlocker">
        <App />
      </TypinkProvider>
    </QueryClientProvider>
  </React.StrictMode>
)
