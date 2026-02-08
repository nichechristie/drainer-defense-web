export type RescueAction =
  | "eth_rescue"
  | "ens_transfer"
  | "ens_record"
  | "erc20_rescue"
  | "erc721_rescue"
  | "approval_revoke";

export interface GasConfig {
  maxPriorityFeePerGas: bigint;
  maxFeePerGas: bigint;
}

export interface TransactionTemplate {
  to: string;
  data?: string;
  value: bigint;
  gasLimit: bigint;
  maxPriorityFeePerGas: bigint;
  maxFeePerGas: bigint;
  type: 2;
  _action: RescueAction;
  _label?: string;
}

export type MonitorStatus =
  | "idle"
  | "monitoring"
  | "deposit_detected"
  | "executing"
  | "confirmed"
  | "failed"
  | "cancelled";

export interface ExecutionResult {
  txHash: string | null;
  status: "success" | "reverted" | "error";
  error: string | null;
  dryRun: boolean;
  blockNumber?: number;
}

export type DrainerRiskLevel = "low" | "medium" | "high";

export interface DrainerAnalysis {
  riskLevel: DrainerRiskLevel;
  botDetected: boolean;
  sweepCount: number;
  avgSweepTimeSeconds: number | null;
  botDestination: string | null;
  estimatedBotGasGwei: number | null;
  recommendation: string;
}

export interface TokenBalance {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: bigint;
  balanceFormatted: string;
}

export interface NFTAsset {
  contractAddress: string;
  tokenId: string;
  name: string;
}

export interface ActiveApproval {
  tokenAddress: string;
  tokenSymbol: string;
  spender: string;
  allowance: string;
}

export interface WalletScanResult {
  ethBalance: bigint;
  tokens: TokenBalance[];
  nfts: NFTAsset[];
  approvals: ActiveApproval[];
  scannedAt: number;
}

export interface BundleResult {
  bundleHash: string | null;
  status: "success" | "not_included" | "error";
  error: string | null;
  targetBlock: number;
  txHashes: string[];
}
