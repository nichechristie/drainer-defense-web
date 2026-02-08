export const ENS_NAME_WRAPPER = "0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401";
export const ENS_PUBLIC_RESOLVER = "0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63";
export const FLASHBOTS_RPC = "https://rpc.flashbots.net";
export const FLASHBOTS_RELAY = "https://relay.flashbots.net";

export const DEFAULT_PRIORITY_FEE_GWEI = 10;
export const DEFAULT_MAX_FEE_GWEI = 100;

export const GAS_LIMITS: Record<string, bigint> = {
  eth_rescue: 21000n,
  ens_transfer: 120000n,
  ens_record: 80000n,
  erc20_rescue: 65000n,
  erc721_rescue: 100000n,
  approval_revoke: 65000n,
};

export const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum Mainnet",
  5: "Goerli",
  11155111: "Sepolia",
};

export const POLL_INTERVAL_MS = 300;

// Well-known ERC-20 tokens on mainnet for wallet scanning
export const KNOWN_TOKENS: { address: string; symbol: string; name: string; decimals: number }[] = [
  { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", symbol: "USDC", name: "USD Coin", decimals: 6 },
  { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", symbol: "USDT", name: "Tether USD", decimals: 6 },
  { address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
  { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", symbol: "DAI", name: "Dai Stablecoin", decimals: 18 },
  { address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", symbol: "WBTC", name: "Wrapped BTC", decimals: 8 },
  { address: "0x514910771AF9Ca656af840dff83E8264EcF986CA", symbol: "LINK", name: "Chainlink", decimals: 18 },
  { address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", symbol: "UNI", name: "Uniswap", decimals: 18 },
  { address: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9", symbol: "AAVE", name: "Aave", decimals: 18 },
];

// Number of recent TXs to analyze for drainer detection
export const DRAINER_TX_SCAN_COUNT = 20;
export const DRAINER_SWEEP_THRESHOLD_SECONDS = 15;

// Flashbots bundle retry config
export const BUNDLE_MAX_BLOCKS = 5;
