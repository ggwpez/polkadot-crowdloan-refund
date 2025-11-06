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
  const [contributions, setContributions] = useState<ContributionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenDecimals, setTokenDecimals] = useState<number>(10);
  const [tokenSymbol, setTokenSymbol] = useState<string>("DOT");
  const [copiedRowKey, setCopiedRowKey] = useState<string | null>(null);

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

        // Sort contributions: connected account first, then others
        const sortedEntries = formattedEntries.sort((a, b) => {
          if (!connectedAccountPolkadot) return 0;

          const aIsConnected = a.account.toLowerCase() === connectedAccountPolkadot.toLowerCase();
          const bIsConnected = b.account.toLowerCase() === connectedAccountPolkadot.toLowerCase();

          if (aIsConnected && !bIsConnected) return -1;
          if (!aIsConnected && bIsConnected) return 1;
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
  }, [api, status, connectedAccountPolkadot]);

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
          Connect your wallet to view your contributions
        </p>
      </div>

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
                    const isConnectedAccount = connectedAccountPolkadot &&
                      contribution.account.toLowerCase() === connectedAccountPolkadot.toLowerCase();

                    return (
                    <tr
                      key={rowKey}
                      className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                        isConnectedAccount ? 'bg-pink-500/10 border-pink-500/30' : ''
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
                          {isConnectedAccount && (
                            <span className="text-pink-400 font-sans">(you)</span>
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
