"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Shield,
  Settings,
  Zap,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertTriangle,
  Copy,
  ExternalLink,
  Radio,
  Square,
  FileText,
  Edit3,
  Loader2,
  Coins,
  Image,
  Ban,
  Search,
  Box,
  Activity,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import { JsonRpcProvider, Wallet, formatEther, parseUnits, isAddress } from "ethers";
import {
  buildEthRescue,
  buildEnsTransfer,
  buildEnsRecordUpdate,
  buildErc20Rescue,
  buildErc721Rescue,
  buildApprovalRevoke,
} from "@/lib/transactionBuilder";
import { startMonitoring } from "@/lib/walletMonitor";
import { executeRescue } from "@/lib/rescueExecutor";
import { scanWallet } from "@/lib/walletScanner";
import { detectDrainer } from "@/lib/drainerDetector";
import { executeBundleRescue } from "@/lib/bundleExecutor";
import { CHAIN_NAMES, DEFAULT_PRIORITY_FEE_GWEI, DEFAULT_MAX_FEE_GWEI, GAS_LIMITS } from "@/lib/constants";
import type {
  RescueAction,
  TransactionTemplate,
  ExecutionResult,
  MonitorStatus,
  WalletScanResult,
  DrainerAnalysis,
  BundleResult,
} from "@/types/rescue";

/* ------------------------------------------------------------------ */
/*  Instructions Guide                                                 */
/* ------------------------------------------------------------------ */

function InstructionsGuide() {
  const [open, setOpen] = useState(true);

  return (
    <div className="mb-8 bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border border-violet-500/20 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-6 py-4 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <HelpCircle className="w-5 h-5 text-violet-400" />
          <span className="text-white font-semibold">How to Use This Tool</span>
        </div>
        {open ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-5">
          {/* What this tool does */}
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-violet-400 text-sm font-medium mb-2">What does this tool do?</p>
            <p className="text-gray-400 text-sm leading-relaxed">
              When a wallet is compromised, drainer bots watch it and steal any ETH you send to it.
              This tool pre-builds a rescue transaction and broadcasts it <strong className="text-white">the instant</strong> ETH
              arrives — faster than the drainer bot can react. It can also rescue tokens, NFTs, and revoke dangerous approvals.
            </p>
          </div>

          {/* Step by step */}
          <div className="space-y-3">
            <p className="text-white text-sm font-medium">Step-by-step:</p>

            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-violet-400 text-xs font-bold">1</span>
              </div>
              <div>
                <p className="text-white text-sm font-medium">Connect your compromised wallet</p>
                <p className="text-gray-500 text-xs mt-0.5">
                  Pick a free RPC (click one of the buttons) or paste your own Alchemy/Infura URL.
                  Then paste the <strong className="text-gray-300">private key of the compromised wallet</strong> (the one being drained).
                  The tool will scan it for assets and check for drainer bot activity.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-violet-400 text-xs font-bold">2</span>
              </div>
              <div>
                <p className="text-white text-sm font-medium">Choose what to rescue</p>
                <p className="text-gray-500 text-xs mt-0.5">
                  Pick an action: <strong className="text-gray-300">ETH Rescue</strong> (sweep remaining ETH),{" "}
                  <strong className="text-gray-300">Token Rescue</strong> (save USDC, WETH, etc.),{" "}
                  <strong className="text-gray-300">NFT Rescue</strong>,{" "}
                  <strong className="text-gray-300">Revoke Approval</strong> (stop drainers from using your allowances), or{" "}
                  <strong className="text-gray-300">ENS Transfer/Record</strong>.
                  Enter the <strong className="text-gray-300">safe wallet address</strong> where rescued assets should go.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-violet-400 text-xs font-bold">3</span>
              </div>
              <div>
                <p className="text-white text-sm font-medium">Arm &amp; execute</p>
                <p className="text-gray-500 text-xs mt-0.5">
                  Click <strong className="text-gray-300">ARM RESCUE BOT</strong>. The tool watches the compromised wallet.
                  When ETH arrives (you send gas from another wallet), it instantly broadcasts the rescue transaction.
                  For testing, enable <strong className="text-gray-300">Dry Run</strong> — it simulates everything without touching the blockchain.
                </p>
              </div>
            </div>
          </div>

          {/* Key concepts */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-cyan-400 text-xs font-medium mb-1">Dry Run Mode</p>
              <p className="text-gray-500 text-xs">Test everything safely. No real transactions are sent. Turn this on first!</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-violet-400 text-xs font-medium mb-1">Flashbots Protect</p>
              <p className="text-gray-500 text-xs">Sends your TX through a private channel so drainer bots can't see it in the mempool.</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-orange-400 text-xs font-medium mb-1">Atomic Bundle</p>
              <p className="text-gray-500 text-xs">Bundles "send gas" + "rescue" into one block. The drainer literally cannot front-run this. Requires a second (safe) wallet key.</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-red-400 text-xs font-medium mb-1">Gas Priority</p>
              <p className="text-gray-500 text-xs">Higher gas = your TX gets mined first. Use "Aggressive" if the bot detection shows HIGH risk.</p>
            </div>
          </div>

          {/* Quick start */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
            <p className="text-emerald-400 text-sm font-medium mb-2">Quick Start (Test Mode)</p>
            <ol className="text-gray-400 text-xs space-y-1 list-decimal list-inside">
              <li>Click a <strong className="text-gray-200">free RPC button</strong> below (e.g. Cloudflare)</li>
              <li>Paste the <strong className="text-gray-200">compromised wallet's private key</strong></li>
              <li>Click <strong className="text-gray-200">Connect &amp; Scan</strong></li>
              <li>Select <strong className="text-gray-200">ETH Rescue</strong> and enter your safe address</li>
              <li>Turn on <strong className="text-gray-200">Dry Run</strong></li>
              <li>Click <strong className="text-gray-200">ARM RESCUE BOT</strong> — watch it simulate the rescue</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step Indicator                                                     */
/* ------------------------------------------------------------------ */

function StepIndicator({ step }: { step: number }) {
  const steps = [
    { n: 1, label: "Connect", icon: Shield },
    { n: 2, label: "Configure", icon: Settings },
    { n: 3, label: "Execute", icon: Zap },
  ];
  return (
    <div className="flex items-center justify-center gap-2 mb-10">
      {steps.map((s, i) => {
        const Icon = s.icon;
        const active = step === s.n;
        const done = step > s.n;
        return (
          <div key={s.n} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
                active
                  ? "bg-gradient-to-r from-violet-600 to-cyan-600 text-white"
                  : done
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-white/5 text-gray-500 border border-white/10"
              }`}
            >
              {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-8 h-px ${done ? "bg-green-500/50" : "bg-white/10"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 1: Connect                                                    */
/* ------------------------------------------------------------------ */

interface ConnectData {
  provider: JsonRpcProvider;
  wallet: Wallet;
  address: string;
  balance: bigint;
  chainId: number;
}

function StepConnect({
  onConnected,
}: {
  onConnected: (d: ConnectData, scan: WalletScanResult | null, analysis: DrainerAnalysis | null) => void;
}) {
  const [rpcUrl, setRpcUrl] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  const connect = async () => {
    setError("");
    setConnecting(true);
    setStatusMsg("Connecting to RPC...");
    try {
      const provider = new JsonRpcProvider(rpcUrl);
      const network = await provider.getNetwork();
      const key = privateKey.startsWith("0x") ? privateKey : "0x" + privateKey;
      const wallet = new Wallet(key, provider);
      const balance = await provider.getBalance(wallet.address);

      const connectData: ConnectData = {
        provider,
        wallet,
        address: wallet.address,
        balance,
        chainId: Number(network.chainId),
      };

      // Run wallet scan and drainer detection in parallel
      setStatusMsg("Scanning wallet for assets & approvals...");
      let scanResult: WalletScanResult | null = null;
      let drainerResult: DrainerAnalysis | null = null;

      try {
        const scanPromise = Promise.all([
          scanWallet(provider, wallet.address, (msg) => setStatusMsg(msg)),
          detectDrainer(provider, wallet.address, (msg) => setStatusMsg(msg)),
        ]);
        // Global 15-second timeout so the UI never gets stuck
        const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 15000));
        const result = await Promise.race([scanPromise, timeout]);
        if (result) {
          scanResult = result[0];
          drainerResult = result[1];
        }
      } catch {
        // Scanner/detector failures are non-fatal
      }

      onConnected(connectData, scanResult, drainerResult);
    } catch (e: any) {
      if (e.message?.includes("invalid private key") || e.message?.includes("invalid arrayify")) {
        setError("Invalid private key format");
      } else if (e.message?.includes("could not detect network") || e.message?.includes("ECONNREFUSED")) {
        setError("Cannot connect to RPC endpoint. Check the URL.");
      } else {
        setError(e.message || "Connection failed");
      }
    } finally {
      setConnecting(false);
      setStatusMsg("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Security notice */}
      <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5 flex gap-3">
        <Shield className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-green-400 font-medium text-sm">Client-Side Only</p>
          <p className="text-green-400/70 text-sm mt-1">
            Your private key never leaves this browser. All transaction signing happens locally on your device.
          </p>
        </div>
      </div>

      {/* RPC URL */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">Ethereum RPC URL</label>
        <input
          type="url"
          value={rpcUrl}
          onChange={(e) => setRpcUrl(e.target.value)}
          placeholder="https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition font-mono text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">Use an Alchemy, Infura, or QuickNode endpoint</p>
        <div className="flex flex-wrap gap-2 mt-2">
          {[
            { label: "Cloudflare", url: "https://cloudflare-eth.com" },
            { label: "PublicNode", url: "https://ethereum-rpc.publicnode.com" },
            { label: "Ankr", url: "https://rpc.ankr.com/eth" },
            { label: "1RPC", url: "https://1rpc.io/eth" },
          ].map((rpc) => (
            <button
              key={rpc.label}
              type="button"
              onClick={() => setRpcUrl(rpc.url)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                rpcUrl === rpc.url
                  ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                  : "bg-white/5 text-gray-500 border border-white/10 hover:border-white/20 hover:text-gray-300"
              }`}
            >
              {rpc.label}
            </button>
          ))}
          <span className="text-xs text-gray-600 self-center ml-1">Free RPCs</span>
        </div>
      </div>

      {/* Private key */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">Compromised Wallet Private Key</label>
        <div className="relative">
          <input
            type={showKey ? "text" : "password"}
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
            placeholder="0x..."
            autoComplete="off"
            className="w-full bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 transition font-mono text-sm"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
          >
            {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-xs text-red-400/60 mt-1">This is the wallet the drainer bot is watching</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {statusMsg && (
        <div className="flex items-center gap-2 text-sm text-cyan-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          {statusMsg}
        </div>
      )}

      <button
        onClick={connect}
        disabled={!rpcUrl || !privateKey || connecting}
        className="w-full bg-gradient-to-r from-violet-600 to-cyan-600 text-white py-3 rounded-xl font-medium hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {connecting ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Scanning Wallet...</>
        ) : (
          <><Shield className="w-5 h-5" /> Connect &amp; Scan Wallet</>
        )}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Wallet Scan Results Panel                                          */
/* ------------------------------------------------------------------ */

function ScanResultsPanel({
  scan,
  analysis,
}: {
  scan: WalletScanResult | null;
  analysis: DrainerAnalysis | null;
}) {
  if (!scan && !analysis) return null;

  return (
    <div className="space-y-4 mb-6">
      {/* Drainer Detection Warning */}
      {analysis && analysis.riskLevel !== "low" && (
        <div
          className={`border rounded-2xl p-5 flex gap-3 ${
            analysis.riskLevel === "high"
              ? "bg-red-500/10 border-red-500/30"
              : "bg-yellow-500/10 border-yellow-500/30"
          }`}
        >
          <Activity
            className={`w-5 h-5 mt-0.5 shrink-0 ${
              analysis.riskLevel === "high" ? "text-red-400" : "text-yellow-400"
            }`}
          />
          <div>
            <p
              className={`font-medium text-sm ${
                analysis.riskLevel === "high" ? "text-red-400" : "text-yellow-400"
              }`}
            >
              Drainer Bot Detected — {analysis.riskLevel.toUpperCase()} Risk
            </p>
            <p className="text-gray-400 text-sm mt-1">{analysis.recommendation}</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-3 text-xs">
              {analysis.sweepCount > 0 && (
                <>
                  <span className="text-gray-500">Sweep patterns:</span>
                  <span className="text-white">{analysis.sweepCount}</span>
                </>
              )}
              {analysis.avgSweepTimeSeconds !== null && (
                <>
                  <span className="text-gray-500">Avg sweep time:</span>
                  <span className="text-white">{analysis.avgSweepTimeSeconds}s</span>
                </>
              )}
              {analysis.estimatedBotGasGwei !== null && (
                <>
                  <span className="text-gray-500">Bot gas estimate:</span>
                  <span className="text-white">{analysis.estimatedBotGasGwei} gwei</span>
                </>
              )}
              {analysis.botDestination && (
                <>
                  <span className="text-gray-500">Bot destination:</span>
                  <span className="text-white font-mono">{analysis.botDestination.slice(0, 10)}...</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {analysis && analysis.riskLevel === "low" && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5 flex gap-3">
          <Activity className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-green-400 font-medium text-sm">No Active Drainer Bot Detected</p>
            <p className="text-green-400/70 text-sm mt-1">{analysis.recommendation}</p>
          </div>
        </div>
      )}

      {/* Asset Inventory */}
      {scan && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-4 h-4 text-cyan-400" />
            <h3 className="text-white font-semibold text-sm">Wallet Asset Scan</h3>
          </div>

          <div className="space-y-3">
            {/* ETH */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">ETH Balance</span>
              <span className="text-white font-mono">{formatEther(scan.ethBalance)} ETH</span>
            </div>

            {/* Tokens */}
            {scan.tokens.length > 0 && (
              <div>
                <p className="text-gray-500 text-xs mb-2">ERC-20 Tokens</p>
                {scan.tokens.map((t) => (
                  <div key={t.address} className="flex items-center justify-between text-sm py-1">
                    <span className="text-gray-400 flex items-center gap-2">
                      <Coins className="w-3 h-3" /> {t.symbol}
                    </span>
                    <span className="text-white font-mono">{t.balanceFormatted}</span>
                  </div>
                ))}
              </div>
            )}

            {/* NFTs */}
            {scan.nfts.length > 0 && (
              <div>
                <p className="text-gray-500 text-xs mb-2">NFTs Found</p>
                {scan.nfts.map((n) => (
                  <div key={`${n.contractAddress}-${n.tokenId}`} className="flex items-center justify-between text-sm py-1">
                    <span className="text-gray-400 flex items-center gap-2">
                      <Image className="w-3 h-3" /> {n.name}
                    </span>
                    <span className="text-white font-mono text-xs">{n.contractAddress.slice(0, 8)}...</span>
                  </div>
                ))}
              </div>
            )}

            {/* Active Approvals */}
            {scan.approvals.length > 0 && (
              <div>
                <p className="text-red-400/80 text-xs mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Active Approvals (should revoke!)
                </p>
                {scan.approvals.map((a, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1">
                    <span className="text-gray-400">
                      {a.tokenSymbol} → {a.spender.slice(0, 8)}...
                    </span>
                    <span className="text-red-400 font-mono text-xs">{a.allowance}</span>
                  </div>
                ))}
              </div>
            )}

            {scan.tokens.length === 0 && scan.nfts.length === 0 && scan.approvals.length === 0 && (
              <p className="text-gray-500 text-sm">No tokens, NFTs, or active approvals found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 2: Configure                                                  */
/* ------------------------------------------------------------------ */

interface RescueConfig {
  action: RescueAction;
  safeAddress: string;
  ensName: string;
  recordKey: string;
  recordValue: string;
  tokenAddress: string;
  tokenSymbol: string;
  tokenAmount: string;
  tokenDecimals: number;
  nftContractAddress: string;
  nftTokenId: string;
  revokeTokenAddress: string;
  revokeTokenSymbol: string;
  revokeSpender: string;
  priorityFee: number;
  maxFee: number;
  useFlashbots: boolean;
  useBundleMode: boolean;
  fundingPrivateKey: string;
  fundingAmount: string;
  dryRun: boolean;
}

function StepConfigure({
  walletAddress,
  scan,
  analysis,
  onConfigured,
  onBack,
}: {
  walletAddress: string;
  scan: WalletScanResult | null;
  analysis: DrainerAnalysis | null;
  onConfigured: (config: RescueConfig, template: TransactionTemplate) => void;
  onBack: () => void;
}) {
  const [action, setAction] = useState<RescueAction>("eth_rescue");
  const [safeAddress, setSafeAddress] = useState("");
  const [ensName, setEnsName] = useState("");
  const [recordKey, setRecordKey] = useState("");
  const [recordValue, setRecordValue] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [tokenAmount, setTokenAmount] = useState("");
  const [tokenDecimals, setTokenDecimals] = useState(18);
  const [nftContractAddress, setNftContractAddress] = useState("");
  const [nftTokenId, setNftTokenId] = useState("");
  const [revokeTokenAddress, setRevokeTokenAddress] = useState("");
  const [revokeTokenSymbol, setRevokeTokenSymbol] = useState("");
  const [revokeSpender, setRevokeSpender] = useState("");
  const [priorityFee, setPriorityFee] = useState(DEFAULT_PRIORITY_FEE_GWEI);
  const [maxFee, setMaxFee] = useState(DEFAULT_MAX_FEE_GWEI);
  const [useFlashbots, setUseFlashbots] = useState(false);
  const [useBundleMode, setUseBundleMode] = useState(false);
  const [fundingPrivateKey, setFundingPrivateKey] = useState("");
  const [fundingAmount, setFundingAmount] = useState("0.01");
  const [showFundingKey, setShowFundingKey] = useState(false);
  const [dryRun, setDryRun] = useState(false);
  const [error, setError] = useState("");

  const actions: { key: RescueAction; label: string; desc: string; icon: any }[] = [
    { key: "eth_rescue", label: "ETH Rescue", desc: "Sweep ETH to a safe wallet", icon: Shield },
    { key: "erc20_rescue", label: "Token Rescue", desc: "Rescue ERC-20 tokens (USDC, WETH, etc.)", icon: Coins },
    { key: "erc721_rescue", label: "NFT Rescue", desc: "Transfer NFTs to safety", icon: Image },
    { key: "ens_transfer", label: "ENS Transfer", desc: "Transfer ENS name ownership", icon: FileText },
    { key: "ens_record", label: "ENS Record", desc: "Update ENS text record", icon: Edit3 },
    { key: "approval_revoke", label: "Revoke Approval", desc: "Revoke malicious token approvals", icon: Ban },
  ];

  const gasPresets = [
    { label: "Normal", p: 3, m: 50 },
    { label: "Fast", p: 10, m: 100 },
    { label: "Aggressive", p: 25, m: 200 },
  ];

  // Auto-fill from scan results
  const fillFromToken = (addr: string) => {
    if (!scan) return;
    const token = scan.tokens.find((t) => t.address === addr);
    if (token) {
      setTokenAddress(token.address);
      setTokenSymbol(token.symbol);
      setTokenAmount(token.balanceFormatted);
      setTokenDecimals(token.decimals);
    }
  };

  const fillFromApproval = (idx: number) => {
    if (!scan) return;
    const approval = scan.approvals[idx];
    if (approval) {
      setRevokeTokenAddress(approval.tokenAddress);
      setRevokeTokenSymbol(approval.tokenSymbol);
      setRevokeSpender(approval.spender);
    }
  };

  const fillFromNft = (contractAddr: string, tokenId: string) => {
    setNftContractAddress(contractAddr);
    setNftTokenId(tokenId);
  };

  const needsSafeAddress = ["eth_rescue", "erc20_rescue", "erc721_rescue", "ens_transfer"].includes(action);

  const submit = () => {
    setError("");

    // Validate
    if (needsSafeAddress && !safeAddress) {
      setError("Safe destination address is required");
      return;
    }
    if (safeAddress && !isAddress(safeAddress)) {
      setError("Invalid safe address format");
      return;
    }
    if ((action === "ens_transfer" || action === "ens_record") && !ensName) {
      setError("ENS name is required");
      return;
    }
    if (action === "ens_record" && (!recordKey || !recordValue)) {
      setError("Record key and value are required");
      return;
    }
    if (action === "erc20_rescue" && (!tokenAddress || !tokenAmount)) {
      setError("Token address and amount are required");
      return;
    }
    if (action === "erc20_rescue" && !isAddress(tokenAddress)) {
      setError("Invalid token contract address");
      return;
    }
    if (action === "erc721_rescue" && (!nftContractAddress || !nftTokenId)) {
      setError("NFT contract address and token ID are required");
      return;
    }
    if (action === "erc721_rescue" && !isAddress(nftContractAddress)) {
      setError("Invalid NFT contract address");
      return;
    }
    if (action === "approval_revoke" && (!revokeTokenAddress || !revokeSpender)) {
      setError("Token address and spender address are required");
      return;
    }
    if (useBundleMode && !fundingPrivateKey) {
      setError("Funding wallet private key is required for bundle mode");
      return;
    }

    const gas = {
      maxPriorityFeePerGas: parseUnits(String(priorityFee), "gwei"),
      maxFeePerGas: parseUnits(String(maxFee), "gwei"),
    };

    let template: TransactionTemplate;
    try {
      if (action === "eth_rescue") {
        template = buildEthRescue(safeAddress, gas);
      } else if (action === "ens_transfer") {
        template = buildEnsTransfer(walletAddress, ensName, safeAddress, gas);
      } else if (action === "ens_record") {
        template = buildEnsRecordUpdate(ensName, recordKey, recordValue, gas);
      } else if (action === "erc20_rescue") {
        const amount = parseUnits(tokenAmount, tokenDecimals);
        template = buildErc20Rescue(tokenAddress, safeAddress, amount, tokenSymbol || "TOKEN", gas);
      } else if (action === "erc721_rescue") {
        template = buildErc721Rescue(walletAddress, nftContractAddress, nftTokenId, safeAddress, gas);
      } else {
        template = buildApprovalRevoke(revokeTokenAddress, revokeSpender, revokeTokenSymbol || "TOKEN", gas);
      }
    } catch (e: any) {
      setError("Failed to build transaction: " + (e.message || e));
      return;
    }

    onConfigured(
      {
        action,
        safeAddress,
        ensName,
        recordKey,
        recordValue,
        tokenAddress,
        tokenSymbol,
        tokenAmount,
        tokenDecimals,
        nftContractAddress,
        nftTokenId,
        revokeTokenAddress,
        revokeTokenSymbol,
        revokeSpender,
        priorityFee,
        maxFee,
        useFlashbots: useBundleMode ? false : useFlashbots,
        useBundleMode,
        fundingPrivateKey: useBundleMode ? fundingPrivateKey : "",
        fundingAmount: useBundleMode ? fundingAmount : "0",
        dryRun,
      },
      template
    );
  };

  return (
    <div className="space-y-6">
      {/* Scan results */}
      <ScanResultsPanel scan={scan} analysis={analysis} />

      {/* Action selector */}
      <div>
        <label className="block text-sm text-gray-400 mb-3">Rescue Action</label>
        <div className="grid sm:grid-cols-3 gap-3">
          {actions.map((a) => {
            const Icon = a.icon;
            const selected = action === a.key;
            return (
              <button
                key={a.key}
                onClick={() => setAction(a.key)}
                className={`text-left p-4 rounded-xl border transition ${
                  selected
                    ? "bg-violet-500/10 border-violet-500/50"
                    : "bg-white/5 border-white/10 hover:border-white/20"
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${selected ? "bg-violet-500/20" : "bg-white/10"}`}>
                  <Icon className={`w-5 h-5 ${selected ? "text-violet-400" : "text-gray-400"}`} />
                </div>
                <p className="text-white font-medium text-sm">{a.label}</p>
                <p className="text-gray-500 text-xs mt-1">{a.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Safe address (for most actions) */}
      {needsSafeAddress && (
        <div>
          <label className="block text-sm text-gray-400 mb-2">Safe Destination Address</label>
          <input
            type="text"
            value={safeAddress}
            onChange={(e) => setSafeAddress(e.target.value)}
            placeholder="0x..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition font-mono text-sm"
          />
          <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
            <Info className="w-3 h-3" /> This is your SAFE wallet — where rescued assets will be sent (not the compromised one)
          </p>
        </div>
      )}

      {/* ENS fields */}
      {(action === "ens_transfer" || action === "ens_record") && (
        <div>
          <label className="block text-sm text-gray-400 mb-2">ENS Name</label>
          <input
            type="text"
            value={ensName}
            onChange={(e) => setEnsName(e.target.value)}
            placeholder="myname.eth"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition text-sm"
          />
        </div>
      )}

      {action === "ens_record" && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Record Key</label>
            <input
              type="text"
              value={recordKey}
              onChange={(e) => setRecordKey(e.target.value)}
              placeholder="e.g. description, url, avatar"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Record Value</label>
            <input
              type="text"
              value={recordValue}
              onChange={(e) => setRecordValue(e.target.value)}
              placeholder="Value to set"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition text-sm"
            />
          </div>
        </div>
      )}

      {/* ERC-20 Token fields */}
      {action === "erc20_rescue" && (
        <div className="space-y-4">
          {scan && scan.tokens.length > 0 && (
            <div>
              <label className="block text-xs text-gray-500 mb-2">Quick-fill from scan:</label>
              <div className="flex flex-wrap gap-2">
                {scan.tokens.map((t) => (
                  <button
                    key={t.address}
                    onClick={() => fillFromToken(t.address)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      tokenAddress === t.address
                        ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                        : "bg-white/5 text-gray-400 border border-white/10 hover:border-white/20"
                    }`}
                  >
                    {t.symbol} ({t.balanceFormatted})
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Token Contract Address</label>
              <input
                type="text"
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                placeholder="0x..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Token Symbol</label>
              <input
                type="text"
                value={tokenSymbol}
                onChange={(e) => setTokenSymbol(e.target.value)}
                placeholder="e.g. USDC"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition text-sm"
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Amount</label>
              <input
                type="text"
                value={tokenAmount}
                onChange={(e) => setTokenAmount(e.target.value)}
                placeholder="100.0"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Decimals</label>
              <input
                type="number"
                value={tokenDecimals}
                onChange={(e) => setTokenDecimals(Number(e.target.value) || 18)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-500 transition"
              />
            </div>
          </div>
        </div>
      )}

      {/* ERC-721 NFT fields */}
      {action === "erc721_rescue" && (
        <div className="space-y-4">
          {scan && scan.nfts.length > 0 && (
            <div>
              <label className="block text-xs text-gray-500 mb-2">Quick-fill from scan:</label>
              <div className="flex flex-wrap gap-2">
                {scan.nfts.map((n) => (
                  <button
                    key={`${n.contractAddress}-${n.tokenId}`}
                    onClick={() => fillFromNft(n.contractAddress, n.tokenId)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      nftContractAddress === n.contractAddress && nftTokenId === n.tokenId
                        ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                        : "bg-white/5 text-gray-400 border border-white/10 hover:border-white/20"
                    }`}
                  >
                    {n.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">NFT Contract Address</label>
              <input
                type="text"
                value={nftContractAddress}
                onChange={(e) => setNftContractAddress(e.target.value)}
                placeholder="0x..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Token ID</label>
              <input
                type="text"
                value={nftTokenId}
                onChange={(e) => setNftTokenId(e.target.value)}
                placeholder="e.g. 1234"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Approval Revoke fields */}
      {action === "approval_revoke" && (
        <div className="space-y-4">
          {scan && scan.approvals.length > 0 && (
            <div>
              <label className="block text-xs text-gray-500 mb-2">Quick-fill from scan:</label>
              <div className="flex flex-wrap gap-2">
                {scan.approvals.map((a, i) => (
                  <button
                    key={i}
                    onClick={() => fillFromApproval(i)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      revokeTokenAddress === a.tokenAddress && revokeSpender === a.spender
                        ? "bg-red-500/20 text-red-400 border border-red-500/30"
                        : "bg-white/5 text-gray-400 border border-white/10 hover:border-white/20"
                    }`}
                  >
                    {a.tokenSymbol} → {a.spender.slice(0, 8)}...
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Token Contract Address</label>
              <input
                type="text"
                value={revokeTokenAddress}
                onChange={(e) => setRevokeTokenAddress(e.target.value)}
                placeholder="0x..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Token Symbol</label>
              <input
                type="text"
                value={revokeTokenSymbol}
                onChange={(e) => setRevokeTokenSymbol(e.target.value)}
                placeholder="e.g. USDC"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Spender Address (to revoke)</label>
            <input
              type="text"
              value={revokeSpender}
              onChange={(e) => setRevokeSpender(e.target.value)}
              placeholder="0x..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition font-mono text-sm"
            />
          </div>
        </div>
      )}

      {/* Gas presets */}
      <div>
        <label className="block text-sm text-gray-400 mb-3">Gas Priority</label>
        <div className="flex gap-2 mb-3">
          {gasPresets.map((g) => (
            <button
              key={g.label}
              onClick={() => { setPriorityFee(g.p); setMaxFee(g.m); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                priorityFee === g.p && maxFee === g.m
                  ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                  : "bg-white/5 text-gray-400 border border-white/10 hover:border-white/20"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500">Priority fee (gwei)</label>
            <input
              type="number"
              value={priorityFee}
              onChange={(e) => setPriorityFee(Number(e.target.value) || 0)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500 transition"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Max fee (gwei)</label>
            <input
              type="number"
              value={maxFee}
              onChange={(e) => setMaxFee(Number(e.target.value) || 0)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500 transition"
            />
          </div>
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => { setUseFlashbots(!useFlashbots); if (!useFlashbots) setUseBundleMode(false); }}
              className={`w-11 h-6 rounded-full transition relative ${useFlashbots ? "bg-violet-600" : "bg-white/10"}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition`} style={{ left: useFlashbots ? 22 : 2 }} />
            </div>
            <span className="text-sm text-gray-300">Flashbots Protect</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => { setUseBundleMode(!useBundleMode); if (!useBundleMode) setUseFlashbots(false); }}
              className={`w-11 h-6 rounded-full transition relative ${useBundleMode ? "bg-orange-600" : "bg-white/10"}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition`} style={{ left: useBundleMode ? 22 : 2 }} />
            </div>
            <span className="text-sm text-gray-300">Atomic Bundle</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setDryRun(!dryRun)}
              className={`w-11 h-6 rounded-full transition relative ${dryRun ? "bg-cyan-600" : "bg-white/10"}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition`} style={{ left: dryRun ? 22 : 2 }} />
            </div>
            <span className="text-sm text-gray-300">Dry Run</span>
          </label>
        </div>

        {!dryRun && !useBundleMode && !useFlashbots && (
          <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
            <p className="text-yellow-400/80 text-xs">
              <strong>First time?</strong> Enable Dry Run to test without sending real transactions. You can also enable Flashbots Protect to hide your TX from bots.
            </p>
          </div>
        )}

        {/* Bundle mode info */}
        {useBundleMode && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 space-y-4">
            <div className="flex items-start gap-2">
              <Box className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-orange-400 text-sm font-medium">Flashbots Atomic Bundle</p>
                <p className="text-orange-400/70 text-xs mt-1">
                  Both transactions (fund + rescue) are submitted as an atomic bundle.
                  They execute together in the same block or not at all — the drainer cannot front-run.
                </p>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Funding Wallet Private Key</label>
              <div className="relative">
                <input
                  type={showFundingKey ? "text" : "password"}
                  value={fundingPrivateKey}
                  onChange={(e) => setFundingPrivateKey(e.target.value)}
                  placeholder="0x... (your SAFE wallet with ETH)"
                  autoComplete="off"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 transition font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowFundingKey(!showFundingKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                >
                  {showFundingKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">This wallet funds the gas. Must have ETH.</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Funding Amount (ETH)</label>
              <input
                type="text"
                value={fundingAmount}
                onChange={(e) => setFundingAmount(e.target.value)}
                placeholder="0.01"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 transition text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Amount sent to compromised wallet for gas</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>
      )}

      <div className="flex gap-3">
        <button onClick={onBack} className="px-6 py-3 border border-white/20 text-gray-400 rounded-xl hover:bg-white/5 transition flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={submit}
          className="flex-1 bg-gradient-to-r from-violet-600 to-cyan-600 text-white py-3 rounded-xl font-medium hover:opacity-90 transition flex items-center justify-center gap-2"
        >
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 3: Execute                                                    */
/* ------------------------------------------------------------------ */

function StepExecute({
  connectData,
  config,
  template,
  onBack,
  onReset,
}: {
  connectData: ConnectData;
  config: RescueConfig;
  template: TransactionTemplate;
  onBack: () => void;
  onReset: () => void;
}) {
  const [status, setStatus] = useState<MonitorStatus>("idle");
  const [balance, setBalance] = useState<bigint | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [bundleResult, setBundleResult] = useState<BundleResult | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev.slice(-99), `[${ts}] ${msg}`]);
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const actionLabels: Record<RescueAction, string> = {
    eth_rescue: `Sweep ETH to ${config.safeAddress.slice(0, 8)}...`,
    erc20_rescue: `Rescue ${config.tokenSymbol || "tokens"} to ${config.safeAddress.slice(0, 8)}...`,
    erc721_rescue: `Transfer NFT #${config.nftTokenId} to ${config.safeAddress.slice(0, 8)}...`,
    ens_transfer: `Transfer ${config.ensName} to ${config.safeAddress.slice(0, 8)}...`,
    ens_record: `Set ${config.recordKey} on ${config.ensName}`,
    approval_revoke: `Revoke ${config.revokeTokenSymbol} approval for ${config.revokeSpender.slice(0, 8)}...`,
  };

  const actionLabel = actionLabels[config.action] || config.action;

  const executeBundleMode = async () => {
    setStatus("executing");
    setLogs([]);
    setResult(null);
    setBundleResult(null);

    addLog("Initiating Flashbots Atomic Bundle...");

    try {
      const fundingKey = config.fundingPrivateKey.startsWith("0x")
        ? config.fundingPrivateKey
        : "0x" + config.fundingPrivateKey;
      const fundingWallet = new Wallet(fundingKey, connectData.provider);
      const fundAmount = parseUnits(config.fundingAmount, "ether");

      addLog(`Funding wallet: ${fundingWallet.address}`);
      addLog(`Funding amount: ${config.fundingAmount} ETH`);

      const bundleRes = await executeBundleRescue(
        connectData.wallet,
        fundingWallet,
        template,
        fundAmount,
        { dryRun: config.dryRun, onLog: addLog }
      );

      setBundleResult(bundleRes);
      if (bundleRes.status === "success") {
        setStatus("confirmed");
        setResult({ txHash: bundleRes.bundleHash, status: "success", error: null, dryRun: config.dryRun });
      } else {
        setStatus("failed");
        setResult({ txHash: null, status: "error", error: bundleRes.error, dryRun: config.dryRun });
      }
    } catch (e: any) {
      addLog(`Bundle error: ${e.message}`);
      setStatus("failed");
      setResult({ txHash: null, status: "error", error: e.message, dryRun: config.dryRun });
    }
  };

  const arm = async () => {
    // Bundle mode skips monitoring — executes immediately
    if (config.useBundleMode) {
      await executeBundleMode();
      return;
    }

    setStatus("monitoring");
    setLogs([]);
    setResult(null);

    let baseline: bigint;
    if (config.dryRun) {
      baseline = 0n;
      addLog("[DRY-RUN] Baseline balance: 0 ETH");
    } else {
      baseline = await connectData.provider.getBalance(connectData.address);
      addLog(`Baseline balance: ${formatEther(baseline)} ETH`);
    }
    setBalance(baseline);
    addLog("Watching for incoming ETH deposits...");

    if (config.dryRun) {
      // Simulate deposit after 2s
      setTimeout(async () => {
        const simBalance = baseline + parseUnits("0.005", "ether");
        addLog("[DRY-RUN] Simulated deposit: +0.005 ETH");
        setBalance(simBalance);
        setStatus("executing");
        addLog("DEPOSIT DETECTED - Executing rescue transaction...");

        const res = await executeRescue(connectData.wallet, template, simBalance, {
          useFlashbots: config.useFlashbots,
          dryRun: true,
          onLog: addLog,
        });
        setResult(res);
        setStatus(res.status === "success" ? "confirmed" : "failed");
      }, 2000);
      return;
    }

    const monitor = startMonitoring(connectData.provider, connectData.address, baseline, {
      onBalanceCheck: (bal, count) => {
        setBalance(bal);
        setPollCount(count);
      },
      onDepositDetected: async (newBalance, increase) => {
        addLog(`DEPOSIT DETECTED: +${formatEther(increase)} ETH`);
        setBalance(newBalance);
        setStatus("executing");
        addLog("Executing rescue transaction NOW...");

        const res = await executeRescue(connectData.wallet, template, newBalance, {
          useFlashbots: config.useFlashbots,
          dryRun: false,
          onLog: addLog,
        });
        setResult(res);
        setStatus(res.status === "success" ? "confirmed" : "failed");
      },
      onError: (err) => addLog(`ERROR: ${err}`),
    });

    stopRef.current = () => {
      monitor.stop();
      setStatus("cancelled");
      addLog("Monitoring cancelled by user.");
    };
  };

  const cancel = () => stopRef.current?.();

  const etherscanUrl = result?.txHash && !result.dryRun
    ? `https://etherscan.io/tx/${result.txHash}`
    : null;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-4">Rescue Plan</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="text-gray-500">Wallet</div>
          <div className="text-white font-mono text-xs">{connectData.address}</div>
          <div className="text-gray-500">Action</div>
          <div className="text-white">{actionLabel}</div>
          <div className="text-gray-500">Gas</div>
          <div className="text-white">{config.priorityFee}/{config.maxFee} gwei</div>
          <div className="text-gray-500">Mode</div>
          <div>
            {config.useBundleMode ? (
              <span className="text-orange-400">ATOMIC BUNDLE</span>
            ) : config.useFlashbots ? (
              <span className="text-violet-400">FLASHBOTS PROTECT</span>
            ) : (
              <span className="text-gray-400">PUBLIC MEMPOOL</span>
            )}
          </div>
          <div className="text-gray-500">Run</div>
          <div className={config.dryRun ? "text-cyan-400" : "text-yellow-400"}>{config.dryRun ? "DRY RUN" : "LIVE"}</div>
        </div>
      </div>

      {/* Balance monitor */}
      {status !== "idle" && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            {status === "monitoring" && (
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
              </span>
            )}
            {status === "executing" && <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />}
            {status === "confirmed" && <Check className="w-4 h-4 text-green-400" />}
            {status === "failed" && <AlertTriangle className="w-4 h-4 text-red-400" />}
            {status === "cancelled" && <Square className="w-4 h-4 text-gray-400" />}
            <span className="text-sm font-medium text-white capitalize">{status.replace("_", " ")}</span>
            {status === "monitoring" && (
              <span className="text-xs text-gray-500 ml-auto">Poll #{pollCount}</span>
            )}
          </div>
          {balance !== null && (
            <p className="text-2xl font-bold text-white font-mono">{formatEther(balance)} <span className="text-sm text-gray-500">ETH</span></p>
          )}
        </div>
      )}

      {/* Log terminal */}
      {logs.length > 0 && (
        <div className="bg-slate-900/80 border border-white/10 rounded-xl p-4 max-h-48 overflow-y-auto font-mono text-xs text-gray-400">
          {logs.map((l, i) => (
            <div key={i} className={l.includes("ERROR") || l.includes("failed") ? "text-red-400" : l.includes("DETECTED") || l.includes("SUCCESS") || l.includes("included") ? "text-green-400" : l.includes("DRY-RUN") ? "text-cyan-400" : l.includes("Bundle") || l.includes("bundle") ? "text-orange-400" : ""}>
              {l}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      )}

      {/* Result */}
      {result && (
        <div
          className={`border rounded-2xl p-6 ${
            result.status === "success"
              ? "bg-green-500/10 border-green-500/30"
              : result.status === "reverted"
              ? "bg-yellow-500/10 border-yellow-500/30"
              : "bg-red-500/10 border-red-500/30"
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            {result.status === "success" ? (
              <Check className="w-5 h-5 text-green-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-400" />
            )}
            <h3 className={`font-semibold ${result.status === "success" ? "text-green-400" : "text-red-400"}`}>
              {result.dryRun
                ? "Dry Run Complete"
                : result.status === "success"
                ? config.useBundleMode ? "Bundle Executed Successfully!" : "Rescue Successful!"
                : result.status === "reverted"
                ? "Transaction Reverted"
                : config.useBundleMode ? "Bundle Failed" : "Rescue Failed"}
            </h3>
          </div>
          {result.txHash && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">{config.useBundleMode ? "Bundle:" : "TX:"}</span>
              <span className="text-white font-mono text-xs">{result.txHash.slice(0, 18)}...{result.txHash.slice(-8)}</span>
              {etherscanUrl && (
                <a href={etherscanUrl} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          )}
          {result.error && <p className="text-red-400 text-sm mt-2">{result.error}</p>}
          {result.status !== "success" && !result.dryRun && (
            <p className="text-gray-400 text-sm mt-2">
              {config.useBundleMode
                ? "Bundle was not included. Try increasing gas or check that the funding wallet has enough ETH."
                : "Try again with higher gas or enable Flashbots Protect."}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {status === "idle" && (
          <>
            <button onClick={onBack} className="px-6 py-3 border border-white/20 text-gray-400 rounded-xl hover:bg-white/5 transition flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={arm}
              className={`flex-1 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition flex items-center justify-center gap-2 ${
                config.useBundleMode
                  ? "bg-gradient-to-r from-orange-600 to-red-600"
                  : "bg-gradient-to-r from-red-600 to-orange-600"
              }`}
            >
              {config.useBundleMode ? (
                <><Box className="w-5 h-5" /> EXECUTE ATOMIC BUNDLE</>
              ) : (
                <><Zap className="w-5 h-5" /> ARM RESCUE BOT</>
              )}
            </button>
          </>
        )}
        {status === "monitoring" && (
          <button onClick={cancel} className="flex-1 border border-red-500/30 text-red-400 py-3 rounded-xl hover:bg-red-500/10 transition">
            Cancel Monitoring
          </button>
        )}
        {(status === "confirmed" || status === "failed" || status === "cancelled") && (
          <button onClick={onReset} className="flex-1 bg-gradient-to-r from-violet-600 to-cyan-600 text-white py-3 rounded-xl font-medium hover:opacity-90 transition">
            Start Over
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tool Page                                                          */
/* ------------------------------------------------------------------ */

export default function ToolPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [connectData, setConnectData] = useState<ConnectData | null>(null);
  const [config, setConfig] = useState<RescueConfig | null>(null);
  const [template, setTemplate] = useState<TransactionTemplate | null>(null);
  const [scanResult, setScanResult] = useState<WalletScanResult | null>(null);
  const [drainerAnalysis, setDrainerAnalysis] = useState<DrainerAnalysis | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Nav */}
      <nav className="border-b border-white/10 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <div className="w-8 h-2 rounded bg-gradient-to-r from-violet-500 via-cyan-500 to-red-500" />
            <span className="text-white font-semibold">LUXBIN</span>
            <span className="text-gray-500 text-sm hidden sm:inline">Drainer Defense</span>
          </a>
          <a href="/" className="text-sm text-gray-400 hover:text-white transition">Home</a>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <InstructionsGuide />
        <StepIndicator step={step} />

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8">
          {/* Step headers */}
          {step === 1 && (
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-1">Step 1: Connect Compromised Wallet</h2>
              <p className="text-gray-500 text-sm">Pick an RPC, paste the private key of the wallet being drained, then click connect.</p>
            </div>
          )}
          {step === 2 && (
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-1">Step 2: Configure Your Rescue</h2>
              <p className="text-gray-500 text-sm">Choose what to rescue, where to send it, and how aggressive the gas should be.</p>
            </div>
          )}
          {step === 3 && (
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-1">Step 3: Arm &amp; Execute</h2>
              <p className="text-gray-500 text-sm">Review your plan, then click the button to start. The tool will watch for ETH and instantly rescue.</p>
            </div>
          )}

          {step === 1 && (
            <StepConnect
              onConnected={(d, scan, analysis) => {
                setConnectData(d);
                setScanResult(scan);
                setDrainerAnalysis(analysis);
                setStep(2);
              }}
            />
          )}
          {step === 2 && connectData && (
            <StepConfigure
              walletAddress={connectData.address}
              scan={scanResult}
              analysis={drainerAnalysis}
              onConfigured={(c, t) => {
                setConfig(c);
                setTemplate(t);
                setStep(3);
              }}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && connectData && config && template && (
            <StepExecute
              connectData={connectData}
              config={config}
              template={template}
              onBack={() => setStep(2)}
              onReset={() => {
                setStep(1);
                setConnectData(null);
                setConfig(null);
                setTemplate(null);
                setScanResult(null);
                setDrainerAnalysis(null);
              }}
            />
          )}
        </div>

        {/* Keep tab active warning */}
        {step === 3 && (
          <p className="text-center text-xs text-gray-600 mt-4">
            Keep this tab in the foreground while monitoring. Browsers may throttle background tabs.
          </p>
        )}
      </main>
    </div>
  );
}
