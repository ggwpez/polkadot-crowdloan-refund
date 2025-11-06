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
    getFetchStateLabel,
    normalizeAddress,
    PAGE_SIZE,
    truncateAddress,
    UPDATE_BATCH_SIZE,
} from "@/utils/ahOpsUtils";
import { Loader2, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTypink } from "typink";

interface CrowdloanReserveEntry {
  unlockBlockNumber: string;
  paraId: string;
  account: string;
  balance: string;
}

const getRowKey = (entry: CrowdloanReserveEntry): string =>
  `${entry.unlockBlockNumber}-${entry.paraId}-${entry.account}`;

export default function CrowdloanReserve() {
  const { api, status, relayChainApi, relayChainStatus } = usePolkadot();
  const { connectedAccount } = useTypink();
  const { settings } = useRPCSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const [entries, setEntries] = useState<CrowdloanReserveEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenDecimals, setTokenDecimals] = useState<number>(10);
  const [tokenSymbol, setTokenSymbol] = useState<string>("DOT");
  const [copiedRowKey, setCopiedRowKey] = useState<string | null>(null);
  const [searchAccountsList, setSearchAccountsList] = useState<string[]>([]);
  const [newAccountInput, setNewAccountInput] = useState<string>("");
  const [currentRelayBlock, setCurrentRelayBlock] = useState<number | null>(null);
  const [lastQueryTime, setLastQueryTime] = useState<number>(0);
  const [cachedEntries, setCachedEntries] = useState<CrowdloanReserveEntry[]>([]);
  const [unlockingRows, setUnlockingRows] = useState<Set<string>>(new Set());
  const [fetchState, setFetchState] = useState<FetchState>({ status: "idle" });

  const connectedAccountPolkadot = useMemo(
    () => connectedAccount?.address ? normalizeAddress(connectedAccount.address) : null,
    [connectedAccount]
  );

  // Initialize accounts list from URL params
  useEffect(() => {
    const accountsParam = searchParams.get("accounts");
    if (accountsParam) {
      const accounts = accountsParam.split(",").map(a => a.trim()).filter(Boolean);
      setSearchAccountsList(accounts);
    }
  }, []);

  // Add connected account to the list when wallet is connected
  useEffect(() => {
    if (connectedAccountPolkadot && !searchAccountsList.includes(connectedAccountPolkadot)) {
      const newList = [...searchAccountsList, connectedAccountPolkadot];
      setSearchAccountsList(newList);
      setSearchParams({ accounts: newList.join(",") });
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
    setSearchParams({ accounts: newList.join(",") });
    setNewAccountInput("");
  };

  const removeAccount = (address: string) => {
    const newList = searchAccountsList.filter(a => a !== address);
    setSearchAccountsList(newList);
    setSearchParams(newList.length > 0 ? { accounts: newList.join(",") } : {});
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

  const handleUnlock = async (entry: CrowdloanReserveEntry) => {
    if (!api || !connectedAccount) {
      alert("Please connect your wallet and ensure Asset Hub API is connected");
      return;
    }

    const rowKey = getRowKey(entry);
    if (unlockingRows.has(rowKey)) return;

    try {
      setUnlockingRows((prev) => new Set(prev).add(rowKey));

      // Get the signer from the wallet
      const { web3Enable, web3FromAddress } = await import('@polkadot/extension-dapp');

      // Enable web3 extensions
      await web3Enable('AssetHub AhOps');

      // Get the injector for the connected account
      const injector = await web3FromAddress(connectedAccount.address);

      // Create the unreserve extrinsic using AhOps pallet on Asset Hub
      const tx = api.tx.ahOps.unreserveCrowdloanReserve(
        entry.unlockBlockNumber,
        entry.account,
        entry.paraId
      );

      console.log(`[Unlock] Submitting unreserveCrowdloanReserve for paraId ${entry.paraId}, account ${entry.account}, block ${entry.unlockBlockNumber}`);

      // Sign and send the transaction
      await tx.signAndSend(
        connectedAccount.address,
        { signer: injector.signer },
        ({ status, events, dispatchError }) => {
          if (status.isInBlock) {
            console.log(`[Unlock] Transaction included in block hash: ${status.asInBlock.toHex()}`);
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
              alert("Unlock transaction successful! The crowdloan reserve has been unreserved.");
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
    }
  };

  useEffect(() => {
    async function fetchCrowdloanReserves() {
      if (!api || status !== "connected") {
        setLoading(true);
        return;
      }

      const now = Date.now();
      if (cachedEntries.length > 0 && now - lastQueryTime < CACHE_DURATION_MS) {
        console.log("Using cached crowdloan reserve data");
        return;
      }

      try {
        setLoading(true);
        setFetchState({ status: "fetching", currentCount: 0 });
        setError(null);
        setEntries([]);

        console.log("Fetching crowdloan reserves from RPC...");

        const properties = await api.rpc.system.properties();
        setTokenDecimals(Number(properties.tokenDecimals.unwrapOr([10])[0]));
        setTokenSymbol(properties.tokenSymbol.unwrapOr(["DOT"])[0].toString());

        const allFormattedEntries: CrowdloanReserveEntry[] = [];
        let itemsSinceLastUpdate = 0;
        let lastKey: string | undefined;
        let pageCount = 0;

        while (true) {
          const queryEntries: any = await api.query.ahOps.rcCrowdloanReserve.entriesPaged({
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
        console.error("Error fetching crowdloan reserves:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch crowdloan reserves"
        );
        setLoading(false);
        setFetchState({ status: "idle" });
      }
    }

    fetchCrowdloanReserves();
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
          Crowdloan Reserves
        </h1>
        <p className="text-white/60">
          Reserve taken for creating crowdloans (normally 500 DOT)
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search Accounts</CardTitle>
          <CardDescription>
            Add account addresses to highlight and sort to top
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Add new account input */}
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter account address..."
                value={newAccountInput}
                onChange={(e) => setNewAccountInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addAccount();
                  }
                }}
                className="font-mono flex-1"
              />
              <Button
                onClick={addAccount}
                size="icon"
                variant="gradient"
                title="Add account"
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>

            {/* List of accounts */}
            {searchAccountsList.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 px-3 text-white/80 font-semibold text-sm">
                        Account
                      </th>
                      <th className="text-center py-2 px-3 text-white/80 font-semibold text-sm">
                        Found
                      </th>
                      <th className="text-right py-2 px-3 text-white/80 font-semibold text-sm">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchAccountsList.map((account, idx) => {
                      const normalized = normalizeAddress(account);
                      const isConnectedAccount = normalized && connectedAccountPolkadot &&
                        normalized.toLowerCase() === connectedAccountPolkadot.toLowerCase();

                      return (
                      <tr
                        key={idx}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <td className="py-3 px-3 font-mono text-sm text-white/90">
                          {account}
                          {isConnectedAccount && (
                            <span className="ml-2 text-xs text-pink-400">(you)</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center text-white/90">
                          <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full bg-pink-500/20 text-pink-300 text-xs font-semibold">
                            {accountEntryCounts[account] || 0}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Button
                            onClick={() => removeAccount(account)}
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                            title="Remove account"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
              No crowdloan reserves found in the storage map
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

                    return (
                    <tr
                      key={rowKey}
                      className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                        isSearchedAccount ? 'bg-pink-500/10 border-pink-500/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-white/90">
                        {entry.paraId}
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
                                Unlocking...
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
