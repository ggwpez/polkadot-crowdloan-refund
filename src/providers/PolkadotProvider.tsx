import { ASSETHUB_POLKADOT, POLKADOT } from "@/config/chains";
import { ApiPromise, WsProvider } from "@polkadot/api";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type ProviderState = {
  // Asset Hub API (for crowdloan contributions)
  assetHubApi: ApiPromise | null;
  assetHubStatus: "not-connected" | "connecting" | "connected" | "error";

  // Relay Chain API (for relay chain data)
  relayChainApi: ApiPromise | null;
  relayChainStatus: "not-connected" | "connecting" | "connected" | "error";

  // Legacy API for backward compatibility (points to Asset Hub)
  api: ApiPromise | null;
  status: "not-connected" | "connecting" | "connected" | "error";
};

const PolkadotContext = createContext<ProviderState>({
  assetHubApi: null,
  assetHubStatus: "not-connected",
  relayChainApi: null,
  relayChainStatus: "not-connected",
  api: null,
  status: "not-connected",
});

export function usePolkadot() {
  return useContext(PolkadotContext);
}

export function usePolkadotContext() {
  return useContext(PolkadotContext);
}

export function PolkadotProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Asset Hub connection
  const [assetHubApi, setAssetHubApi] = useState<ApiPromise | null>(null);
  const [assetHubStatus, setAssetHubStatus] =
    useState<ProviderState["assetHubStatus"]>("not-connected");

  // Relay Chain connection
  const [relayChainApi, setRelayChainApi] = useState<ApiPromise | null>(null);
  const [relayChainStatus, setRelayChainStatus] =
    useState<ProviderState["relayChainStatus"]>("not-connected");

  // Connect to Asset Hub
  useEffect(() => {
    let mounted = true;

    const connectAssetHub = async () => {
      setAssetHubStatus("connecting");

      const endpointsToTry = ASSETHUB_POLKADOT.endpoints;
      let lastError: Error | null = null;

      for (const endpointUrl of endpointsToTry) {
        if (!mounted) return;

        try {
          console.log(`[Asset Hub] Attempting to connect to: ${endpointUrl}`);
          const provider = new WsProvider(endpointUrl);
          const apiInstance = await ApiPromise.create({ provider });
          await apiInstance.isReady;

          if (!mounted) {
            await apiInstance.disconnect();
            return;
          }

          console.log(`[Asset Hub] Successfully connected to: ${endpointUrl}`);
          setAssetHubApi(apiInstance);
          setAssetHubStatus("connected");
          return;
        } catch (e) {
          console.warn(`[Asset Hub] Failed to connect to ${endpointUrl}:`, e);
          lastError = e as Error;
        }
      }

      if (mounted) {
        console.error("[Asset Hub] Failed to connect to any endpoint", lastError);
        setAssetHubStatus("error");
      }
    };

    connectAssetHub();

    return () => {
      mounted = false;
      if (assetHubApi) {
        assetHubApi.disconnect().catch(console.error);
      }
    };
  }, []);

  // Connect to Relay Chain
  useEffect(() => {
    let mounted = true;

    const connectRelayChain = async () => {
      setRelayChainStatus("connecting");

      const endpointsToTry = POLKADOT.endpoints;
      let lastError: Error | null = null;

      for (const endpointUrl of endpointsToTry) {
        if (!mounted) return;

        try {
          console.log(`[Relay Chain] Attempting to connect to: ${endpointUrl}`);
          const provider = new WsProvider(endpointUrl);
          const apiInstance = await ApiPromise.create({ provider });
          await apiInstance.isReady;

          if (!mounted) {
            await apiInstance.disconnect();
            return;
          }

          console.log(`[Relay Chain] Successfully connected to: ${endpointUrl}`);
          setRelayChainApi(apiInstance);
          setRelayChainStatus("connected");
          return;
        } catch (e) {
          console.warn(`[Relay Chain] Failed to connect to ${endpointUrl}:`, e);
          lastError = e as Error;
        }
      }

      if (mounted) {
        console.error("[Relay Chain] Failed to connect to any endpoint", lastError);
        setRelayChainStatus("error");
      }
    };

    connectRelayChain();

    return () => {
      mounted = false;
      if (relayChainApi) {
        relayChainApi.disconnect().catch(console.error);
      }
    };
  }, []);

  const value = useMemo(
    () => ({
      assetHubApi,
      assetHubStatus,
      relayChainApi,
      relayChainStatus,
      // Legacy compatibility - api points to Asset Hub
      api: assetHubApi,
      status: assetHubStatus,
    }),
    [assetHubApi, assetHubStatus, relayChainApi, relayChainStatus]
  );

  return (
    <PolkadotContext.Provider value={value}>
      {children}
    </PolkadotContext.Provider>
  );
}
