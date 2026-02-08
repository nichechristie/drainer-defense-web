export const ENS_NAME_WRAPPER = "0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401";
export const ENS_PUBLIC_RESOLVER = "0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63";
export const FLASHBOTS_RPC = "https://rpc.flashbots.net";

export const DEFAULT_PRIORITY_FEE_GWEI = 10;
export const DEFAULT_MAX_FEE_GWEI = 100;

export const GAS_LIMITS: Record<string, bigint> = {
  eth_rescue: 21000n,
  ens_transfer: 120000n,
  ens_record: 80000n,
};

export const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum Mainnet",
  5: "Goerli",
  11155111: "Sepolia",
};

export const POLL_INTERVAL_MS = 300;
