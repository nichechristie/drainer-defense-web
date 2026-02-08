import { Wallet, JsonRpcProvider, formatEther, formatUnits } from "ethers";
import { FLASHBOTS_RPC } from "./constants";
import type { TransactionTemplate, ExecutionResult } from "@/types/rescue";

export async function executeRescue(
  wallet: Wallet,
  template: TransactionTemplate,
  availableBalance: bigint,
  options: {
    useFlashbots: boolean;
    dryRun: boolean;
    retries?: number;
    onLog?: (msg: string) => void;
  }
): Promise<ExecutionResult> {
  const { useFlashbots, dryRun, retries = 2, onLog } = options;
  const log = onLog || (() => {});

  const tx: any = {
    to: template.to,
    value: template.value,
    gasLimit: template.gasLimit,
    maxPriorityFeePerGas: template.maxPriorityFeePerGas,
    maxFeePerGas: template.maxFeePerGas,
    type: 2,
  };
  if (template.data) tx.data = template.data;

  // For ETH rescue, compute actual send value
  if (template._action === "eth_rescue") {
    const gasCost = template.gasLimit * template.maxFeePerGas;
    const sendValue = availableBalance - gasCost;
    if (sendValue <= 0n) {
      return { txHash: null, status: "error", error: "Not enough ETH to cover gas", dryRun };
    }
    tx.value = sendValue;
    log(`Sending ${formatEther(sendValue)} ETH (gas budget: ${formatUnits(gasCost, "gwei")} gwei)`);
  }

  if (dryRun) {
    const signed = await wallet.signTransaction(tx);
    const fakeHash = "0x" + "00".repeat(31) + "01";
    log(`[DRY-RUN] Transaction signed (${signed.length} bytes). Would broadcast now.`);
    return { txHash: fakeHash, status: "success", error: null, dryRun: true };
  }

  // Use Flashbots provider if requested
  let broadcastWallet = wallet;
  if (useFlashbots) {
    const flashbotsProvider = new JsonRpcProvider(FLASHBOTS_RPC);
    broadcastWallet = new Wallet(wallet.privateKey, flashbotsProvider);
    log("Broadcasting via Flashbots Protect (private mempool)");
  } else {
    log("Broadcasting to public mempool with priority gas");
  }

  let lastError = "";
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await broadcastWallet.sendTransaction(tx);
      log(`TX broadcast: ${response.hash}`);
      log("Waiting for confirmation...");

      const receipt = await response.wait(1, 120_000);
      if (receipt) {
        const ok = receipt.status === 1;
        return {
          txHash: response.hash,
          status: ok ? "success" : "reverted",
          error: ok ? null : "Transaction reverted",
          dryRun: false,
          blockNumber: receipt.blockNumber,
        };
      }
    } catch (e: any) {
      lastError = e.message || String(e);
      log(`Attempt ${attempt}/${retries} failed: ${lastError}`);
      if (attempt < retries) await new Promise((r) => setTimeout(r, 500));
    }
  }

  return {
    txHash: null,
    status: "error",
    error: `Failed after ${retries} attempts: ${lastError}`,
    dryRun: false,
  };
}
