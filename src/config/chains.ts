/**
 * Common Polkadot ecosystem chain configurations
 *
 * This file contains pre-configured settings for popular chains,
 * making it easy to switch networks or support multiple chains.
 *
 * @module config/chains
 */

export interface ChainConfig {
  id: string;
  name: string;
  displayName: string;
  endpoint: string; // Primary endpoint
  endpoints: string[]; // All available endpoints (including primary)
  tokenSymbol: string;
  tokenDecimals: number;
  ss58Format: number;
  explorerUrl: string;
  color: string;
  icon?: string;
  testnet?: boolean;
}

/**
 * Polkadot Mainnet Configuration
 */
export const POLKADOT: ChainConfig = {
  id: "polkadot",
  name: "Polkadot",
  displayName: "Polkadot Relay Chain",
  endpoint: "wss://rpc.ibp.network/polkadot",
  endpoints: [
    "wss://rpc.ibp.network/polkadot",
    "wss://rpc.polkadot.io",
    "wss://polkadot-rpc.dwellir.com",
    "wss://polkadot.public.curie.radiumblock.co/ws",
    "wss://polkadot-rpc-tn.dwellir.com",
  ],
  tokenSymbol: "DOT",
  tokenDecimals: 10,
  ss58Format: 0,
  explorerUrl: "https://polkadot.subscan.io",
  color: "#E6007A",
  testnet: false,
};

/**
 * Kusama Network Configuration
 */
export const KUSAMA: ChainConfig = {
  id: "kusama",
  name: "Kusama",
  displayName: "Kusama Network",
  endpoint: "wss://kusama-rpc.polkadot.io",
  endpoints: [
    "wss://kusama-rpc.polkadot.io",
    "wss://kusama-rpc.dwellir.com",
    "wss://kusama.public.curie.radiumblock.co/ws",
    "wss://kusama-rpc-tn.dwellir.com",
  ],
  tokenSymbol: "KSM",
  tokenDecimals: 12,
  ss58Format: 2,
  explorerUrl: "https://kusama.subscan.io",
  color: "#000000",
  testnet: false,
};

/**
 * Westend Testnet Configuration
 */
export const WESTEND: ChainConfig = {
  id: "westend",
  name: "Westend",
  displayName: "Westend Testnet",
  endpoint: "wss://westend-rpc.polkadot.io",
  endpoints: [
    "wss://westend-rpc.polkadot.io",
    "wss://westend-rpc.dwellir.com",
    "wss://westend.public.curie.radiumblock.co/ws",
  ],
  tokenSymbol: "WND",
  tokenDecimals: 12,
  ss58Format: 42,
  explorerUrl: "https://westend.subscan.io",
  color: "#DA68A7",
  testnet: true,
};

/**
 * Paseo Testnet Configuration
 */
export const PASEO: ChainConfig = {
  id: "paseo",
  name: "Paseo",
  displayName: "Paseo Testnet",
  endpoint: "wss://paseo.rpc.amforc.com",
  endpoints: ["wss://paseo.rpc.amforc.com", "wss://paseo-rpc.dwellir.com"],
  tokenSymbol: "PAS",
  tokenDecimals: 10,
  ss58Format: 42,
  explorerUrl: "https://paseo.subscan.io",
  color: "#6D3AEE",
  testnet: true,
};

/**
 * AssetHub Parachains - System parachains for asset management
 */
export const ASSETHUB_POLKADOT: ChainConfig = {
  id: "assethub-polkadot",
  name: "AssetHub Polkadot",
  displayName: "AssetHub Polkadot",
  endpoint: "wss://sys.ibp.network/asset-hub-polkadot",
  endpoints: [
    "wss://sys.ibp.network/asset-hub-polkadot",
    "wss://polkadot-asset-hub-rpc.polkadot.io",
    "wss://statemint-rpc.dwellir.com",
  ],
  tokenSymbol: "DOT",
  tokenDecimals: 10,
  ss58Format: 0,
  explorerUrl: "https://assethub-polkadot.subscan.io",
  color: "#E6007A",
  testnet: false,
};

export const ASSETHUB_KUSAMA: ChainConfig = {
  id: "assethub-kusama",
  name: "AssetHub Kusama",
  displayName: "AssetHub Kusama",
  endpoint: "wss://kusama-asset-hub-rpc.polkadot.io",
  endpoints: [
    "wss://kusama-asset-hub-rpc.polkadot.io",
    "wss://sys.ibp.network/asset-hub-kusama",
    "wss://statemine-rpc.dwellir.com",
  ],
  tokenSymbol: "KSM",
  tokenDecimals: 12,
  ss58Format: 2,
  explorerUrl: "https://assethub-kusama.subscan.io",
  color: "#000000",
  testnet: false,
};

export const ASSETHUB_WESTEND: ChainConfig = {
  id: "assethub-westend",
  name: "AssetHub Westend",
  displayName: "AssetHub Westend Testnet",
  endpoint: "wss://westend-asset-hub-rpc.polkadot.io",
  endpoints: [
    "wss://westend-asset-hub-rpc.polkadot.io",
    "wss://sys.ibp.network/asset-hub-westend",
  ],
  tokenSymbol: "WND",
  tokenDecimals: 12,
  ss58Format: 42,
  explorerUrl: "https://assethub-westend.subscan.io",
  color: "#DA68A7",
  testnet: true,
};

export const ASSETHUB_PASEO: ChainConfig = {
  id: "assethub-paseo",
  name: "AssetHub Paseo",
  displayName: "AssetHub Paseo Testnet",
  endpoint: "wss://paseo-asset-hub-rpc.polkadot.io",
  endpoints: [
    "wss://paseo-asset-hub-rpc.polkadot.io",
    "wss://sys.ibp.network/asset-hub-paseo",
  ],
  tokenSymbol: "PAS",
  tokenDecimals: 10,
  ss58Format: 42,
  explorerUrl: "https://assethub-paseo.subscan.io",
  color: "#6D3AEE",
  testnet: true,
};

/**
 * All available chain configurations
 * Includes relay chains and their AssetHub system parachains
 */
export const CHAINS: Record<string, ChainConfig> = {
  polkadot: POLKADOT,
  kusama: KUSAMA,
  westend: WESTEND,
  paseo: PASEO,
  "assethub-polkadot": ASSETHUB_POLKADOT,
  "assethub-kusama": ASSETHUB_KUSAMA,
  "assethub-westend": ASSETHUB_WESTEND,
  "assethub-paseo": ASSETHUB_PASEO,
};

/**
 * Get chain configuration by ID
 *
 * @param chainId - The chain identifier
 * @returns Chain configuration or undefined
 *
 * @example
 * ```ts
 * const config = getChainConfig('polkadot')
 * console.log(config.endpoint) // 'wss://rpc.polkadot.io'
 * ```
 */
export function getChainConfig(chainId: string): ChainConfig | undefined {
  return CHAINS[chainId];
}

/**
 * Get all mainnet chains (non-testnet)
 */
export function getMainnets(): ChainConfig[] {
  return Object.values(CHAINS).filter((chain) => !chain.testnet);
}

/**
 * Get all testnet chains
 */
export function getTestnets(): ChainConfig[] {
  return Object.values(CHAINS).filter((chain) => chain.testnet);
}

/**
 * Default chain - always AssetHub Polkadot
 */
export const DEFAULT_CHAIN_ID = "assethub-polkadot";

/**
 * Default chain configuration
 */
export const DEFAULT_CHAIN = ASSETHUB_POLKADOT;
