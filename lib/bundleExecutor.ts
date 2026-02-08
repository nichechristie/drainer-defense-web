import { Wallet, JsonRpcProvider, formatEther, formatUnits, keccak256, toUtf8Bytes } from "ethers";
import { FLASHBOTS_RELAY, BUNDLE_MAX_BLOCKS } from "./constants";
import type { TransactionTemplate, BundleResult } from "@/types/rescue";

export async function executeBundleRescue(
  compromisedWallet: Wallet,
  fundingWallet: Wallet,
  template: TransactionTemplate,
  fundingAmount: bigint,
  options: {
    dryRun: boolean;
    onLog?: (msg: string) => void;
  }
): Promise<BundleResult> {
  const { dryRun, onLog } = options;
  const log = onLog || (() => {});

  const provider = compromisedWallet.provider as JsonRpcProvider;
  if (!provider) {
    return { bundleHash: null, status: "error", error: "No provider on compromised wallet", targetBlock: 0, txHashes: [] };
  }

  // Build the funding TX: safe wallet sends ETH to compromised wallet
  const currentBlock = await provider.getBlockNumber();
  const feeData = await provider.getFeeData();
  const nonceFunding = await provider.getTransactionCount(fundingWallet.address);
  const nonceCompromised = await provider.getTransactionCount(compromisedWallet.address);

  const fundingTx: any = {
    to: compromisedWallet.address,
    value: fundingAmount,
    gasLimit: 21000n,
    maxPriorityFeePerGas: template.maxPriorityFeePerGas,
    maxFeePerGas: template.maxFeePerGas,
    type: 2,
    nonce: nonceFunding,
    chainId: (await provider.getNetwork()).chainId,
  };

  // Build the rescue TX from the compromised wallet
  const rescueTx: any = {
    to: template.to,
    value: template.value,
    gasLimit: template.gasLimit,
    maxPriorityFeePerGas: template.maxPriorityFeePerGas,
    maxFeePerGas: template.maxFeePerGas,
    type: 2,
    nonce: nonceCompromised,
    chainId: fundingTx.chainId,
  };
  if (template.data) rescueTx.data = template.data;

  // For ETH rescue, compute send value: funding amount - gas cost of rescue TX
  if (template._action === "eth_rescue") {
    const rescueGasCost = template.gasLimit * template.maxFeePerGas;
    const currentBalance = await provider.getBalance(compromisedWallet.address);
    const sendValue = currentBalance + fundingAmount - rescueGasCost;
    if (sendValue <= 0n) {
      return { bundleHash: null, status: "error", error: "Funding amount doesn't cover gas costs", targetBlock: currentBlock, txHashes: [] };
    }
    rescueTx.value = sendValue;
    log(`Bundle will sweep ${formatEther(sendValue)} ETH after gas`);
  }

  // Sign both transactions
  log("Signing funding transaction...");
  const signedFundingTx = await fundingWallet.signTransaction(fundingTx);
  log("Signing rescue transaction...");
  const signedRescueTx = await compromisedWallet.signTransaction(rescueTx);

  if (dryRun) {
    log("[DRY-RUN] Bundle built successfully:");
    log(`  TX 1 (fund): ${fundingWallet.address} -> ${compromisedWallet.address} (${formatEther(fundingAmount)} ETH)`);
    log(`  TX 2 (rescue): ${template._action} from compromised wallet`);
    log(`  Target block: ${currentBlock + 1}`);
    return {
      bundleHash: "0x" + "00".repeat(31) + "01",
      status: "success",
      error: null,
      targetBlock: currentBlock + 1,
      txHashes: ["0xdryrun_funding", "0xdryrun_rescue"],
    };
  }

  // Submit bundle to Flashbots relay for multiple consecutive blocks
  for (let offset = 1; offset <= BUNDLE_MAX_BLOCKS; offset++) {
    const targetBlock = currentBlock + offset;
    const targetBlockHex = "0x" + targetBlock.toString(16);

    log(`Submitting bundle for block ${targetBlock}...`);

    const bundleParams = {
      txs: [signedFundingTx, signedRescueTx],
      blockNumber: targetBlockHex,
    };

    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_sendBundle",
      params: [bundleParams],
    });

    // Sign the request body with the funding wallet for Flashbots authentication
    const signature = await fundingWallet.signMessage(keccak256(toUtf8Bytes(body)));

    try {
      const response = await fetch(FLASHBOTS_RELAY, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Flashbots-Signature": `${fundingWallet.address}:${signature}`,
        },
        body,
      });

      const result = await response.json();

      if (result.error) {
        log(`Block ${targetBlock}: relay error — ${result.error.message}`);
        continue;
      }

      const bundleHash = result.result?.bundleHash;
      if (bundleHash) {
        log(`Bundle accepted for block ${targetBlock}: ${bundleHash}`);

        // Wait for the target block
        log(`Waiting for block ${targetBlock}...`);
        let included = false;
        for (let wait = 0; wait < 30; wait++) {
          await new Promise((r) => setTimeout(r, 1000));
          const latest = await provider.getBlockNumber();
          if (latest >= targetBlock) {
            // Check if our TX was included
            try {
              const receipt = await provider.getTransactionReceipt(
                keccak256(signedRescueTx)
              );
              if (receipt) {
                included = true;
                log(`Bundle included in block ${receipt.blockNumber}!`);
                return {
                  bundleHash,
                  status: "success",
                  error: null,
                  targetBlock,
                  txHashes: [signedFundingTx.slice(0, 66), signedRescueTx.slice(0, 66)],
                };
              }
            } catch {
              // TX not found yet
            }
            break;
          }
        }

        if (!included && offset < BUNDLE_MAX_BLOCKS) {
          log(`Not included in block ${targetBlock}, retrying next block...`);
        }
      }
    } catch (e: any) {
      log(`Bundle submission error: ${e.message}`);
    }
  }

  return {
    bundleHash: null,
    status: "not_included",
    error: `Bundle not included after ${BUNDLE_MAX_BLOCKS} blocks`,
    targetBlock: currentBlock + BUNDLE_MAX_BLOCKS,
    txHashes: [],
  };
}
