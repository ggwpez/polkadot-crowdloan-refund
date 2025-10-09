import { motion } from "framer-motion";
import {
  Book,
  Check,
  Code,
  Copy,
  Database,
  Search,
  Send,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";

interface CodeExample {
  title: string;
  description: string;
  code: string;
  category: "query" | "transaction" | "subscription" | "hook";
}

const examples: CodeExample[] = [
  // Query Examples
  {
    title: "Query Chain Data",
    description: "Fetch current block number and chain information",
    category: "query",
    code: `import { usePolkadot } from './providers/PolkadotProvider'

function MyComponent() {
  const { api } = usePolkadot()
  const [blockNumber, setBlockNumber] = useState(0)

  useEffect(() => {
    if (!api) return

    const fetchBlock = async () => {
      const header = await api.rpc.chain.getHeader()
      setBlockNumber(header.number.toNumber())
    }

    fetchBlock()
  }, [api])

  return <div>Block: {blockNumber}</div>
}`,
  },
  {
    title: "Query Multiple Accounts",
    description: "Fetch balances for multiple accounts in parallel",
    category: "query",
    code: `import { usePolkadot } from './providers/PolkadotProvider'

function MultiAccountBalance({ addresses }: Props) {
  const { api } = usePolkadot()
  const [balances, setBalances] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!api) return

    const loadBalances = async () => {
      const queries = addresses.map((addr) =>
        api.query.system.account(addr)
      )

      const results = await Promise.all(queries)

      const balanceMap: Record<string, string> = {}
      addresses.forEach((addr, i) => {
        balanceMap[addr] = results[i].data.free.toString()
      })

      setBalances(balanceMap)
    }

    loadBalances()
  }, [api, addresses])

  return (
    <div>
      {Object.entries(balances).map(([addr, bal]) => (
        <div key={addr}>{addr}: {bal}</div>
      ))}
    </div>
  )
}`,
  },
  {
    title: "Query Chain Metadata",
    description: "Access runtime metadata and version information",
    category: "query",
    code: `import { usePolkadot } from './providers/PolkadotProvider'

function ChainMetadata() {
  const { api } = usePolkadot()
  const [metadata, setMetadata] = useState<any>(null)

  useEffect(() => {
    if (!api) return

    const loadMetadata = async () => {
      const [chain, version, properties] = await Promise.all([
        api.rpc.system.chain(),
        api.rpc.system.version(),
        api.rpc.system.properties()
      ])

      setMetadata({
        chain: chain.toString(),
        version: version.toString(),
        tokenSymbol: properties.tokenSymbol.unwrapOr(null)?.[0]?.toString(),
        tokenDecimals: properties.tokenDecimals.unwrapOr(null)?.[0]?.toNumber(),
        ss58Format: properties.ss58Format.unwrapOr(null)?.toNumber()
      })
    }

    loadMetadata()
  }, [api])

  if (!metadata) return <div>Loading...</div>

  return (
    <div>
      <div>Chain: {metadata.chain}</div>
      <div>Version: {metadata.version}</div>
      <div>Token: {metadata.tokenSymbol}</div>
      <div>Decimals: {metadata.tokenDecimals}</div>
    </div>
  )
}`,
  },
  {
    title: "Query Identity Information",
    description: "Fetch on-chain identity for an account",
    category: "query",
    code: `import { usePolkadot } from './providers/PolkadotProvider'

function IdentityDisplay({ address }: { address: string }) {
  const { api } = usePolkadot()
  const [identity, setIdentity] = useState<any>(null)

  useEffect(() => {
    if (!api) return

    const loadIdentity = async () => {
      const id = await api.query.identity.identityOf(address)

      if (id.isSome) {
        const info = id.unwrap().info
        setIdentity({
          display: info.display.asRaw.toUtf8(),
          email: info.email.isSome ? info.email.unwrap().asRaw.toUtf8() : null,
          twitter: info.twitter.isSome ? info.twitter.unwrap().asRaw.toUtf8() : null,
          web: info.web.isSome ? info.web.unwrap().asRaw.toUtf8() : null
        })
      }
    }

    loadIdentity()
  }, [api, address])

  if (!identity) return <div>No identity set</div>

  return (
    <div>
      <div>Name: {identity.display}</div>
      {identity.email && <div>Email: {identity.email}</div>}
      {identity.twitter && <div>Twitter: {identity.twitter}</div>}
      {identity.web && <div>Web: {identity.web}</div>}
    </div>
  )
}`,
  },
  {
    title: "Subscribe to New Blocks",
    description: "Real-time subscription to new block headers",
    category: "subscription",
    code: `import { usePolkadot } from './providers/PolkadotProvider'

function BlockSubscriber() {
  const { api } = usePolkadot()
  const [block, setBlock] = useState(0)

  useEffect(() => {
    if (!api) return
    let unsub: any

    api.rpc.chain.subscribeNewHeads((header) => {
      setBlock(header.number.toNumber())
    }).then((u) => { unsub = u })

    return () => { if (unsub) unsub() }
  }, [api])

  return <div>Latest: #{block}</div>
}`,
  },
  {
    title: "Query Account Balance",
    description: "Fetch and display account balance with formatting",
    category: "query",
    code: `import { usePolkadot } from './providers/PolkadotProvider'
import { formatBalance } from '@polkadot/util'

function BalanceDisplay({ address }: { address: string }) {
  const { api } = usePolkadot()
  const [balance, setBalance] = useState('')

  useEffect(() => {
    if (!api) return

    const loadBalance = async () => {
      const { data } = await api.query.system.account(address)
      setBalance(formatBalance(data.free, {
        withSi: true
      }))
    }

    loadBalance()
  }, [api, address])

  return <div>Balance: {balance}</div>
}`,
  },
  {
    title: "Send Transfer Transaction",
    description: "Sign and send a balance transfer with the connected account",
    category: "transaction",
    code: `import { usePolkadot } from './providers/PolkadotProvider'
import { useTypink } from 'typink'
import { web3FromAddress } from '@polkadot/extension-dapp'

function TransferButton({ to, amount }: Props) {
  const { api } = usePolkadot()
  const { connectedAccount } = useTypink()
  const [status, setStatus] = useState('')

  const handleTransfer = async () => {
    if (!api || !connectedAccount) return

    try {
      setStatus('Signing...')
      const injector = await web3FromAddress(
        connectedAccount.address
      )

      const transfer = api.tx.balances.transferKeepAlive(
        to,
        amount
      )

      await transfer.signAndSend(
        connectedAccount.address,
        { signer: injector.signer },
        ({ status }) => {
          if (status.isInBlock) {
            setStatus('In block!')
          }
        }
      )
    } catch (error) {
      setStatus('Error: ' + error.message)
    }
  }

  return (
    <div>
      <button onClick={handleTransfer}>
        Send Transfer
      </button>
      <div>{status}</div>
    </div>
  )
}`,
  },
  {
    title: "Subscribe to Account Balance",
    description: "Real-time balance updates for connected account",
    category: "subscription",
    code: `import { usePolkadot } from './providers/PolkadotProvider'
import { useTypink } from 'typink'
import { formatBalance } from '@polkadot/util'

function LiveBalance() {
  const { api } = usePolkadot()
  const { connectedAccount } = useTypink()
  const [balance, setBalance] = useState('')

  useEffect(() => {
    if (!api || !connectedAccount) return
    let unsub: any

    api.query.system.account(
      connectedAccount.address,
      ({ data }) => {
        setBalance(formatBalance(data.free, {
          withSi: true
        }))
      }
    ).then((u) => { unsub = u })

    return () => { if (unsub) unsub() }
  }, [api, connectedAccount])

  return <div>Balance: {balance}</div>
}`,
  },
  {
    title: "Use Wallet Hook",
    description: "Access wallet state and connection methods with Typink",
    category: "hook",
    code: `import { useTypink } from 'typink'

function WalletInfo() {
  const {
    wallets,           // All available wallets
    connectedWallets,  // Currently connected
    accounts,          // All accounts
    connectedAccount,  // Active account
    connectWallet,     // Connect function
    disconnect,        // Disconnect function
  } = useTypink()

  return (
    <div>
      <div>Wallets: {wallets.length}</div>
      <div>Connected: {connectedWallets.length}</div>
      <div>Accounts: {accounts.length}</div>
      {connectedAccount && (
        <div>Active: {connectedAccount.name}</div>
      )}
    </div>
  )
}`,
  },
  {
    title: "Query Staking Info",
    description: "Fetch staking data including validators and era",
    category: "query",
    code: `import { usePolkadot } from './providers/PolkadotProvider'

function StakingInfo() {
  const { api } = usePolkadot()
  const [staking, setStaking] = useState({
    validators: 0,
    era: 0
  })

  useEffect(() => {
    if (!api) return

    const loadStaking = async () => {
      const [validators, activeEra] = await Promise.all([
        api.query.staking.validatorCount(),
        api.query.staking.activeEra()
      ])

      setStaking({
        validators: validators.toNumber(),
        era: activeEra.unwrapOr({ index: 0 })
          .index.toNumber()
      })
    }

    loadStaking()
  }, [api])

  return (
    <div>
      <div>Validators: {staking.validators}</div>
      <div>Era: {staking.era}</div>
    </div>
  )
}`,
  },
  {
    title: "Estimate Transaction Fees",
    description: "Calculate fees before sending a transaction",
    category: "query",
    code: `import { usePolkadot } from './providers/PolkadotProvider'
import { formatBalance } from '@polkadot/util'

function FeeEstimator({ to, amount, from }: Props) {
  const { api } = usePolkadot()
  const [fee, setFee] = useState('')

  useEffect(() => {
    if (!api || !from) return

    const estimateFee = async () => {
      const transfer = api.tx.balances.transfer(to, amount)
      const info = await transfer.paymentInfo(from)

      setFee(formatBalance(info.partialFee, {
        withSi: true
      }))
    }

    estimateFee()
  }, [api, to, amount, from])

  return <div>Estimated Fee: {fee}</div>
}`,
  },
  {
    title: "Batch Transactions",
    description: "Submit multiple transactions in a single batch",
    category: "transaction",
    code: `import { usePolkadot } from './providers/PolkadotProvider'
import { useTypink } from 'typink'
import { web3FromSource } from '@polkadot/extension-dapp'

function BatchTransfer({ transfers }: Props) {
  const { api } = usePolkadot()
  const { connectedAccount } = useTypink()
  const [status, setStatus] = useState('')

  const handleBatch = async () => {
    if (!api || !connectedAccount) return

    try {
      setStatus('Preparing batch...')

      // Create array of transfer calls
      const txs = transfers.map(({ to, amount }) =>
        api.tx.balances.transfer(to, amount)
      )

      // Batch all transactions
      const batchTx = api.tx.utility.batch(txs)

      const injected = await web3FromSource(connectedAccount.source)
      api.setSigner(injected.signer)

      setStatus('Signing...')
      await batchTx.signAndSend(
        connectedAccount.address,
        ({ status }) => {
          if (status.isInBlock) {
            setStatus(\`Batch in block: \${status.asInBlock}\`)
          } else if (status.isFinalized) {
            setStatus('Batch finalized!')
          }
        }
      )
    } catch (error: any) {
      setStatus('Error: ' + error.message)
    }
  }

  return (
    <div>
      <button onClick={handleBatch}>Send Batch</button>
      <div>{status}</div>
    </div>
  )
}`,
  },
  {
    title: "Remark Transaction",
    description: "Add on-chain data with a remark",
    category: "transaction",
    code: `import { usePolkadot } from './providers/PolkadotProvider'
import { useTypink } from 'typink'
import { web3FromSource } from '@polkadot/extension-dapp'
import { stringToHex } from '@polkadot/util'

function RemarkButton({ message }: { message: string }) {
  const { api } = usePolkadot()
  const { connectedAccount } = useTypink()
  const [status, setStatus] = useState('')

  const handleRemark = async () => {
    if (!api || !connectedAccount) return

    try {
      const injected = await web3FromSource(connectedAccount.source)
      api.setSigner(injected.signer)

      const remark = api.tx.system.remark(stringToHex(message))

      await remark.signAndSend(
        connectedAccount.address,
        ({ status }) => {
          if (status.isInBlock) {
            setStatus('Remark in block!')
          }
        }
      )
    } catch (error: any) {
      setStatus('Error: ' + error.message)
    }
  }

  return (
    <div>
      <button onClick={handleRemark}>Add Remark</button>
      <div>{status}</div>
    </div>
  )
}`,
  },
  {
    title: "Subscribe to Events",
    description: "Listen to all system events in real-time",
    category: "subscription",
    code: `import { usePolkadot } from './providers/PolkadotProvider'

function EventListener() {
  const { api } = usePolkadot()
  const [events, setEvents] = useState<any[]>([])

  useEffect(() => {
    if (!api) return
    let unsub: any

    api.query.system.events((events) => {
      const recentEvents = events
        .slice(-10)
        .map((record) => ({
          section: record.event.section,
          method: record.event.method,
          data: record.event.data.toString()
        }))

      setEvents(recentEvents)
    }).then((u) => { unsub = u })

    return () => { if (unsub) unsub() }
  }, [api])

  return (
    <div>
      <h3>Recent Events</h3>
      {events.map((event, i) => (
        <div key={i}>
          {event.section}.{event.method}
        </div>
      ))}
    </div>
  )
}`,
  },
  {
    title: "Monitor Transfer Events",
    description: "Subscribe to balance transfer events only",
    category: "subscription",
    code: `import { usePolkadot } from './providers/PolkadotProvider'

function TransferMonitor() {
  const { api } = usePolkadot()
  const [transfers, setTransfers] = useState<any[]>([])

  useEffect(() => {
    if (!api) return
    let unsub: any

    api.query.system.events((events) => {
      const transferEvents = events
        .filter(({ event }) =>
          event.section === 'balances' &&
          event.method === 'Transfer'
        )
        .map(({ event }) => ({
          from: event.data[0].toString(),
          to: event.data[1].toString(),
          amount: event.data[2].toString()
        }))

      if (transferEvents.length > 0) {
        setTransfers((prev) =>
          [...transferEvents, ...prev].slice(0, 20)
        )
      }
    }).then((u) => { unsub = u })

    return () => { if (unsub) unsub() }
  }, [api])

  return (
    <div>
      <h3>Recent Transfers</h3>
      {transfers.map((tx, i) => (
        <div key={i}>
          {tx.from} → {tx.to}: {tx.amount}
        </div>
      ))}
    </div>
  )
}`,
  },
  {
    title: "Custom Hook: useBlockTime",
    description: "Create a reusable hook for block timestamp",
    category: "hook",
    code: `import { usePolkadot } from './providers/PolkadotProvider'
import { useState, useEffect } from 'react'

export function useBlockTime() {
  const { api } = usePolkadot()
  const [timestamp, setTimestamp] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!api) return
    let unsub: any

    api.query.timestamp.now((moment) => {
      setTimestamp(moment.toNumber())
      setLoading(false)
    }).then((u) => { unsub = u })

    return () => { if (unsub) unsub() }
  }, [api])

  return { timestamp, loading }
}

// Usage:
function MyComponent() {
  const { timestamp, loading } = useBlockTime()

  if (loading) return <div>Loading...</div>

  const date = new Date(timestamp!)
  return <div>Block time: {date.toLocaleString()}</div>
}`,
  },
  {
    title: "Custom Hook: useAccountNonce",
    description: "Track account transaction nonce",
    category: "hook",
    code: `import { usePolkadot } from './providers/PolkadotProvider'
import { useState, useEffect } from 'react'

export function useAccountNonce(address?: string) {
  const { api } = usePolkadot()
  const [nonce, setNonce] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!api || !address) {
      setLoading(false)
      return
    }

    const loadNonce = async () => {
      const accountNonce = await api.rpc.system.accountNextIndex(address)
      setNonce(accountNonce.toNumber())
      setLoading(false)
    }

    loadNonce()
  }, [api, address])

  return { nonce, loading }
}

// Usage:
function NonceDisplay({ address }: Props) {
  const { nonce, loading } = useAccountNonce(address)

  if (loading) return <div>Loading...</div>
  return <div>Next nonce: {nonce}</div>
}`,
  },
  {
    title: "Decode Extrinsic Data",
    description: "Parse and display transaction details",
    category: "query",
    code: `import { usePolkadot } from './providers/PolkadotProvider'

function ExtrinsicDecoder({ blockHash, extrinsicIndex }: Props) {
  const { api } = usePolkadot()
  const [extrinsic, setExtrinsic] = useState<any>(null)

  useEffect(() => {
    if (!api) return

    const loadExtrinsic = async () => {
      const block = await api.rpc.chain.getBlock(blockHash)
      const ext = block.block.extrinsics[extrinsicIndex]

      setExtrinsic({
        method: ext.method.method,
        section: ext.method.section,
        args: ext.method.args.map((arg) => arg.toString()),
        signer: ext.signer.toString(),
        nonce: ext.nonce.toNumber(),
        tip: ext.tip.toString()
      })
    }

    loadExtrinsic()
  }, [api, blockHash, extrinsicIndex])

  if (!extrinsic) return <div>Loading...</div>

  return (
    <div>
      <div>Method: {extrinsic.section}.{extrinsic.method}</div>
      <div>Signer: {extrinsic.signer}</div>
      <div>Nonce: {extrinsic.nonce}</div>
      <div>Args: {extrinsic.args.join(', ')}</div>
    </div>
  )
}`,
  },
];

export default function Examples() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const copyToClipboard = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const categories = [
    { id: "all", label: "All Examples", count: examples.length },
    {
      id: "query",
      label: "Queries",
      count: examples.filter((e) => e.category === "query").length,
    },
    {
      id: "transaction",
      label: "Transactions",
      count: examples.filter((e) => e.category === "transaction").length,
    },
    {
      id: "subscription",
      label: "Subscriptions",
      count: examples.filter((e) => e.category === "subscription").length,
    },
    {
      id: "hook",
      label: "Custom Hooks",
      count: examples.filter((e) => e.category === "hook").length,
    },
  ];

  const filteredExamples = examples
    .filter((ex) =>
      selectedCategory === "all" ? true : ex.category === selectedCategory
    )
    .filter((ex) =>
      searchQuery === ""
        ? true
        : ex.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ex.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const categoryIcons = {
    query: Database,
    transaction: Send,
    subscription: Zap,
    hook: Code,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-8 border border-white/10"
      >
        <div className="flex items-center gap-3 mb-4">
          <Book className="w-8 h-8 text-pink-500" />
          <h1 className="text-4xl font-bold text-gradient">Code Examples</h1>
        </div>
        <p className="text-gray-400 text-lg">
          Copy-paste ready examples for common Polkadot operations. All examples
          use the Polkadot.js API and Typink wallet integration.
        </p>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative"
      >
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search examples..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <span className="text-xl">×</span>
          </button>
        )}
      </motion.div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-3">
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? "gradient" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(category.id)}
            className="capitalize"
          >
            {category.label} ({category.count})
          </Button>
        ))}
      </div>

      {/* Examples Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredExamples.map((example, index) => {
          const Icon = categoryIcons[example.category];
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="glass-dark border-white/10 hover:border-pink-500/50 transition-all duration-300 h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-polkadot">
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-white">
                          {example.title}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {example.description}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <pre className="bg-black/40 rounded-lg p-4 overflow-x-auto text-sm border border-white/5">
                      <code className="text-gray-300 font-mono">
                        {example.code}
                      </code>
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 bg-black/60 hover:bg-black/80"
                      onClick={() => copyToClipboard(example.code, index)}
                    >
                      {copiedIndex === index ? (
                        <>
                          <Check className="w-4 h-4 text-green-400" />
                          <span className="ml-2 text-green-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span className="ml-2">Copy</span>
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="mt-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-pink-500/10 text-pink-400 border border-pink-500/20 capitalize">
                      {example.category}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Resources Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-dark rounded-2xl p-8 border border-white/10"
      >
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
          <Book className="w-6 h-6 text-violet-500" />
          Learn More
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
          <a
            href="https://polkadot.js.org/docs/"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all border border-white/10 hover:border-pink-500/50"
          >
            <div className="font-semibold text-white mb-1">
              Polkadot.js Documentation
            </div>
            <div className="text-sm text-gray-400">
              Complete API reference and guides
            </div>
          </a>
          <a
            href="https://wiki.polkadot.network/"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all border border-white/10 hover:border-violet-500/50"
          >
            <div className="font-semibold text-white mb-1">Polkadot Wiki</div>
            <div className="text-sm text-gray-400">
              Learn about Polkadot ecosystem
            </div>
          </a>
          <a
            href="https://github.com/dedotdev/typink"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all border border-white/10 hover:border-cyan-500/50"
          >
            <div className="font-semibold text-white mb-1">Typink GitHub</div>
            <div className="text-sm text-gray-400">
              Multi-wallet library documentation
            </div>
          </a>
          <a
            href="https://substrate.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all border border-white/10 hover:border-lime-500/50"
          >
            <div className="font-semibold text-white mb-1">
              Substrate Documentation
            </div>
            <div className="text-sm text-gray-400">
              Build your own blockchain
            </div>
          </a>
        </div>
      </motion.div>
    </div>
  );
}
