import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { usePolkadot } from "@/providers/PolkadotProvider";
import { useRPCSettings } from "@/providers/RPCSettingsProvider";
import {
  BLOCK_FETCH_INTERVAL_MS,
  CACHE_DURATION_MS,
  calculateUnlockDays,
  FetchState,
  formatBalance,
  formatParaId,
  getFetchStateLabel,
  normalizeAddress,
  PAGE_SIZE,
  truncateAddress,
  UPDATE_BATCH_SIZE,
} from "@/utils/ahOpsUtils";
import { Loader2, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTypink } from "typink";

interface LeaseReserveEntry {
  unlockBlockNumber: string;
  paraId: string;
  account: string;
  balance: string;
}

const getRowKey = (entry: LeaseReserveEntry): string =>
  `${entry.unlockBlockNumber}-${entry.paraId}-${entry.account}`;

export default function LeaseReserve() {
  const { api, status, relayChainApi, relayChainStatus } = usePolkadot();
  const { connectedAccount } = useTypink();
  const { settings } = useRPCSettings();
  const [entries, setEntries] = useState<LeaseReserveEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenDecimals, setTokenDecimals] = useState<number>(10);
  const [tokenSymbol, setTokenSymbol] = useState<string>("DOT");
  const [copiedRowKey, setCopiedRowKey] = useState<string | null>(null);
  const [searchAccountsList, setSearchAccountsList] = useState<string[]>([]);
  const [newAccountInput, setNewAccountInput] = useState<string>("");
  const [currentRelayBlock, setCurrentRelayBlock] = useState<number | null>(null);
  const [lastQueryTime, setLastQueryTime] = useState<number>(0);
  const [cachedEntries, setCachedEntries] = useState<LeaseReserveEntry[]>([]);
  const [unlockingRows, setUnlockingRows] = useState<Set<string>>(new Set());
  const [unlockingStates, setUnlockingStates] = useState<Record<string, 'signing' | 'including' | 'finalizing'>>({});
  const [fetchState, setFetchState] = useState<FetchState>({ status: "idle" });

  const connectedAccountPolkadot = useMemo(
    () => connectedAccount?.address ? normalizeAddress(connectedAccount.address) : null,
    [connectedAccount]
  );

  // Add connected account to the list when wallet is connected
  useEffect(() => {
    if (connectedAccountPolkadot && !searchAccountsList.includes(connectedAccountPolkadot)) {
      const newList = [...searchAccountsList, connectedAccountPolkadot];
      setSearchAccountsList(newList);
    }
  }, [connectedAccountPolkadot]);

  // Fetch current relay chain block number
  useEffect(() => {
    // If there's a block override, use it instead of fetching from chain
    if (settings.relayBlockOverride !== null) {
      setCurrentRelayBlock(settings.relayBlockOverride);
      console.log(`[Relay Chain] Using override block: ${settings.relayBlockOverride}`);
      return;
    }

    async function fetchCurrentBlock() {
      if (!relayChainApi || relayChainStatus !== "connected") {
        return;
      }

      try {
        const header = await relayChainApi.rpc.chain.getHeader();
        const blockNumber = header.number.toNumber();
        setCurrentRelayBlock(blockNumber);
        console.log(`[Relay Chain] Current block: ${blockNumber}`);
      } catch (err) {
        console.error("Error fetching current relay block:", err);
      }
    }

    fetchCurrentBlock();
    const interval = setInterval(fetchCurrentBlock, BLOCK_FETCH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [relayChainApi, relayChainStatus, settings.relayBlockOverride]);

  const searchAccounts = useMemo(
    () => searchAccountsList.map(normalizeAddress).filter((addr): addr is string => addr !== null),
    [searchAccountsList]
  );

  const accountEntryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    searchAccountsList.forEach((account) => {
      const normalized = normalizeAddress(account);
      if (normalized) {
        counts[account] = entries.filter(
          (e) => e.account.toLowerCase() === normalized.toLowerCase()
        ).length;
      }
    });
    return counts;
  }, [searchAccountsList, entries]);

  // Add account to the list
  const addAccount = () => {
    const trimmed = newAccountInput.trim();
    if (!trimmed) return;

    const normalized = normalizeAddress(trimmed);
    if (!normalized) {
      alert("Invalid address format");
      return;
    }

    if (searchAccountsList.includes(trimmed)) {
      alert("Address already in list");
      return;
    }

    const newList = [trimmed, ...searchAccountsList];
    setSearchAccountsList(newList);
    setNewAccountInput("");
  };

  const removeAccount = (address: string) => {
    const newList = searchAccountsList.filter(a => a !== address);
    setSearchAccountsList(newList);
  };

  const copyToClipboard = async (address: string, rowKey: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedRowKey(rowKey);
      setTimeout(() => setCopiedRowKey(null), 2000);
    } catch (err) {
      console.error("Failed to copy address:", err);
    }
  };

  const getUnlockButtonText = (rowKey: string): string => {
    const state = unlockingStates[rowKey];
    if (state === 'finalizing') return 'Finalizing...';
    if (state === 'including') return 'Including...';
    return 'Signing...';
  };

  const handleUnlock = async (entry: LeaseReserveEntry) => {
    if (!api || !connectedAccount) {
      alert("Please connect your wallet and ensure Asset Hub API is connected");
      return;
    }

    const rowKey = getRowKey(entry);
    if (unlockingRows.has(rowKey)) return;

    try {
      setUnlockingRows((prev) => new Set(prev).add(rowKey));
      setUnlockingStates((prev) => ({ ...prev, [rowKey]: 'signing' }));

      // Get the signer from the wallet
      const { web3Enable, web3FromAddress } = await import('@polkadot/extension-dapp');

      // Enable web3 extensions
      await web3Enable('AssetHub AhOps');

      // Get the injector for the connected account
      const injector = await web3FromAddress(connectedAccount.address);

      // Create the unreserve extrinsic using AhOps pallet on Asset Hub
      const tx = api.tx.ahOps.unreserveLeaseDeposit(
        entry.unlockBlockNumber,
        entry.account,
        entry.paraId
      );

      console.log(`[Unlock] Submitting unreserveLeaseDeposit for paraId ${entry.paraId}, account ${entry.account}, block ${entry.unlockBlockNumber}`);

      // Sign and send the transaction
      await tx.signAndSend(
        connectedAccount.address,
        { signer: injector.signer },
        ({ status, events, dispatchError }) => {
          // Transaction has been signed and sent, update state to including
          setUnlockingStates((prev) => {
            if (prev[rowKey] === 'signing') {
              return { ...prev, [rowKey]: 'including' };
            }
            return prev;
          });

          if (status.isInBlock) {
            console.log(`[Unlock] Transaction included in block hash: ${status.asInBlock.toHex()}`);
            setUnlockingStates((prev) => ({ ...prev, [rowKey]: 'finalizing' }));
          }

          if (status.isFinalized) {
            console.log(`[Unlock] Transaction finalized in block hash: ${status.asFinalized.toHex()}`);

            if (dispatchError) {
              if (dispatchError.isModule) {
                const decoded = api.registry.findMetaError(dispatchError.asModule);
                console.error(`[Unlock] Error: ${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`);
                alert(`Transaction failed: ${decoded.section}.${decoded.name}\n${decoded.docs.join(' ')}`);
              } else {
                console.error(`[Unlock] Error: ${dispatchError.toString()}`);
                alert(`Transaction failed: ${dispatchError.toString()}`);
              }
            } else {
              alert("Unlock transaction successful! The lease deposit has been unreserved.");
              // Refresh the entries list after a short delay
              setTimeout(() => {
                window.location.reload();
              }, 2000);
            }

            setUnlockingRows((prev) => {
              const newSet = new Set(prev);
              newSet.delete(rowKey);
              return newSet;
            });
            setUnlockingStates((prev) => {
              const newStates = { ...prev };
              delete newStates[rowKey];
              return newStates;
            });
          }
        }
      );
    } catch (err) {
      console.error("[Unlock] Error:", err);
      alert(`Failed to unlock: ${err instanceof Error ? err.message : String(err)}`);
      setUnlockingRows((prev) => {
        const newSet = new Set(prev);
        newSet.delete(rowKey);
        return newSet;
      });
      setUnlockingStates((prev) => {
        const newStates = { ...prev };
        delete newStates[rowKey];
        return newStates;
      });
    }
  };

  useEffect(() => {
    async function fetchLeaseReserves() {
      if (!api || status !== "connected") {
        setLoading(true);
        return;
      }

      const now = Date.now();
      if (cachedEntries.length > 0 && now - lastQueryTime < CACHE_DURATION_MS) {
        console.log("Using cached lease reserve data");
        return;
      }

      try {
        setLoading(true);
        setFetchState({ status: "fetching", currentCount: 0 });
        setError(null);
        setEntries([]);

        console.log("Fetching lease reserves from RPC...");

        const properties = await api.rpc.system.properties();
        setTokenDecimals(Number(properties.tokenDecimals.unwrapOr([10])[0]));
        setTokenSymbol(properties.tokenSymbol.unwrapOr(["DOT"])[0].toString());

        const allFormattedEntries: LeaseReserveEntry[] = [];
        let itemsSinceLastUpdate = 0;
        let lastKey: string | undefined;
        let pageCount = 0;

        while (true) {
          const queryEntries: any = await api.query.ahOps.rcLeaseReserve.entriesPaged({
            args: [],
            pageSize: PAGE_SIZE,
            startKey: lastKey,
          });

          if (queryEntries.length === 0) break;

          pageCount++;

          const formattedBatch = queryEntries.map(([key, value]: any) => {
            const [unlockBlockNumber, paraId, account] = key.args;
            const balance = value.toJSON() as string;

            return {
              unlockBlockNumber: unlockBlockNumber.toString(),
              paraId: paraId.toString(),
              account: account.toString(),
              balance: balance.toString(),
            };
          });

          allFormattedEntries.push(...formattedBatch);
          itemsSinceLastUpdate += formattedBatch.length;

          if (itemsSinceLastUpdate >= UPDATE_BATCH_SIZE) {
            setCachedEntries([...allFormattedEntries]);
            setFetchState({ status: "fetching", currentCount: allFormattedEntries.length });
            itemsSinceLastUpdate = 0;
          }

          if (pageCount === 1) setLoading(false);
          if (queryEntries.length < PAGE_SIZE) break;

          lastKey = queryEntries[queryEntries.length - 1][0].toHex();
          await new Promise(resolve => setTimeout(resolve, 0));
        }

        // Final update with all entries
        setCachedEntries(allFormattedEntries);
        setLastQueryTime(now);
        setFetchState({ status: "complete", totalCount: allFormattedEntries.length });
      } catch (err) {
        console.error("Error fetching lease reserves:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch lease reserves"
        );
        setLoading(false);
        setFetchState({ status: "idle" });
      }
    }

    fetchLeaseReserves();
  }, [api, status]);

  // Sort and display entries whenever cache or search accounts change
  useEffect(() => {
    if (cachedEntries.length === 0) return;

    const sortedEntries = [...cachedEntries].sort((a, b) => {
      // First, prioritize searched accounts
      const aIsSearched = searchAccounts.some(
        (addr) => a.account.toLowerCase() === addr.toLowerCase()
      );
      const bIsSearched = searchAccounts.some(
        (addr) => b.account.toLowerCase() === addr.toLowerCase()
      );

      if (aIsSearched && !bIsSearched) return -1;
      if (!aIsSearched && bIsSearched) return 1;

      // Then sort by Para ID
      const paraIdCompare = Number(a.paraId) - Number(b.paraId);
      if (paraIdCompare !== 0) return paraIdCompare;

      // Then by Unlock Block
      const blockCompare = Number(a.unlockBlockNumber) - Number(b.unlockBlockNumber);
      if (blockCompare !== 0) return blockCompare;

      // Then by Account
      const accountCompare = a.account.localeCompare(b.account);
      if (accountCompare !== 0) return accountCompare;

      // Finally by Balance
      return Number(a.balance) - Number(b.balance);
    });

    // Set all sorted entries at once
    setEntries(sortedEntries);
  }, [cachedEntries, searchAccounts]);

  if (status === "connecting") {
    return (
      <div className="container mx-auto px-6 py-8">
        <LoadingSkeleton />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-400">Connection Error</CardTitle>
            <CardDescription>
              Failed to connect to AssetHub. Please check your network
              connection.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">
          Lease Reserves
        </h1>
        <p className="text-white/60">
          Reserved balance for winning lease auctions (crowdloan or solo bidder)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardDescription>
            {getFetchStateLabel(fetchState)}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {loading ? (
            <div className="space-y-3">
              <LoadingSkeleton />
            </div>
          ) : error ? (
            <div className="text-red-400 p-4 rounded-lg bg-red-400/10">
              {error}
            </div>
          ) : entries.length === 0 ? (
            <div className="text-white/60 p-4 text-center">
              No lease reserves found in the storage map
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-white/80 font-semibold">
                      Para ID
                    </th>
                    <th className="text-left py-3 px-4 text-white/80 font-semibold">
                      Unlock Block
                    </th>
                    <th className="text-left py-3 px-4 text-white/80 font-semibold">
                      Unlock in days
                    </th>
                    <th className="text-left py-3 px-4 text-white/80 font-semibold">
                      Account
                    </th>
                    <th className="text-right py-3 px-4 text-white/80 font-semibold">
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const rowKey = getRowKey(entry);
                    const isSearchedAccount = searchAccounts.some(
                      (addr) => entry.account.toLowerCase() === addr.toLowerCase()
                    );
                    const unlockDays = calculateUnlockDays(entry.unlockBlockNumber, currentRelayBlock);
                    const paraIdInfo = formatParaId(entry.paraId);

                    return (
                    <tr
                      key={rowKey}
                      className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                        isSearchedAccount ? 'bg-pink-500/10 border-pink-500/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-white/90" title={paraIdInfo.tooltip}>
                        {paraIdInfo.display}
                      </td>
                      <td className="py-3 px-4 text-white/90">
                        {entry.unlockBlockNumber}
                      </td>
                      <td className="py-3 px-4 text-white/90">
                        {unlockDays === null ? (
                          "-"
                        ) : unlockDays === 0 ? (
                          <Button
                            variant="gradient"
                            size="sm"
                            onClick={() => handleUnlock(entry)}
                            disabled={unlockingRows.has(rowKey) || !connectedAccount}
                            className="gap-1"
                          >
                            {unlockingRows.has(rowKey) ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                {getUnlockButtonText(rowKey)}
                              </>
                            ) : (
                              "Unlock"
                            )}
                          </Button>
                        ) : unlockDays < 1 ? (
                          "< 1"
                        ) : (
                          Math.round(unlockDays).toString()
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-sm text-white/90">
                        <button
                          onClick={() => copyToClipboard(entry.account, rowKey)}
                          className={`hover:text-pink-400 transition-colors cursor-pointer ${
                            copiedRowKey === rowKey ? 'animate-[blink_0.3s_ease-in-out_2]' : ''
                          }`}
                          title="Click to copy address"
                        >
                          {truncateAddress(entry.account)}
                          <span className="sr-only">{entry.account}</span>
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right text-white/90">
                        {formatBalance(entry.balance, tokenDecimals, tokenSymbol)}
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
