import { JsonRpcProvider, Contract, formatUnits } from "ethers";
import { KNOWN_TOKENS } from "./constants";
import { ERC20_ABI } from "./abis";
import type { WalletScanResult, TokenBalance, NFTAsset, ActiveApproval } from "@/types/rescue";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export async function scanWallet(
  provider: JsonRpcProvider,
  address: string,
  onLog?: (msg: string) => void
): Promise<WalletScanResult> {
  const log = onLog || (() => {});

  log("Scanning ETH balance...");
  const ethBalance = await provider.getBalance(address);

  log(`ETH balance: ${formatUnits(ethBalance, 18)} ETH`);

  // Scan known ERC-20 tokens (parallel)
  log("Scanning ERC-20 token balances...");
  const tokens: TokenBalance[] = [];

  const tokenPromises = KNOWN_TOKENS.map(async (token) => {
    try {
      const contract = new Contract(token.address, ERC20_ABI, provider);
      const balance: bigint = await contract.balanceOf(address);
      if (balance > 0n) {
        const formatted = formatUnits(balance, token.decimals);
        tokens.push({
          address: token.address,
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          balance,
          balanceFormatted: formatted,
        });
        log(`Found ${formatted} ${token.symbol}`);
      }
    } catch {
      // Token contract may not exist on this network
    }
  });

  // Timeout token scan at 8 seconds
  await withTimeout(Promise.all(tokenPromises), 8000);

  // Scan for active approvals (all in parallel instead of nested loops)
  log("Checking for active token approvals...");
  const approvals: ActiveApproval[] = [];
  const commonSpenders = [
    { address: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", label: "Uniswap V2 Router" },
    { address: "0xE592427A0AEce92De3Edee1F18E0157C05861564", label: "Uniswap V3 Router" },
    { address: "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F", label: "SushiSwap Router" },
    { address: "0x1111111254EEB25477B68fb85Ed929f73A960582", label: "1inch V5" },
  ];

  const approvalPromises: Promise<void>[] = [];
  for (const token of KNOWN_TOKENS) {
    const contract = new Contract(token.address, ERC20_ABI, provider);
    for (const spender of commonSpenders) {
      approvalPromises.push(
        (async () => {
          try {
            const allowance: bigint = await contract.allowance(address, spender.address);
            if (allowance > 0n) {
              const formatted = allowance.toString() === "115792089237316195423570985008687907853269984665640564039457584007913129639935"
                ? "Unlimited"
                : formatUnits(allowance, token.decimals);
              approvals.push({
                tokenAddress: token.address,
                tokenSymbol: token.symbol,
                spender: spender.address,
                allowance: formatted,
              });
              log(`Active approval: ${token.symbol} -> ${spender.label} (${formatted})`);
            }
          } catch {
            // Skip on error
          }
        })()
      );
    }
  }

  // Timeout approval scan at 8 seconds
  await withTimeout(Promise.all(approvalPromises), 8000);

  // NFT scanning — reduced range (1000 blocks instead of 10000)
  log("Scanning for NFTs (recent transfers)...");
  const nfts: NFTAsset[] = [];
  try {
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 1000);

    const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
    const paddedAddress = "0x" + address.slice(2).toLowerCase().padStart(64, "0");

    const nftLogs = await withTimeout(
      provider.getLogs({
        fromBlock,
        toBlock: currentBlock,
        topics: [transferTopic, null, paddedAddress],
      }),
      5000
    );

    if (nftLogs) {
      for (const entry of nftLogs) {
        if (entry.topics.length === 4) {
          const tokenId = BigInt(entry.topics[3]).toString();
          const existing = nfts.find((n) => n.contractAddress === entry.address && n.tokenId === tokenId);
          if (!existing) {
            nfts.push({
              contractAddress: entry.address,
              tokenId,
              name: `NFT #${tokenId}`,
            });
          }
        }
      }
    }

    if (nfts.length > 0) {
      log(`Found ${nfts.length} potential NFT(s)`);
    }
  } catch {
    log("NFT scan limited — consider using an Alchemy RPC for full results");
  }

  log("Scan complete.");

  return {
    ethBalance,
    tokens,
    nfts,
    approvals,
    scannedAt: Date.now(),
  };
}
