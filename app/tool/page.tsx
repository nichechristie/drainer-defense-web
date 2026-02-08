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
} from "lucide-react";
import { JsonRpcProvider, Wallet, formatEther, parseUnits, isAddress } from "ethers";
import { buildEthRescue, buildEnsTransfer, buildEnsRecordUpdate } from "@/lib/transactionBuilder";
import { startMonitoring } from "@/lib/walletMonitor";
import { executeRescue } from "@/lib/rescueExecutor";
import { CHAIN_NAMES, DEFAULT_PRIORITY_FEE_GWEI, DEFAULT_MAX_FEE_GWEI, GAS_LIMITS } from "@/lib/constants";
import type { RescueAction, TransactionTemplate, ExecutionResult, MonitorStatus } from "@/types/rescue";

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

function StepConnect({ onConnected }: { onConnected: (d: ConnectData) => void }) {
  const [rpcUrl, setRpcUrl] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  const connect = async () => {
    setError("");
    setConnecting(true);
    try {
      const provider = new JsonRpcProvider(rpcUrl);
      const network = await provider.getNetwork();
      const key = privateKey.startsWith("0x") ? privateKey : "0x" + privateKey;
      const wallet = new Wallet(key, provider);
      const balance = await provider.getBalance(wallet.address);
      onConnected({
        provider,
        wallet,
        address: wallet.address,
        balance,
        chainId: Number(network.chainId),
      });
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

      <button
        onClick={connect}
        disabled={!rpcUrl || !privateKey || connecting}
        className="w-full bg-gradient-to-r from-violet-600 to-cyan-600 text-white py-3 rounded-xl font-medium hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {connecting ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Connecting...</>
        ) : (
          <><Shield className="w-5 h-5" /> Connect Wallet</>
        )}
      </button>
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
  priorityFee: number;
  maxFee: number;
  useFlashbots: boolean;
  dryRun: boolean;
}

function StepConfigure({
  walletAddress,
  onConfigured,
  onBack,
}: {
  walletAddress: string;
  onConfigured: (config: RescueConfig, template: TransactionTemplate) => void;
  onBack: () => void;
}) {
  const [action, setAction] = useState<RescueAction>("eth_rescue");
  const [safeAddress, setSafeAddress] = useState("");
  const [ensName, setEnsName] = useState("");
  const [recordKey, setRecordKey] = useState("");
  const [recordValue, setRecordValue] = useState("");
  const [priorityFee, setPriorityFee] = useState(DEFAULT_PRIORITY_FEE_GWEI);
  const [maxFee, setMaxFee] = useState(DEFAULT_MAX_FEE_GWEI);
  const [useFlashbots, setUseFlashbots] = useState(false);
  const [dryRun, setDryRun] = useState(false);
  const [error, setError] = useState("");

  const actions: { key: RescueAction; label: string; desc: string; icon: any }[] = [
    { key: "eth_rescue", label: "ETH Rescue", desc: "Sweep ETH to a safe wallet", icon: Shield },
    { key: "ens_transfer", label: "ENS Transfer", desc: "Transfer ENS name ownership", icon: FileText },
    { key: "ens_record", label: "ENS Record", desc: "Update ENS text record", icon: Edit3 },
  ];

  const gasPresets = [
    { label: "Normal", p: 3, m: 50 },
    { label: "Fast", p: 10, m: 100 },
    { label: "Aggressive", p: 25, m: 200 },
  ];

  const submit = () => {
    setError("");

    // Validate
    if (action !== "ens_record" && !safeAddress) {
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
      } else {
        template = buildEnsRecordUpdate(ensName, recordKey, recordValue, gas);
      }
    } catch (e: any) {
      setError("Failed to build transaction: " + (e.message || e));
      return;
    }

    onConfigured(
      { action, safeAddress, ensName, recordKey, recordValue, priorityFee, maxFee, useFlashbots, dryRun },
      template
    );
  };

  return (
    <div className="space-y-6">
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

      {/* Action-specific fields */}
      {(action === "eth_rescue" || action === "ens_transfer") && (
        <div>
          <label className="block text-sm text-gray-400 mb-2">Safe Destination Address</label>
          <input
            type="text"
            value={safeAddress}
            onChange={(e) => setSafeAddress(e.target.value)}
            placeholder="0x..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition font-mono text-sm"
          />
        </div>
      )}

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
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => setUseFlashbots(!useFlashbots)}
            className={`w-11 h-6 rounded-full transition relative ${useFlashbots ? "bg-violet-600" : "bg-white/10"}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition ${useFlashbots ? "left-5.5" : "left-0.5"}`} style={{ left: useFlashbots ? 22 : 2 }} />
          </div>
          <span className="text-sm text-gray-300">Flashbots Protect</span>
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
  const stopRef = useRef<(() => void) | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev.slice(-99), `[${ts}] ${msg}`]);
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const actionLabel =
    config.action === "eth_rescue"
      ? `Sweep ETH to ${config.safeAddress.slice(0, 8)}...`
      : config.action === "ens_transfer"
      ? `Transfer ${config.ensName} to ${config.safeAddress.slice(0, 8)}...`
      : `Set ${config.recordKey} on ${config.ensName}`;

  const arm = async () => {
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
          <div className="text-gray-500">Flashbots</div>
          <div className={config.useFlashbots ? "text-violet-400" : "text-gray-500"}>{config.useFlashbots ? "YES" : "NO"}</div>
          <div className="text-gray-500">Mode</div>
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
            <div key={i} className={l.includes("ERROR") || l.includes("failed") ? "text-red-400" : l.includes("DETECTED") || l.includes("SUCCESS") ? "text-green-400" : l.includes("DRY-RUN") ? "text-cyan-400" : ""}>
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
                ? "Rescue Successful!"
                : result.status === "reverted"
                ? "Transaction Reverted"
                : "Rescue Failed"}
            </h3>
          </div>
          {result.txHash && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">TX:</span>
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
            <p className="text-gray-400 text-sm mt-2">Try again with higher gas or enable Flashbots Protect.</p>
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
              className="flex-1 bg-gradient-to-r from-red-600 to-orange-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition flex items-center justify-center gap-2"
            >
              <Zap className="w-5 h-5" /> ARM RESCUE BOT
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
        <StepIndicator step={step} />

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8">
          {step === 1 && (
            <StepConnect
              onConnected={(d) => {
                setConnectData(d);
                setStep(2);
              }}
            />
          )}
          {step === 2 && connectData && (
            <StepConfigure
              walletAddress={connectData.address}
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
