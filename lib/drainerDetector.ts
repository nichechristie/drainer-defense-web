import { JsonRpcProvider, formatUnits } from "ethers";
import { DRAINER_TX_SCAN_COUNT, DRAINER_SWEEP_THRESHOLD_SECONDS } from "./constants";
import type { DrainerAnalysis } from "@/types/rescue";

interface TxInfo {
  hash: string;
  from: string;
  to: string | null;
  value: bigint;
  blockNumber: number;
  timestamp: number;
  gasPrice: bigint;
}

export async function detectDrainer(
  provider: JsonRpcProvider,
  address: string,
  onLog?: (msg: string) => void
): Promise<DrainerAnalysis> {
  const log = onLog || (() => {});
  const addressLower = address.toLowerCase();

  log("Analyzing recent transaction patterns...");

  // Get recent transactions by scanning recent blocks for TXs involving this address
  const currentBlock = await provider.getBlockNumber();
  const txs: TxInfo[] = [];

  // Scan last ~100 blocks to find transactions
  const scanRange = 100;
  const startBlock = Math.max(0, currentBlock - scanRange);

  log(`Scanning blocks ${startBlock} to ${currentBlock}...`);

  for (let blockNum = currentBlock; blockNum >= startBlock && txs.length < DRAINER_TX_SCAN_COUNT; blockNum--) {
    try {
      const block = await provider.getBlock(blockNum, true);
      if (!block || !block.prefetchedTransactions) continue;

      for (const tx of block.prefetchedTransactions) {
        if (
          tx.from.toLowerCase() === addressLower ||
          (tx.to && tx.to.toLowerCase() === addressLower)
        ) {
          txs.push({
            hash: tx.hash,
            from: tx.from,
            to: tx.to,
            value: tx.value,
            blockNumber: block.number,
            timestamp: block.timestamp,
            gasPrice: tx.gasPrice || 0n,
          });
        }
      }
    } catch {
      // Skip blocks that fail to fetch
    }
  }

  log(`Found ${txs.length} recent transactions`);

  if (txs.length < 2) {
    return {
      riskLevel: "low",
      botDetected: false,
      sweepCount: 0,
      avgSweepTimeSeconds: null,
      botDestination: null,
      estimatedBotGasGwei: null,
      recommendation: "Not enough transaction history to analyze. Proceed with standard gas settings.",
    };
  }

  // Sort by timestamp ascending
  txs.sort((a, b) => a.timestamp - b.timestamp);

  // Identify deposit-then-sweep patterns
  // A "deposit" is incoming value, a "sweep" is outgoing value shortly after
  const sweeps: { depositTime: number; sweepTime: number; sweepTo: string; sweepGas: bigint }[] = [];

  for (let i = 0; i < txs.length - 1; i++) {
    const tx = txs[i];
    const isDeposit = tx.to?.toLowerCase() === addressLower && tx.value > 0n;

    if (isDeposit) {
      // Look for a sweep following this deposit
      for (let j = i + 1; j < txs.length; j++) {
        const nextTx = txs[j];
        const isSweep = nextTx.from.toLowerCase() === addressLower && nextTx.value > 0n;

        if (isSweep) {
          sweeps.push({
            depositTime: tx.timestamp,
            sweepTime: nextTx.timestamp,
            sweepTo: nextTx.to || "",
            sweepGas: nextTx.gasPrice,
          });
          break;
        }
      }
    }
  }

  log(`Detected ${sweeps.length} deposit-then-sweep patterns`);

  if (sweeps.length === 0) {
    return {
      riskLevel: "low",
      botDetected: false,
      sweepCount: 0,
      avgSweepTimeSeconds: null,
      botDestination: null,
      estimatedBotGasGwei: null,
      recommendation: "No drainer sweep patterns detected. Standard gas settings should work.",
    };
  }

  // Analyze sweep timing
  const sweepTimes = sweeps.map((s) => s.sweepTime - s.depositTime);
  const avgSweepTime = sweepTimes.reduce((a, b) => a + b, 0) / sweepTimes.length;
  const fastSweeps = sweepTimes.filter((t) => t <= DRAINER_SWEEP_THRESHOLD_SECONDS);

  // Check if sweeps go to same destination (bot wallet)
  const destinations = sweeps.map((s) => s.sweepTo.toLowerCase());
  const destCounts: Record<string, number> = {};
  for (const d of destinations) {
    destCounts[d] = (destCounts[d] || 0) + 1;
  }
  const topDest = Object.entries(destCounts).sort((a, b) => b[1] - a[1])[0];
  const sameDestRatio = topDest[1] / destinations.length;

  // Estimate bot gas strategy
  const gasValues = sweeps.map((s) => s.sweepGas).filter((g) => g > 0n);
  let estimatedGasGwei: number | null = null;
  if (gasValues.length > 0) {
    const maxGas = gasValues.reduce((a, b) => (a > b ? a : b));
    estimatedGasGwei = Number(formatUnits(maxGas, "gwei"));
  }

  // Determine risk level
  const botDetected = fastSweeps.length >= 2 || (fastSweeps.length >= 1 && sameDestRatio > 0.5);
  let riskLevel: "low" | "medium" | "high";
  let recommendation: string;

  if (fastSweeps.length >= 3 && sameDestRatio > 0.7) {
    riskLevel = "high";
    recommendation = `Aggressive drainer bot detected. Sweeps average ${avgSweepTime.toFixed(0)}s. Use Flashbots Atomic Bundle mode with priority fee > ${Math.ceil((estimatedGasGwei || 10) * 1.5)} gwei.`;
  } else if (botDetected) {
    riskLevel = "medium";
    recommendation = `Likely drainer bot. ${fastSweeps.length} fast sweep(s) detected. Use Flashbots Protect with priority fee > ${Math.ceil((estimatedGasGwei || 10) * 1.2)} gwei.`;
  } else {
    riskLevel = "low";
    recommendation = "Some sweep patterns detected but timing suggests manual operation. Standard Fast gas should suffice.";
  }

  log(`Risk level: ${riskLevel.toUpperCase()}`);

  return {
    riskLevel,
    botDetected,
    sweepCount: sweeps.length,
    avgSweepTimeSeconds: Math.round(avgSweepTime),
    botDestination: sameDestRatio > 0.5 ? topDest[0] : null,
    estimatedBotGasGwei: estimatedGasGwei ? Math.round(estimatedGasGwei) : null,
    recommendation,
  };
}
