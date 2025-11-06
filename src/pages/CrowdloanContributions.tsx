import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { usePolkadot } from "@/providers/PolkadotProvider";
import { useEffect, useState, useMemo } from "react";
import { useTypink } from "typink";
import { encodeAddress, decodeAddress } from "@polkadot/util-crypto";
import { useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Plus, X } from "lucide-react";

interface ContributionEntry {
  unlockBlockNumber: string;
  paraId: string;
  account: string;
  fundPot: string;
  balance: string;
}

export default function CrowdloanContributions() {
  const { api, status } = usePolkadot();
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

        // Sort contributions: search accounts first, then others
        const sortedEntries = formattedEntries.sort((a, b) => {
          if (searchAccounts.length === 0) return 0;

          const aIsSearched = searchAccounts.some(
            (addr) => a.account.toLowerCase() === addr.toLowerCase()
          );
          const bIsSearched = searchAccounts.some(
            (addr) => b.account.toLowerCase() === addr.toLowerCase()
          );

          if (aIsSearched && !bIsSearched) return -1;
          if (!aIsSearched && bIsSearched) return 1;
          return 0;
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
              <div className="space-y-2">
                {searchAccountsList.map((account, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/10"
                  >
                    <span className="flex-1 font-mono text-sm text-white/90 truncate">
                      {account}
                    </span>
                    <Button
                      onClick={() => removeAccount(account)}
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                      title="Remove account"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
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
                      Unlock Block
                    </th>
                    <th className="text-left py-3 px-4 text-white/80 font-semibold">
                      Para ID
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

                    return (
                    <tr
                      key={rowKey}
                      className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                        isSearchedAccount ? 'bg-pink-500/10 border-pink-500/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-white/90">
                        {contribution.unlockBlockNumber}
                      </td>
                      <td className="py-3 px-4 text-white/90">
                        {contribution.paraId}
                      </td>
                      <td className="py-3 px-4 font-mono text-sm text-white/90">
                        <button
                          onClick={() => copyToClipboard(contribution.account, rowKey)}
                          className="hover:text-pink-400 transition-colors cursor-pointer inline-flex items-center gap-2"
                          title="Click to copy address"
                        >
                          {contribution.account.slice(0, 8)}...
                          {contribution.account.slice(-8)}
                          {copiedRowKey === rowKey && (
                            <span className="text-green-400 text-xs font-sans">✓ Copied</span>
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-white/90 font-mono text-sm">
                        {contribution.fundPot.slice(0, 8)}...
                        {contribution.fundPot.slice(-8)}
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
