import React, { useState } from 'react'
import { Settings, RotateCcw, Save, X } from 'lucide-react'
import { Button } from './ui/Button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/Dialog'
import { Input, Label } from './ui/Input'
import { useRPCSettings, ENABLE_RELAY_BLOCK_OVERRIDE } from '@/providers/RPCSettingsProvider'

interface RPCSettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function RPCSettings({ open, onOpenChange }: RPCSettingsProps) {
  const { settings, updateSettings, resetSettings, hasCustomSettings } = useRPCSettings()

  const [polkadotRelayRPC, setPolkadotRelayRPC] = useState(settings.polkadotRelayRPC)
  const [assetHubRPC, setAssetHubRPC] = useState(settings.assetHubRPC)
  const [relayBlockOverride, setRelayBlockOverride] = useState(
    settings.relayBlockOverride?.toString() || ''
  )
  const [hasChanges, setHasChanges] = useState(false)

  React.useEffect(() => {
    if (open) {
      setPolkadotRelayRPC(settings.polkadotRelayRPC)
      setAssetHubRPC(settings.assetHubRPC)
      setRelayBlockOverride(settings.relayBlockOverride?.toString() || '')
      setHasChanges(false)
    }
  }, [open, settings])

  const handleInputChange = (setter: (value: string) => void) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setter(e.target.value)
    setHasChanges(true)
  }

  const handleSave = () => {
    const blockOverrideNum = relayBlockOverride.trim()
      ? parseInt(relayBlockOverride.trim(), 10)
      : null

    updateSettings({
      polkadotRelayRPC,
      assetHubRPC,
      relayBlockOverride: blockOverrideNum,
    })
    setHasChanges(false)
    onOpenChange(false)
    // Show a message that the page needs to be refreshed
    if (window.confirm('Settings saved! The page needs to be refreshed to apply the new settings. Refresh now?')) {
      window.location.reload()
    }
  }

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset to default settings?')) {
      resetSettings()
      setPolkadotRelayRPC('wss://rpc.polkadot.io')
      setAssetHubRPC('wss://polkadot-asset-hub-rpc.polkadot.io')
      setRelayBlockOverride('')
      setHasChanges(false)
      // Refresh page to apply defaults
      setTimeout(() => window.location.reload(), 500)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-gradient flex items-center gap-2">
            <Settings className="w-5 h-5" />
            RPC Settings
          </DialogTitle>
          <DialogDescription>
            Configure custom RPC endpoints for Polkadot Relay Chain and Asset Hub.
            Leave default values for automatic endpoint selection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label>Polkadot Relay Chain RPC</Label>
            <Input
              type="text"
              value={polkadotRelayRPC}
              onChange={handleInputChange(setPolkadotRelayRPC)}
              placeholder="wss://rpc.polkadot.io"
              className="w-full font-mono text-sm text-white"
            />
            <p className="text-xs text-gray-400">
              WebSocket endpoint for Polkadot Relay Chain
            </p>
          </div>

          <div className="space-y-2">
            <Label>Asset Hub RPC</Label>
            <Input
              type="text"
              value={assetHubRPC}
              onChange={handleInputChange(setAssetHubRPC)}
              placeholder="wss://polkadot-asset-hub-rpc.polkadot.io"
              className="w-full font-mono text-sm text-white"
            />
            <p className="text-xs text-gray-400">
              WebSocket endpoint for Polkadot Asset Hub
            </p>
          </div>

          {ENABLE_RELAY_BLOCK_OVERRIDE && (
            <div className="space-y-2">
              <Label>
                Relay Chain Block Override{' '}
                <span className="text-xs text-yellow-500">(Dev/Testing Only)</span>
              </Label>
              <Input
                type="number"
                value={relayBlockOverride}
                onChange={handleInputChange(setRelayBlockOverride)}
                placeholder="Leave empty to use live block number"
                className="w-full font-mono text-sm text-white"
              />
              <p className="text-xs text-gray-400">
                Override the current relay chain block number for testing purposes.
                Leave empty to fetch live block number from the chain.
              </p>
            </div>
          )}

          {hasCustomSettings && (
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm text-blue-300">
                Custom RPC endpoints are currently active
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-4 border-t border-white/10">
            <Button
              variant="gradient"
              onClick={handleSave}
              disabled={!hasChanges}
              className="flex-1 gap-2"
            >
              <Save className="w-4 h-4" />
              Save Settings
            </Button>

            {hasCustomSettings && (
              <Button
                variant="outline"
                onClick={handleReset}
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset to Default
              </Button>
            )}

            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
