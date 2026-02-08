import type { JsonRpcProvider } from "ethers";
import { POLL_INTERVAL_MS } from "./constants";

export interface MonitorCallbacks {
  onBalanceCheck: (balance: bigint, pollCount: number) => void;
  onDepositDetected: (newBalance: bigint, increase: bigint) => void;
  onError: (error: string) => void;
}

export function startMonitoring(
  provider: JsonRpcProvider,
  address: string,
  baselineBalance: bigint,
  callbacks: MonitorCallbacks
): { stop: () => void } {
  let pollCount = 0;
  let stopped = false;

  const intervalId = setInterval(async () => {
    if (stopped) return;
    pollCount++;

    try {
      const current = await provider.getBalance(address);
      callbacks.onBalanceCheck(current, pollCount);

      const increase = current - baselineBalance;
      if (increase > 0n) {
        stopped = true;
        clearInterval(intervalId);
        callbacks.onDepositDetected(current, increase);
      }
    } catch (e: any) {
      callbacks.onError(e.message || "Balance check failed");
    }
  }, POLL_INTERVAL_MS);

  return {
    stop: () => {
      stopped = true;
      clearInterval(intervalId);
    },
  };
}
