import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { address, riskLevel, sweepCount, botDestination, approvalCount } =
      await req.json();

    const apiKey = process.env.YOU_API_KEY;

    // Build a contextual threat intel query
    const riskContext =
      riskLevel === "high"
        ? `HIGH RISK drainer bot detected — ${sweepCount} sweep patterns${botDestination ? `, sweeping to ${botDestination}` : ""}`
        : riskLevel === "medium"
        ? `MEDIUM RISK suspicious activity — ${sweepCount} sweep patterns detected`
        : "no active drainer bot detected";

    const query =
      riskLevel !== "low"
        ? `ethereum wallet drainer attack defense: ${riskContext}. What are the best methods to rescue ETH and tokens from a compromised wallet with an active drainer bot? Include Flashbots Protect and atomic bundle strategies.`
        : `ethereum wallet security: ${approvalCount} active token approvals detected. What are the risks of unlimited ERC-20 approvals and how should users protect their wallets?`;

    if (!apiKey) {
      // Intelligent demo response without API key
      const demoAnswer =
        riskLevel === "high"
          ? `⚠️ HIGH RISK DETECTED: Your wallet shows aggressive drainer bot activity with ${sweepCount} deposit-sweep pattern(s). The bot monitors mempool transactions and reacts within seconds of any ETH deposit.\n\n🛡️ RECOMMENDED ACTIONS:\n1. Use Flashbots Atomic Bundle mode — sends your fund + rescue in a single private bundle that the drainer cannot see or front-run\n2. Set priority fee at least 1.5× the bot's estimated gas (shown above)\n3. Execute from a completely new wallet with no history\n4. Do not send ETH directly — use the Atomic Bundle option exclusively\n\n⚡ Time is critical — every second counts with an active drainer.`
          : riskLevel === "medium"
          ? `⚠️ MEDIUM RISK: Suspicious sweep patterns detected. The wallet shows ${sweepCount} deposit-sweep sequence(s) suggesting automated monitoring.\n\n🛡️ RECOMMENDED ACTIONS:\n1. Enable Flashbots Protect for private transaction submission\n2. Use higher priority fees (1.2× estimated bot gas)\n3. Consider Atomic Bundle mode for extra safety\n4. Revoke any active token approvals first`
          : `✅ NO ACTIVE DRAINER DETECTED — however ${approvalCount || 0} active token approval(s) represent ongoing risk.\n\n🛡️ RECOMMENDED ACTIONS:\n1. Revoke unlimited approvals using the Approval Revoke tool\n2. Use standard gas settings for rescue operations\n3. Consider hardware wallet for future security\n4. Review all active approvals — unlimited allowances can be exploited anytime`;

      return NextResponse.json({
        answer: demoAnswer,
        sources: [
          {
            title: "Flashbots Protect — MEV Protection",
            url: "https://docs.flashbots.net/flashbots-protect/overview",
          },
          {
            title: "Understanding Token Approvals",
            url: "https://support.metamask.io/hc/en-us/articles/6174898326683",
          },
          {
            title: "ERC-4337 Account Abstraction",
            url: "https://eips.ethereum.org/EIPS/eip-4337",
          },
        ],
        demo: true,
      });
    }

    // Call You.com RAG API for real-time web-sourced intelligence
    const response = await fetch(
      `https://api.ydc-index.io/rag?query=${encodeURIComponent(query)}&num_web_results=5`,
      {
        headers: {
          "X-API-Key": apiKey,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`You.com API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Extract answer and sources from You.com response
    const answer =
      data.answer ||
      data.ai_snippets?.map((s: { snippet: string }) => s.snippet).join("\n\n") ||
      "No threat intelligence available.";

    const sources =
      data.hits?.map((h: { title: string; url: string }) => ({
        title: h.title,
        url: h.url,
      })) || [];

    return NextResponse.json({ answer, sources, demo: false });
  } catch (error) {
    console.error("Threat intel error:", error);
    return NextResponse.json(
      { error: "Failed to fetch threat intelligence", answer: null, sources: [] },
      { status: 500 }
    );
  }
}
