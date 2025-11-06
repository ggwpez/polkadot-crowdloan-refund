import { decodeAddress, encodeAddress } from "@polkadot/util-crypto";

// Constants
export const POLKADOT_SS58_PREFIX = 0;
export const CACHE_DURATION_MS = 60 * 1000;
export const PAGE_SIZE = 500;
export const UPDATE_BATCH_SIZE = 10;
export const RELAY_BLOCK_TIME_SECONDS = 6.06; // 1% delay on RC timing
export const SECONDS_PER_DAY = 86400;
export const BLOCK_FETCH_INTERVAL_MS = 12000;

// Helper functions
export const normalizeAddress = (address: string): string | null => {
  try {
    const publicKey = decodeAddress(address.trim());
    return encodeAddress(publicKey, POLKADOT_SS58_PREFIX);
  } catch {
    return null;
  }
};

export const truncateAddress = (address: string): string =>
  `${address.slice(0, 8)}...${address.slice(-8)}`;

export const calculateUnlockDays = (
  unlockBlock: string,
  currentRelayBlock: number | null
): number | null => {
  if (!currentRelayBlock) return null;

  const blocksRemaining = Number(unlockBlock) - currentRelayBlock;
  if (blocksRemaining <= 0) return 0;

  return (blocksRemaining * RELAY_BLOCK_TIME_SECONDS) / SECONDS_PER_DAY;
};

export type FetchState =
  | { status: "idle" }
  | { status: "fetching"; currentCount: number }
  | { status: "complete"; totalCount: number };

export const getFetchStateLabel = (state: FetchState): string => {
  switch (state.status) {
    case "fetching":
      return `Entries: ${state.currentCount} (loading...)`;
    case "complete":
      return `Entries: ${state.totalCount}`;
    case "idle":
      return `Entries: 0`;
  }
};

export const formatBalance = (
  balance: string,
  tokenDecimals: number,
  tokenSymbol: string
): string => {
  const amount = Number(balance) / Math.pow(10, tokenDecimals);
  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${tokenSymbol}`;
};
