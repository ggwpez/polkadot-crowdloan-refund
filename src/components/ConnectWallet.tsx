import React, { useState } from 'react'
import { useTypink } from 'typink'
import { Wallet, ChevronRight, Check, Download, User, Settings } from 'lucide-react'
import { Button } from './ui/Button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/Dialog'
import Identicon from '@polkadot/react-identicon'
import RPCSettings from './RPCSettings'

type View = 'wallets' | 'accounts'

export default function ConnectWallet() {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<View>('wallets')
  const [settingsOpen, setSettingsOpen] = useState(false)
  
  const {
    wallets,
    connectedWallets,
    accounts,
    connectedAccount,
    connectWallet,
    disconnect,
    setConnectedAccount,
  } = useTypink()

  const handleConnectWallet = async (walletId: string) => {
    try {
      await connectWallet(walletId)
      setView('accounts')
    } catch (error) {
      console.error('Failed to connect wallet:', error)
    }
  }

  const handleSelectAccount = (account: any) => {
    setConnectedAccount(account)
    setOpen(false)
    setView('wallets')
  }

  const handleDisconnect = () => {
    disconnect()
    setOpen(false)
    setView('wallets')
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      // Reset to wallets view when closing
      setTimeout(() => setView('wallets'), 200)
    }
  }

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-6)}`
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant={connectedAccount ? 'gradient' : 'default'}
          size="lg"
          onClick={() => setOpen(true)}
          className="gap-2"
        >
          {connectedAccount ? (
            <>
              <div className="flex items-center gap-2">
                <Identicon
                  value={connectedAccount.address}
                  size={24}
                  theme="polkadot"
                />
                <span>{connectedAccount.name || truncateAddress(connectedAccount.address)}</span>
              </div>
            </>
          ) : (
            <>
              <Wallet className="w-5 h-5" />
              Connect Wallet
            </>
          )}
        </Button>

        <Button
          variant="outline"
          size="lg"
          onClick={() => setSettingsOpen(true)}
          className="gap-2"
          title="RPC Settings"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>

      <DialogContent className="sm:max-w-[500px]">
        {view === 'wallets' ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-gradient">
                {connectedWallets.length > 0 ? 'Connected Wallets' : 'Connect Wallet'}
              </DialogTitle>
              <DialogDescription>
                {connectedWallets.length > 0
                  ? 'Select a wallet to view accounts or connect a new one'
                  : 'Choose a wallet to connect to your Polkadot account'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 mt-4">
              {/* Sort: installed first, then not installed */}
              {[...wallets]
                .sort((a, b) => {
                  if (a.installed && !b.installed) return -1
                  if (!a.installed && b.installed) return 1
                  return 0
                })
                .map((wallet) => {
                  const isConnected = connectedWallets.some((w) => w.id === wallet.id)
                  const accountCount = accounts.filter((a) => a.source === wallet.id).length

                  return (
                    <div
                      key={wallet.id}
                      className="group relative flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-pink-500/50 transition-all duration-300"
                    >
                      <div className="flex items-center gap-3">
                        {wallet.logo ? (
                          <img
                            src={wallet.logo}
                            alt={wallet.name}
                            className="w-10 h-10 rounded-lg"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center">
                            <Wallet className="w-6 h-6 text-white" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{wallet.name}</span>
                            {isConnected && (
                              <div className="flex items-center gap-1 text-xs text-green-400">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                Connected
                              </div>
                            )}
                          </div>
                          {isConnected && accountCount > 0 && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {accountCount} account{accountCount !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {wallet.installed ? (
                          isConnected ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setView('accounts')}
                                className="gap-1"
                              >
                                View Accounts
                                <ChevronRight className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => disconnect(wallet.id)}
                              >
                                Disconnect
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="gradient"
                              size="sm"
                              onClick={() => handleConnectWallet(wallet.id)}
                              className="gap-1"
                            >
                              Connect
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          )
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Typink wallets have different install URLs based on wallet type
                              const installUrls: Record<string, string> = {
                                'polkadot-js': 'https://polkadot.js.org/extension/',
                                'talisman': 'https://talisman.xyz/',
                                'subwallet-js': 'https://subwallet.app/',
                                'nova': 'https://novawallet.io/',
                              }
                              const url = installUrls[wallet.id]
                              if (url) window.open(url, '_blank')
                            }}
                            className="gap-1"
                          >
                            <Download className="w-4 h-4" />
                            Install
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

            {connectedAccount && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDisconnect}
                  className="w-full"
                >
                  Disconnect All
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            <DialogHeader>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView('wallets')}
                className="w-fit mb-2"
              >
                ← Back to Wallets
              </Button>
              <DialogTitle className="text-gradient">Select Account</DialogTitle>
              <DialogDescription>
                Choose an account to use with this application
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 mt-4">
              {accounts.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No accounts found</p>
                  <p className="text-sm mt-1">
                    Make sure you have created accounts in your wallet extension
                  </p>
                </div>
              ) : (
                accounts.map((account) => {
                  const isSelected = connectedAccount?.address === account.address

                  return (
                    <button
                      key={account.address}
                      onClick={() => handleSelectAccount(account)}
                      className={`
                        w-full group relative flex items-center justify-between p-4 rounded-xl border
                        transition-all duration-300 text-left
                        ${
                          isSelected
                            ? 'border-pink-500 bg-pink-500/10'
                            : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-violet-500/50'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Identicon
                          value={account.address}
                          size={40}
                          theme="polkadot"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white flex items-center gap-2">
                            {account.name || 'Unnamed Account'}
                            {isSelected && (
                              <Check className="w-4 h-4 text-pink-500" />
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5 font-mono">
                            {truncateAddress(account.address)}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {account.source}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>

      <RPCSettings open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  )
}
