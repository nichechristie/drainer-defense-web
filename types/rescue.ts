export type RescueAction = "eth_rescue" | "ens_transfer" | "ens_record";

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
