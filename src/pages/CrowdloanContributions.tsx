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
import { decodeAddress, encodeAddress } from "@polkadot/util-crypto";
import { Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTypink } from "typink";

interface ContributionEntry {
  unlockBlockNumber: string;
  paraId: string;
  account: string;
  fundPot: string;
  balance: string;
}

export default function CrowdloanContributions() {
  const { api, status, relayChainApi, relayChainStatus } = usePolkadot();
  const { connectedAccount } = useTypink();
  const [searchParams, setSearchParams] = useSearchParams();
  const [contributions, setContributions] = useState<ContributionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenDecimals, setTokenDecimals] = useState<number>(10);
  const [tokenSymbol, setTokenSymbol] = useState<string>("DOT");
  const [copiedRowKey, setCopiedRowKey] = useState<string | null>(null);
  const [searchAccountsList, setSearchAccountsList] = useState<string[]>([]);
  const [newAccountInput, setNewAccountInput] = useState<string>("");
  const [currentRelayBlock, setCurrentRelayBlock] = useState<number | null>(null);

  // Convert connected account address to Polkadot SS58 format (prefix 0)
  const connectedAccountPolkadot = useMemo(() => {
    if (!connectedAccount?.address) return null;
    try {
      const publicKey = decodeAddress(connectedAccount.address);
      return encodeAddress(publicKey, 0); // 0 is Polkadot SS58 format
    } catch (err) {
      console.error("Failed to convert address:", err);
      return null;
    }
  }, [connectedAccount]);

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

    // Update block number every 12 seconds (approximately 2 blocks)
    const interval = setInterval(fetchCurrentBlock, 12000);

    return () => clearInterval(interval);
  }, [relayChainApi, relayChainStatus]);

  // Convert addresses to Polkadot SS58 format
  const normalizeAddress = (address: string): string | null => {
    try {
      const publicKey = decodeAddress(address.trim());
      return encodeAddress(publicKey, 0);
    } catch (err) {
      return null;
    }
  };

  // Parse and normalize the accounts from list
  const searchAccounts = useMemo(() => {
    return searchAccountsList
      .map((addr) => normalizeAddress(addr))
      .filter((addr): addr is string => addr !== null);
  }, [searchAccountsList]);

  // Count contributions per searched account
  const accountContributionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    searchAccountsList.forEach((account) => {
      const normalized = normalizeAddress(account);
      if (normalized) {
        const count = contributions.filter(
          (c) => c.account.toLowerCase() === normalized.toLowerCase()
        ).length;
        counts[account] = count;
      }
    });
    return counts;
  }, [searchAccountsList, contributions]);

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

    const newList = [...searchAccountsList, trimmed];
    setSearchAccountsList(newList);
    setSearchParams({ accounts: newList.join(",") });
    setNewAccountInput("");
  };

  // Remove account from the list
  const removeAccount = (address: string) => {
    const newList = searchAccountsList.filter(a => a !== address);
    setSearchAccountsList(newList);
    if (newList.length > 0) {
      setSearchParams({ accounts: newList.join(",") });
    } else {
      setSearchParams({});
    }
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

  // Calculate estimated unlock duration in days
  const calculateUnlockDays = (unlockBlock: string): number | null => {
    if (!currentRelayBlock) return null;

    const unlockBlockNum = Number(unlockBlock);
    const blocksRemaining = unlockBlockNum - currentRelayBlock;

    if (blocksRemaining <= 0) return 0; // Already unlocked

    // 6.6 seconds per block, convert to days
    const secondsRemaining = blocksRemaining * 6.6;
    const daysRemaining = secondsRemaining / 86400;

    return daysRemaining;
  };

  useEffect(() => {
    async function fetchContributions() {
      if (!api || status !== "connected") {
        setLoading(true);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get token decimals and symbol from chain properties
        const properties = await api.rpc.system.properties();
        const decimals = Number(properties.tokenDecimals.unwrapOr([10])[0]);
        const symbol = properties.tokenSymbol.unwrapOr(["DOT"])[0].toString();
        setTokenDecimals(decimals);
        setTokenSymbol(symbol);

        // Query all entries from the RcCrowdloanContributions storage map
        const entries = await api.query.ahOps.rcCrowdloanContribution.entries();

        const formattedEntries: ContributionEntry[] = entries.map(
          ([key, value]) => {
            // Decode the storage key to get unlockBlockNumber, paraId, and account
            const [unlockBlockNumber, paraId, account] = key.args;
            // Decode the value to get [fund_pot, balance]
            const valueArray = value.toJSON() as any[];
            const fundPot = valueArray[0];
            const balance = valueArray[1];

            return {
              unlockBlockNumber: unlockBlockNumber.toString(),
              paraId: paraId.toString(),
              account: account.toString(),
              fundPot: fundPot.toString(),
              balance: balance.toString(),
            };
          }
        );

        // Sort contributions: search accounts first, then by Para ID, Unlock Block, Account, Balance
        const sortedEntries = formattedEntries.sort((a, b) => {
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

        setContributions(sortedEntries);
      } catch (err) {
        console.error("Error fetching contributions:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch contributions"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchContributions();
  }, [api, status, searchAccounts]);

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
          Relay Chain Crowdloan Contributions
        </h1>
        <p className="text-white/60">
          Connect your wallet or search for accounts to view contributions
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
                    {searchAccountsList.map((account, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <td className="py-3 px-3 font-mono text-sm text-white/90">
                          {account}
                        </td>
                        <td className="py-3 px-3 text-center text-white/90">
                          <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full bg-pink-500/20 text-pink-300 text-xs font-semibold">
                            {accountContributionCounts[account] || 0}
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-3">
              <LoadingSkeleton />
            </div>
          ) : error ? (
            <div className="text-red-400 p-4 rounded-lg bg-red-400/10">
              {error}
            </div>
          ) : contributions.length === 0 ? (
            <div className="text-white/60 p-4 text-center">
              No contributions found in the storage map
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
                    <th className="text-left py-3 px-4 text-white/80 font-semibold">
                      Fund Pot
                    </th>
                    <th className="text-right py-3 px-4 text-white/80 font-semibold">
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {contributions.map((contribution, idx) => {
                    const rowKey = `${contribution.unlockBlockNumber}-${contribution.paraId}-${contribution.account}`;
                    const isSearchedAccount = searchAccounts.some(
                      (addr) => contribution.account.toLowerCase() === addr.toLowerCase()
                    );
                    const unlockDays = calculateUnlockDays(contribution.unlockBlockNumber);

                    return (
                    <tr
                      key={rowKey}
                      className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                        isSearchedAccount ? 'bg-pink-500/10 border-pink-500/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-white/90">
                        {contribution.paraId}
                      </td>
                      <td className="py-3 px-4 text-white/90">
                        {contribution.unlockBlockNumber}
                      </td>
                      <td className="py-3 px-4 text-white/90">
                        {unlockDays === null ? (
                          "-"
                        ) : unlockDays === 0 ? (
                          "Unlocked"
                        ) : unlockDays < 1 ? (
                          "< 1"
                        ) : (
                          Math.round(unlockDays).toString()
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-sm text-white/90">
                        <button
                          onClick={() => copyToClipboard(contribution.account, rowKey)}
                          className={`hover:text-pink-400 transition-colors cursor-pointer ${
                            copiedRowKey === rowKey ? 'animate-[blink_0.3s_ease-in-out_2]' : ''
                          }`}
                          title="Click to copy address"
                        >
                          {contribution.account.slice(0, 8)}...
                          {contribution.account.slice(-8)}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-white/90 font-mono text-sm">
                        <button
                          onClick={() => copyToClipboard(contribution.fundPot, `${rowKey}-fundpot`)}
                          className={`hover:text-pink-400 transition-colors cursor-pointer ${
                            copiedRowKey === `${rowKey}-fundpot` ? 'animate-[blink_0.3s_ease-in-out_2]' : ''
                          }`}
                          title="Click to copy fund pot address"
                        >
                          {contribution.fundPot.slice(0, 8)}...
                          {contribution.fundPot.slice(-8)}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right text-white/90">
                        {(Number(contribution.balance) / Math.pow(10, tokenDecimals)).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })} {tokenSymbol}
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
              <div className="mt-4 text-sm text-white/60">
                Total entries: {contributions.length}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
