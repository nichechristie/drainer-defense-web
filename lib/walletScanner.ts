import { JsonRpcProvider, Contract, formatUnits } from "ethers";
import { KNOWN_TOKENS } from "./constants";
import { ERC20_ABI } from "./abis";
import type { WalletScanResult, TokenBalance, NFTAsset, ActiveApproval } from "@/types/rescue";

export async function scanWallet(
  provider: JsonRpcProvider,
  address: string,
  onLog?: (msg: string) => void
): Promise<WalletScanResult> {
  const log = onLog || (() => {});

  log("Scanning ETH balance...");
  const ethBalance = await provider.getBalance(address);

  log(`ETH balance: ${formatUnits(ethBalance, 18)} ETH`);

  // Scan known ERC-20 tokens
  log("Scanning ERC-20 token balances...");
  const tokens: TokenBalance[] = [];
  const approvals: ActiveApproval[] = [];

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

  await Promise.all(tokenPromises);

  // Scan for active approvals on tokens with balances
  // Check common spender patterns (DEX routers, known exploiter contracts)
  log("Checking for active token approvals...");
  const commonSpenders = [
    { address: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", label: "Uniswap V2 Router" },
    { address: "0xE592427A0AEce92De3Edee1F18E0157C05861564", label: "Uniswap V3 Router" },
    { address: "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F", label: "SushiSwap Router" },
    { address: "0x1111111254EEB25477B68fb85Ed929f73A960582", label: "1inch V5" },
  ];

  for (const token of KNOWN_TOKENS) {
    const contract = new Contract(token.address, ERC20_ABI, provider);
    for (const spender of commonSpenders) {
      try {
        const allowance: bigint = await contract.allowance(address, spender.address);
        if (allowance > 0n) {
          approvals.push({
            tokenAddress: token.address,
            tokenSymbol: token.symbol,
            spender: spender.address,
            allowance: allowance.toString() === "115792089237316195423570985008687907853269984665640564039457584007913129639935"
              ? "Unlimited"
              : formatUnits(allowance, token.decimals),
          });
          log(`Active approval: ${token.symbol} -> ${spender.label} (${approvals[approvals.length - 1].allowance})`);
        }
      } catch {
        // Skip on error
      }
    }
  }

  // NFT scanning via ERC-721 Transfer events (limited scan)
  log("Scanning for NFTs (recent transfers)...");
  const nfts: NFTAsset[] = [];
  try {
    // Look for ERC-721 Transfer events TO this address in recent blocks
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 10000); // Last ~10k blocks

    const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
    const paddedAddress = "0x" + address.slice(2).toLowerCase().padStart(64, "0");

    const logs = await provider.getLogs({
      fromBlock,
      toBlock: currentBlock,
      topics: [
        transferTopic,
        null, // from (any)
        paddedAddress, // to = our address
      ],
    });

    // ERC-721 transfers have 3 indexed topics (transfer topic + from + to) and a tokenId in topic[3] or data
    for (const entry of logs) {
      if (entry.topics.length === 4) {
        // ERC-721 Transfer(from, to, tokenId) — tokenId is topic[3]
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
