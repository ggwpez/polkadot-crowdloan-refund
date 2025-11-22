import React, { createContext, useContext, useEffect, useState } from 'react'

// Feature flag to enable/disable relay block override in production
// Set to false before production deployment to hide this feature
export const ENABLE_RELAY_BLOCK_OVERRIDE = true

interface RPCSettings {
  polkadotRelayRPC: string
  assetHubRPC: string
  relayBlockOverride: number | null
}

interface RPCSettingsContextType {
  settings: RPCSettings
  updateSettings: (newSettings: Partial<RPCSettings>) => void
  resetSettings: () => void
  hasCustomSettings: boolean
}

const RPCSettingsContext = createContext<RPCSettingsContextType | undefined>(undefined)

const STORAGE_KEY = 'rpc_settings'

// Default RPC endpoints
const DEFAULT_SETTINGS: RPCSettings = {
  polkadotRelayRPC: 'wss://rpc.ibp.network/polkadot',
  assetHubRPC: 'wss://sys.ibp.network/asset-hub-polkadot',
  relayBlockOverride: null,
}

export function RPCSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<RPCSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return { ...DEFAULT_SETTINGS, ...parsed }
      }
    } catch (error) {
      console.error('Failed to load RPC settings:', error)
    }
    return DEFAULT_SETTINGS
  })

  const [hasCustomSettings, setHasCustomSettings] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return !!stored
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch (error) {
      console.error('Failed to save RPC settings:', error)
    }
  }, [settings])

  const updateSettings = (newSettings: Partial<RPCSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }))
    setHasCustomSettings(true)
  }

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS)
    setHasCustomSettings(false)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error('Failed to remove RPC settings:', error)
    }
  }

  const value = {
    settings,
    updateSettings,
    resetSettings,
    hasCustomSettings,
  }

  return (
    <RPCSettingsContext.Provider value={value}>
      {children}
    </RPCSettingsContext.Provider>
  )
}

export function useRPCSettings() {
  const context = useContext(RPCSettingsContext)
  if (!context) {
    throw new Error('useRPCSettings must be used within RPCSettingsProvider')
  }
  return context
}
