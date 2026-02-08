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
            <Shield className="w-4 h-4 text-violet-400" />
            <span className="text-violet-400 text-sm font-medium">LUXBIN Quantum Wallet Security</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Rescue Assets from{" "}
            <span className="bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Compromised Wallets
            </span>
          </h1>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            Front-run drainer bots by pre-building rescue transactions and broadcasting them the
            instant ETH arrives. Your keys never leave your browser.
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
                title: "Connect Wallet",
                desc: "Enter your RPC endpoint and the compromised wallet's private key. Everything stays in your browser.",
              },
              {
                step: 2,
                icon: Radio,
                title: "Configure & Monitor",
                desc: "Choose your rescue action (ETH sweep, ENS transfer, or record update). The tool watches for incoming ETH deposits.",
              },
              {
                step: 3,
                icon: Zap,
                title: "Auto-Execute",
                desc: "The instant ETH arrives, your pre-built rescue transaction broadcasts with maximum gas priority, beating the drainer.",
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

      {/* Features */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
            Rescue Operations
          </h2>
          <p className="text-gray-400 text-center mb-14 max-w-xl mx-auto">
            Three types of rescue transactions to save your assets
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Send,
                title: "ETH Rescue",
                desc: "Sweep remaining ETH to a safe wallet. Automatically calculates the maximum amount after gas costs.",
                color: "emerald",
              },
              {
                icon: FileText,
                title: "ENS Transfer",
                desc: "Transfer ENS name ownership via NameWrapper before the drainer can claim it. Protects your digital identity.",
                color: "violet",
              },
              {
                icon: Edit3,
                title: "ENS Record Update",
                desc: "Update text records like delegate addresses, descriptions, or URLs on your ENS name.",
                color: "cyan",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-violet-500/50 transition">
                  <div className={`w-12 h-12 bg-${item.color}-500/20 rounded-xl flex items-center justify-center mb-5`}>
                    <Icon className={`w-6 h-6 text-${item.color}-400`} />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
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
                "Optional Flashbots Protect for private TX submission",
                "Open source — inspect every line of code",
                "EIP-1559 transactions with aggressive priority fees",
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
            <span className="text-gray-500 text-sm">LUXBIN Drainer Defense</span>
          </div>
          <p className="text-gray-600 text-sm">Part of the LUXBIN Quantum Wallet Security suite</p>
        </div>
      </footer>
    </div>
  );
}
