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

// Para ID mapping interface
export interface ParaIdMapping {
  display: string;
  tooltip?: string;
}

// Para ID swap group - represents a set of Para IDs that have been swapped together
interface ParaIdSwapGroup {
  ids: string[];
  tooltip: string;
}

// Para ID swap groups - add more entries as needed
const PARA_ID_SWAP_GROUPS: ParaIdSwapGroup[] = [
  {
    ids: ["2043", "3360"],
    tooltip: "NeuroWeb lease swap, see https://hackmd.io/@ePxWAFa1TbKm0U5Ym3IqgQ/Bk3XiAmlC",
  },
  {
    ids: ["2030", "3356"],
    tooltip: "Bifrost lease swap, see https://polkadot.polkassembly.io/referenda/524",
  },
  {
    ids: ["3417", "3340"],
    tooltip: "Para ID swap: 3417 ↔ 3340 (2025-07-18)",
  },
  {
    ids: ["3359", "2039"],
    tooltip: "Para ID swap: 3359 ↔ 2039 (2024-10-20)",
  },
  {
    ids: ["3378", "2019", "2052"],
    tooltip: "Para ID swaps: 3378 ↔ 2019 (2024-10-19), 2052 ↔ 2019 (2024-01-11)",
  },
  {
    ids: ["2008", "3375"],
    tooltip: "Para ID swap: 2008 ↔ 3375 (2024-08-08)",
  },
  {
    ids: ["2086", "3358"],
    tooltip: "Para ID swap: 2086 ↔ 3358 (2024-07-19)",
  },
  {
    ids: ["2046", "2003"],
    tooltip: "Para ID swap: 2046 ↔ 2003 (2024-04-19)",
  },
  {
    ids: ["2040", "2097"],
    tooltip: "Para ID swap: 2040 ↔ 2097 (2024-04-09)",
  },
  {
    ids: ["3334", "3369"],
    tooltip: "Para ID swap: 3334 ↔ 3369 (2024-03-20)",
  },
  {
    ids: ["3350", "2012", "3351", "2026"],
    tooltip: "Para ID swaps: 3350 ↔ 2012 (2024-01-16), 3351 ↔ 2012 & 2026 (2023-10-24)",
  },
  {
    ids: ["2031", "3353"],
    tooltip: "Para ID swap: 2031 ↔ 3353 (2023-11-05)",
  },
  {
    ids: ["3342", "2004"],
    tooltip: "Para ID swap: 3342 ↔ 2004 (2023-10-12)",
  },
];

// Build lookup map from swap groups
const buildParaIdMap = (): Record<string, ParaIdMapping> => {
  const map: Record<string, ParaIdMapping> = {};

  for (const group of PARA_ID_SWAP_GROUPS) {
    const display = group.ids.join(" / ");
    for (const id of group.ids) {
      map[id] = {
        display,
        tooltip: group.tooltip,
      };
    }
  }

  return map;
};

// Para ID lookup map - generated from swap groups
export const PARA_ID_MAP: Record<string, ParaIdMapping> = buildParaIdMap();

// Format Para ID with optional mapping
export const formatParaId = (paraId: string): ParaIdMapping => {
  const mapping = PARA_ID_MAP[paraId];
  return mapping || { display: paraId };
};
