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

const ETHERSCAN_API_URLS: Record<number, string> = {
  1: "https://api.etherscan.io/api",
  5: "https://api-goerli.etherscan.io/api",
  11155111: "https://api-sepolia.etherscan.io/api",
};

async function fetchTxHistory(
  address: string,
  chainId: number
): Promise<TxInfo[]> {
  const baseUrl = ETHERSCAN_API_URLS[chainId];
  if (!baseUrl) return [];

  const url = `${baseUrl}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=${DRAINER_TX_SCAN_COUNT}&sort=desc`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== "1" || !Array.isArray(data.result)) return [];

  return data.result.map((tx: any) => ({
    hash: tx.hash,
    from: tx.from,
    to: tx.to || null,
    value: BigInt(tx.value),
    blockNumber: Number(tx.blockNumber),
    timestamp: Number(tx.timeStamp),
    gasPrice: BigInt(tx.gasPrice || "0"),
  }));
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export async function detectDrainer(
  provider: JsonRpcProvider,
  address: string,
  onLog?: (msg: string) => void
): Promise<DrainerAnalysis> {
  const log = onLog || (() => {});
  const addressLower = address.toLowerCase();

  const defaultResult: DrainerAnalysis = {
    riskLevel: "low",
    botDetected: false,
    sweepCount: 0,
    avgSweepTimeSeconds: null,
    botDestination: null,
    estimatedBotGasGwei: null,
    recommendation: "Not enough transaction history to analyze. Proceed with standard gas settings.",
  };

  log("Analyzing transaction history for drainer patterns...");

  let txs: TxInfo[] = [];

  // Try Etherscan API first (covers full history, single fast call)
  const chainId = Number((await provider.getNetwork()).chainId);
  if (ETHERSCAN_API_URLS[chainId]) {
    log("Fetching transaction history from Etherscan...");
    try {
      txs = await withTimeout(fetchTxHistory(address, chainId), 8000, []);
      if (txs.length > 0) {
        log(`Fetched ${txs.length} transactions from Etherscan`);
      }
    } catch {
      log("Etherscan fetch failed, falling back to block scan...");
    }
  }

  // Fallback: scan recent blocks if Etherscan didn't work
  if (txs.length === 0) {
    log("Scanning recent blocks...");
    const currentBlock = await provider.getBlockNumber();
    const scanRange = 10;
    const startBlock = Math.max(0, currentBlock - scanRange);

    const blockPromises = [];
    for (let blockNum = currentBlock; blockNum >= startBlock; blockNum--) {
      blockPromises.push(
        withTimeout(
          provider.getBlock(blockNum, true).catch(() => null),
          3000,
          null
        )
      );
    }

    const blocks = await Promise.all(blockPromises);

    for (const block of blocks) {
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
      if (txs.length >= DRAINER_TX_SCAN_COUNT) break;
    }
  }

  log(`Analyzing ${txs.length} transactions...`);

  if (txs.length < 2) return defaultResult;

  // Sort by timestamp ascending
  txs.sort((a, b) => a.timestamp - b.timestamp);

  // Identify deposit-then-sweep patterns
  // A "deposit" is incoming value, a "sweep" is outgoing value shortly after
  const sweeps: { depositTime: number; sweepTime: number; sweepTo: string; sweepGas: bigint }[] = [];

  for (let i = 0; i < txs.length - 1; i++) {
    const tx = txs[i];
    const isDeposit = tx.to?.toLowerCase() === addressLower && tx.value > 0n;

    if (isDeposit) {
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

  log(`Detected ${sweeps.length} deposit-then-sweep pattern(s)`);

  if (sweeps.length === 0) {
    // Even without sweep patterns, check if all outgoing TXs go to the same address (sweeper)
    const outgoing = txs.filter((t) => t.from.toLowerCase() === addressLower && t.value > 0n);
    if (outgoing.length >= 2) {
      const outDests = outgoing.map((t) => t.to?.toLowerCase() || "");
      const uniqueDests = new Set(outDests);
      if (uniqueDests.size === 1 && outDests[0]) {
        log("All outgoing ETH goes to same address — possible sweeper");
        return {
          riskLevel: "medium",
          botDetected: true,
          sweepCount: outgoing.length,
          avgSweepTimeSeconds: null,
          botDestination: outDests[0],
          estimatedBotGasGwei: null,
          recommendation: `All ${outgoing.length} outgoing transactions go to the same address. Likely a drainer. Use Flashbots Protect or Atomic Bundle mode.`,
        };
      }
    }

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

  const sweepTimes = sweeps.map((s) => s.sweepTime - s.depositTime);
  const avgSweepTime = sweepTimes.reduce((a, b) => a + b, 0) / sweepTimes.length;
  const fastSweeps = sweepTimes.filter((t) => t <= DRAINER_SWEEP_THRESHOLD_SECONDS);

  const destinations = sweeps.map((s) => s.sweepTo.toLowerCase());
  const destCounts: Record<string, number> = {};
  for (const d of destinations) {
    destCounts[d] = (destCounts[d] || 0) + 1;
  }
  const topDest = Object.entries(destCounts).sort((a, b) => b[1] - a[1])[0];
  const sameDestRatio = topDest[1] / destinations.length;

  const gasValues = sweeps.map((s) => s.sweepGas).filter((g) => g > 0n);
  let estimatedGasGwei: number | null = null;
  if (gasValues.length > 0) {
    const maxGas = gasValues.reduce((a, b) => (a > b ? a : b));
    estimatedGasGwei = Number(formatUnits(maxGas, "gwei"));
  }

  const botDetected = fastSweeps.length >= 1 || sameDestRatio > 0.5;
  let riskLevel: "low" | "medium" | "high";
  let recommendation: string;

  if (fastSweeps.length >= 3 && sameDestRatio > 0.7) {
    riskLevel = "high";
    recommendation = `Aggressive drainer bot detected. Sweeps average ${avgSweepTime.toFixed(0)}s. Use Flashbots Atomic Bundle mode with priority fee > ${Math.ceil((estimatedGasGwei || 10) * 1.5)} gwei.`;
  } else if (fastSweeps.length >= 2 || (fastSweeps.length >= 1 && sameDestRatio > 0.5)) {
    riskLevel = "high";
    recommendation = `Drainer bot confirmed. ${fastSweeps.length} fast sweep(s) averaging ${avgSweepTime.toFixed(0)}s. Use Flashbots Atomic Bundle with priority fee > ${Math.ceil((estimatedGasGwei || 10) * 1.5)} gwei.`;
  } else if (botDetected) {
    riskLevel = "medium";
    recommendation = `Likely drainer activity. ${sweeps.length} sweep pattern(s) detected. Use Flashbots Protect with priority fee > ${Math.ceil((estimatedGasGwei || 10) * 1.2)} gwei.`;
  } else {
    riskLevel = "low";
    recommendation = "Some sweep patterns detected but timing suggests manual operation. Standard Fast gas should suffice.";
  }

  log(`Risk level: ${riskLevel.toUpperCase()}`);
  if (topDest) {
    log(`Primary sweep destination: ${topDest[0].slice(0, 10)}...`);
  }

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
