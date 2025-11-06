import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { usePolkadot } from "@/providers/PolkadotProvider";
import { useEffect, useState } from "react";

interface ContributionEntry {
  account: string;
  paraId: string;
  amount: string;
}

export default function CrowdloanContributions() {
  const { api, status } = usePolkadot();
  const [contributions, setContributions] = useState<ContributionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchContributions() {
      if (!api || status !== "connected") {
        setLoading(true);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Query all entries from the RcCrowdloanContributions storage map
        console.log("null?", api.query.ahOps);
        const entries = await api.query.ahOps.rcCrowdloanContribution.entries();

        const formattedEntries: ContributionEntry[] = entries.map(
          ([key, value]) => {
            // Decode the storage key to get the account and paraId
            const [account, paraId] = key.args;

            return {
              account: account.toString(),
              paraId: paraId.toString(),
              amount: value.toString(),
            };
          }
        );

        setContributions(formattedEntries);
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
  }, [api, status]);

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
          View all pending relay chain crowdloan contributions stored in the
          AhOps pallet
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>RcCrowdloanContributions</CardTitle>
          <CardDescription>
            All entries from the AhOps::RcCrowdloanContributions storage map
          </CardDescription>
        </CardHeader>
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
                      Account
                    </th>
                    <th className="text-left py-3 px-4 text-white/80 font-semibold">
                      Para ID
                    </th>
                    <th className="text-right py-3 px-4 text-white/80 font-semibold">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {contributions.map((contribution, idx) => (
                    <tr
                      key={`${contribution.account}-${contribution.paraId}`}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono text-sm text-white/90">
                        {contribution.account.slice(0, 8)}...
                        {contribution.account.slice(-8)}
                      </td>
                      <td className="py-3 px-4 text-white/90">
                        {contribution.paraId}
                      </td>
                      <td className="py-3 px-4 text-right text-white/90">
                        {contribution.amount}
                      </td>
                    </tr>
                  ))}
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
