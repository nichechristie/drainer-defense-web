"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Brain,
  Volume2,
  VolumeX,
  Loader2,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Sparkles,
} from "lucide-react";
import type { DrainerAnalysis, WalletScanResult } from "@/types/rescue";

interface ThreatIntelResult {
  answer: string;
  sources: { title: string; url: string }[];
  demo: boolean;
}

interface AIShieldPanelProps {
  address: string;
  analysis: DrainerAnalysis | null;
  scan: WalletScanResult | null;
}

function speakFallback(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 0.95;
  utt.pitch = 1;
  window.speechSynthesis.speak(utt);
}

export function AIShieldPanel({ address, analysis, scan }: AIShieldPanelProps) {
  const [intel, setIntel] = useState<ThreatIntelResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voicePlaying, setVoicePlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasFetched = useRef(false);

  const fetchIntel = useCallback(async () => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/threat-intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          riskLevel: analysis?.riskLevel ?? "low",
          sweepCount: analysis?.sweepCount ?? 0,
          botDestination: analysis?.botDestination ?? null,
          approvalCount: scan?.approvals.length ?? 0,
        }),
      });
      if (!res.ok) throw new Error("Failed to fetch threat intelligence");
      const data = await res.json();
      setIntel(data);
    } catch (e) {
      setError("Could not load AI threat intel. Check your API key or network.");
    } finally {
      setLoading(false);
    }
  }, [address, analysis, scan]);

  useEffect(() => {
    fetchIntel();
  }, [fetchIntel]);

  const alertText = (() => {
    const risk = analysis?.riskLevel ?? "low";
    if (risk === "high")
      return `Warning. High risk wallet detected. Aggressive drainer bot confirmed with ${analysis?.sweepCount ?? 0} sweep patterns. Use Flashbots Atomic Bundle immediately. Do not send ETH directly to this wallet.`;
    if (risk === "medium")
      return `Caution. Medium risk detected. Suspicious sweep patterns found. Use Flashbots Protect with elevated priority fees before executing any rescue.`;
    const approvals = scan?.approvals.length ?? 0;
    if (approvals > 0)
      return `No active drainer detected. However, ${approvals} dangerous token approval${approvals > 1 ? "s" : ""} found. These unlimited approvals should be revoked immediately to protect your assets.`;
    return `Scan complete. No active drainer bot detected and no dangerous approvals found. Your wallet appears safe. Standard gas settings should work.`;
  })();

  const playVoiceAlert = async () => {
    if (voicePlaying) {
      audioRef.current?.pause();
      window.speechSynthesis?.cancel();
      setVoicePlaying(false);
      return;
    }

    setVoiceLoading(true);
    try {
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: alertText }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onplay = () => setVoicePlaying(true);
        audio.onended = () => {
          setVoicePlaying(false);
          URL.revokeObjectURL(url);
        };
        audio.play();
      } else {
        // Fallback to Web Speech API
        speakFallback(alertText);
        setVoicePlaying(true);
        // Estimate duration and reset state
        const wordCount = alertText.split(" ").length;
        setTimeout(() => setVoicePlaying(false), wordCount * 380);
      }
    } catch {
      speakFallback(alertText);
      setVoicePlaying(true);
      const wordCount = alertText.split(" ").length;
      setTimeout(() => setVoicePlaying(false), wordCount * 380);
    } finally {
      setVoiceLoading(false);
    }
  };

  const riskLevel = analysis?.riskLevel ?? "low";
  const RiskIcon =
    riskLevel === "high"
      ? ShieldAlert
      : riskLevel === "medium"
      ? ShieldQuestion
      : ShieldCheck;

  const riskColor =
    riskLevel === "high"
      ? "text-red-400"
      : riskLevel === "medium"
      ? "text-yellow-400"
      : "text-emerald-400";

  const borderColor =
    riskLevel === "high"
      ? "border-red-500/30"
      : riskLevel === "medium"
      ? "border-yellow-500/30"
      : "border-emerald-500/30";

  const bgColor =
    riskLevel === "high"
      ? "from-red-500/5 to-violet-500/5"
      : riskLevel === "medium"
      ? "from-yellow-500/5 to-violet-500/5"
      : "from-emerald-500/5 to-violet-500/5";

  return (
    <div className={`bg-gradient-to-br ${bgColor} border ${borderColor} rounded-2xl overflow-hidden`}>
      {/* Header */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full px-5 py-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-violet-500/20 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-left">
            <p className="text-white font-semibold text-sm">AI Shield Analysis</p>
            <p className="text-gray-500 text-xs">Powered by You.com + Deepgram</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <RiskIcon className={`w-5 h-5 ${riskColor}`} />
          <span className={`text-xs font-bold uppercase ${riskColor}`}>{riskLevel} risk</span>
          <span className="text-gray-600 text-xs">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4">
          {/* Voice Alert Button */}
          <div className="flex items-center justify-between gap-4 bg-black/20 rounded-xl p-4">
            <div>
              <p className="text-white text-sm font-medium">Voice Threat Briefing</p>
              <p className="text-gray-500 text-xs mt-0.5">
                {voicePlaying ? "Playing Deepgram voice alert..." : "Deepgram AI voice · click to hear threat summary"}
              </p>
            </div>
            <button
              onClick={playVoiceAlert}
              disabled={voiceLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition shrink-0 ${
                voicePlaying
                  ? "bg-red-500/20 border border-red-500/40 text-red-400"
                  : "bg-violet-500/20 border border-violet-500/40 text-violet-400 hover:bg-violet-500/30"
              }`}
            >
              {voiceLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : voicePlaying ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
              {voiceLoading ? "Generating..." : voicePlaying ? "Stop" : "Play Alert"}
            </button>
          </div>

          {/* AI Analysis */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-violet-400" />
              <span className="text-white text-sm font-medium">AI Threat Intelligence</span>
              {intel?.demo && (
                <span className="text-xs text-gray-600 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                  demo mode — add YOU_API_KEY for live data
                </span>
              )}
            </div>

            {loading && (
              <div className="flex items-center gap-3 text-gray-400 text-sm py-4">
                <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                Querying You.com threat intelligence...
              </div>
            )}

            {error && (
              <p className="text-red-400/70 text-sm bg-red-500/10 rounded-xl p-3">{error}</p>
            )}

            {intel?.answer && !loading && (
              <div className="bg-black/20 rounded-xl p-4">
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                  {intel.answer}
                </p>
              </div>
            )}
          </div>

          {/* Sources */}
          {intel?.sources && intel.sources.length > 0 && (
            <div>
              <p className="text-gray-500 text-xs mb-2 uppercase tracking-wide">Sources</p>
              <div className="space-y-1.5">
                {intel.sources.map((s, i) => (
                  <a
                    key={i}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-violet-400/70 hover:text-violet-400 transition"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    {s.title}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
