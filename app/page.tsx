"use client";

import {
  Shield,
  Zap,
  Eye,
  FileText,
  Edit3,
  Lock,
  ArrowRight,
  CheckCircle,
  Radio,
  Send,
  Coins,
  Image,
  Ban,
  Search,
  Box,
  Activity,
  Brain,
  Volume2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Nav */}
      <nav className="border-b border-white/10 backdrop-blur-sm fixed w-full z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-2 rounded bg-gradient-to-r from-violet-500 via-cyan-500 to-red-500" />
            <span className="text-white font-semibold text-lg">LUXBIN</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#how-it-works" className="text-sm text-gray-400 hover:text-white transition hidden sm:inline">
              How It Works
            </a>
            <a href="#features" className="text-sm text-gray-400 hover:text-white transition hidden sm:inline">
              Features
            </a>
            <Link
              href="/tool"
              className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition"
            >
              Launch Tool
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 mb-8">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-violet-400 text-sm font-medium">LUXBIN Shield — AI-Powered Wallet Security</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Rescue Assets from{" "}
            <span className="bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Compromised Wallets
            </span>
          </h1>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            The complete AI-powered wallet rescue suite. Real-time threat intelligence from{" "}
            <span className="text-violet-300">You.com</span>, voice alerts via{" "}
            <span className="text-cyan-300">Deepgram</span>, Flashbots atomic bundles,
            and full asset recovery — all 100% client-side.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/tool"
              className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white px-8 py-4 rounded-xl text-lg font-medium hover:opacity-90 transition flex items-center justify-center gap-2"
            >
              Launch Tool <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#how-it-works"
              className="border border-white/20 text-white px-8 py-4 rounded-xl text-lg font-medium hover:bg-white/5 transition"
            >
              How It Works
            </a>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
            How It Works
          </h2>
          <p className="text-gray-400 text-center mb-14 max-w-xl mx-auto">
            Three steps to rescue assets from a drained wallet
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: 1,
                icon: Shield,
                title: "Connect & Scan",
                desc: "Enter your RPC endpoint and compromised wallet key. The tool automatically scans for tokens, NFTs, active approvals, and detects drainer bot activity.",
              },
              {
                step: 2,
                icon: Radio,
                title: "Configure Rescue",
                desc: "Choose your rescue action — ETH sweep, token rescue, NFT transfer, approval revocation, or ENS recovery. Optionally enable Flashbots atomic bundles.",
              },
              {
                step: 3,
                icon: Zap,
                title: "Auto-Execute",
                desc: "The instant ETH arrives, your pre-built rescue transaction broadcasts with maximum gas priority. Or use atomic bundles where fund + rescue execute together.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-violet-500/50 transition">
                  <div className="w-12 h-12 bg-violet-500/20 rounded-xl flex items-center justify-center mb-5">
                    <Icon className="w-6 h-6 text-violet-400" />
                  </div>
                  <div className="text-sm text-violet-400 font-medium mb-2">Step {item.step}</div>
                  <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* AI Shield Features */}
      <section id="ai-shield" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 mb-6 mx-auto flex justify-center">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-violet-400 text-sm font-medium">New — AI Shield Intelligence</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
            AI-Powered Threat Intelligence
          </h2>
          <p className="text-gray-400 text-center mb-14 max-w-xl mx-auto">
            Every wallet scan is now backed by real-time AI analysis and a voice briefing
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border border-violet-500/20 rounded-2xl p-8">
              <div className="w-12 h-12 bg-violet-500/20 rounded-xl flex items-center justify-center mb-5">
                <Brain className="w-6 h-6 text-violet-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">You.com Threat Intel</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">
                After every wallet scan, AI with real-time web search analyzes your specific risk
                profile and delivers tailored rescue recommendations — pulling from the latest
                security research, known drainer destinations, and Flashbots documentation.
              </p>
              <div className="flex flex-wrap gap-2">
                {["Real-time web search", "Risk-matched advice", "Flashbots guidance", "Live sources"].map((tag) => (
                  <span key={tag} className="text-xs bg-violet-500/10 border border-violet-500/20 text-violet-400 px-3 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-cyan-500/10 to-emerald-500/10 border border-cyan-500/20 rounded-2xl p-8">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center mb-5">
                <Volume2 className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Deepgram Voice Alerts</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">
                When a threat is detected, Deepgram&apos;s AI voice (Aura) delivers an instant audio
                briefing — threat level, sweep count, bot destination, and the exact steps
                needed to rescue your assets. Falls back to browser speech if no API key.
              </p>
              <div className="flex flex-wrap gap-2">
                {["Deepgram Aura voice", "Risk-aware briefing", "Instant playback", "Browser fallback"].map((tag) => (
                  <span key={tag} className="text-xs bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-3 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
            Full Wallet Rescue Suite
          </h2>
          <p className="text-gray-400 text-center mb-14 max-w-xl mx-auto">
            Eight rescue capabilities to recover every asset type
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Send,
                title: "ETH Rescue",
                desc: "Sweep remaining ETH to a safe wallet with automatic gas calculation.",
              },
              {
                icon: Coins,
                title: "Token Rescue",
                desc: "Rescue ERC-20 tokens like USDC, WETH, DAI, and more from compromised wallets.",
              },
              {
                icon: Image,
                title: "NFT Rescue",
                desc: "Transfer ERC-721 NFTs to safety before the drainer can claim them.",
              },
              {
                icon: Ban,
                title: "Approval Revoke",
                desc: "Revoke malicious token approvals that let attackers drain without your key.",
              },
              {
                icon: Box,
                title: "Atomic Bundles",
                desc: "Fund + rescue in one atomic block via Flashbots. Drainer literally cannot front-run.",
              },
              {
                icon: Search,
                title: "Wallet Scanner",
                desc: "Auto-scan for all assets, tokens, NFTs, and active approvals before configuring rescue.",
              },
              {
                icon: Activity,
                title: "Bot Detection",
                desc: "Analyze transaction patterns to detect drainer bots and estimate their gas strategy.",
              },
              {
                icon: FileText,
                title: "ENS Recovery",
                desc: "Transfer ENS name ownership or update records before the drainer acts.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-violet-500/50 transition">
                  <div className="w-10 h-10 bg-violet-500/20 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-violet-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border border-violet-500/20 rounded-2xl p-8 md:p-12">
            <div className="flex items-center gap-3 mb-6">
              <Lock className="w-6 h-6 text-violet-400" />
              <h2 className="text-2xl md:text-3xl font-bold text-white">Zero-Trust Security</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                "Private keys are processed entirely in your browser",
                "No data is ever sent to any server",
                "No accounts, no sign-up, no tracking",
                "Flashbots Protect & atomic bundles for private TX submission",
                "Open source — inspect every line of code",
                "EIP-1559 transactions with aggressive priority fees",
                "Automatic drainer bot detection before rescue",
                "Wallet scan reveals all assets & dangerous approvals",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
                  <p className="text-gray-300 text-sm">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Ready to Rescue Your Assets?
        </h2>
        <p className="text-gray-400 mb-8 max-w-lg mx-auto">
          Don't let drainer bots win. Take back control of your compromised wallet.
        </p>
        <Link
          href="/tool"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-cyan-600 text-white px-8 py-4 rounded-xl text-lg font-medium hover:opacity-90 transition"
        >
          Launch Drainer Defense <Zap className="w-5 h-5" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-1.5 rounded bg-gradient-to-r from-violet-500 via-cyan-500 to-red-500" />
            <span className="text-gray-500 text-sm">LUXBIN Drainer Defense v2</span>
          </div>
          <p className="text-gray-600 text-sm">Part of the LUXBIN Quantum Wallet Security suite</p>
        </div>
      </footer>
    </div>
  );
}
