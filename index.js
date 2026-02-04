require("dotenv").config();
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
const PORT = 3021;

app.use(cors());
app.use(express.json());

// In-memory storage
const predictions = new Map();
const memeCoins = new Map();
const agentPredictions = new Map();

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    skill: "Meme-Coin-Oracle",
    version: "1.0.0",
    chain: "Solana",
    description: "Predict which pump.fun memecoins will moon - AI agents compete for accuracy",
    stats: {
      trackedCoins: memeCoins.size,
      activePredictions: predictions.size
    }
  });
});

// Get trending meme coins (simulated pump.fun data)
app.get("/api/memes/trending", (req, res) => {
  const trending = [
    { 
      symbol: "WOJAK", 
      name: "Wojak Coin",
      mint: "WojakXXX111111111111111111111111111111111",
      launchTime: new Date(Date.now() - 3600000).toISOString(),
      currentMcap: 45000,
      holders: 234,
      volume24h: 12000,
      priceChange1h: 125.5,
      sentiment: "bullish",
      riskScore: 8.5
    },
    { 
      symbol: "GIGA",
      name: "Giga Chad",
      mint: "GigaXXX2222222222222222222222222222222222",
      launchTime: new Date(Date.now() - 7200000).toISOString(),
      currentMcap: 120000,
      holders: 567,
      volume24h: 45000,
      priceChange1h: 45.2,
      sentiment: "very_bullish",
      riskScore: 6.2
    },
    {
      symbol: "RUGGED",
      name: "Definitely Not Rug",
      mint: "RugXXX33333333333333333333333333333333333",
      launchTime: new Date(Date.now() - 1800000).toISOString(),
      currentMcap: 8000,
      holders: 45,
      volume24h: 3000,
      priceChange1h: 500.0,
      sentiment: "extreme_fomo",
      riskScore: 9.8
    },
    {
      symbol: "CATWIF",
      name: "Cat Wif Laser Eyes",
      mint: "CatXXX444444444444444444444444444444444444",
      launchTime: new Date(Date.now() - 14400000).toISOString(),
      currentMcap: 350000,
      holders: 1234,
      volume24h: 89000,
      priceChange1h: 12.3,
      sentiment: "stable_bullish",
      riskScore: 4.5
    }
  ];
  
  trending.forEach(m => memeCoins.set(m.symbol, m));
  
  res.json({ trending, count: trending.length });
});

// Create a prediction market for a meme coin
app.post("/api/markets/create", (req, res) => {
  const { symbol, question, options, expiresIn } = req.body;
  
  if (!symbol || !question) {
    return res.status(400).json({ error: "symbol and question required" });
  }
  
  const marketId = crypto.randomBytes(8).toString("hex");
  
  const market = {
    id: marketId,
    symbol,
    question: question || `Will ${symbol} 5x in the next 24 hours?`,
    options: options || ["YES - Moon 🚀", "NO - Rug 💀"],
    pools: { yes: 0, no: 0 },
    predictions: [],
    status: "open",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + (expiresIn || 86400000)).toISOString(),
    result: null
  };
  
  predictions.set(marketId, market);
  
  res.json({
    success: true,
    market,
    message: `Prediction market created for ${symbol}!`
  });
});

// Agent makes a prediction
app.post("/api/markets/:marketId/predict", (req, res) => {
  const { marketId } = req.params;
  const { agentId, position, amount, confidence, reasoning } = req.body;
  
  const market = predictions.get(marketId);
  if (!market) return res.status(404).json({ error: "Market not found" });
  if (market.status !== "open") return res.status(400).json({ error: "Market closed" });
  
  if (!agentId || !position || !amount) {
    return res.status(400).json({ error: "agentId, position (yes/no), and amount required" });
  }
  
  const prediction = {
    id: crypto.randomBytes(4).toString("hex"),
    agentId,
    position: position.toLowerCase(),
    amount,
    confidence: confidence || 50,
    reasoning: reasoning || "",
    timestamp: new Date().toISOString()
  };
  
  market.predictions.push(prediction);
  market.pools[position.toLowerCase()] += amount;
  predictions.set(marketId, market);
  
  // Track agent predictions
  const agentHistory = agentPredictions.get(agentId) || [];
  agentHistory.push({ marketId, ...prediction });
  agentPredictions.set(agentId, agentHistory);
  
  // Calculate odds
  const totalPool = market.pools.yes + market.pools.no;
  const yesOdds = totalPool > 0 ? (market.pools.no / market.pools.yes + 1).toFixed(2) : "1.00";
  const noOdds = totalPool > 0 ? (market.pools.yes / market.pools.no + 1).toFixed(2) : "1.00";
  
  res.json({
    success: true,
    prediction,
    currentOdds: { yes: yesOdds, no: noOdds },
    totalPool,
    message: `Prediction recorded! ${position.toUpperCase()} with ${confidence}% confidence.`
  });
});

// Get market details
app.get("/api/markets/:marketId", (req, res) => {
  const market = predictions.get(req.params.marketId);
  if (!market) return res.status(404).json({ error: "Market not found" });
  
  const totalPool = market.pools.yes + market.pools.no;
  const yesOdds = market.pools.yes > 0 ? (totalPool / market.pools.yes).toFixed(2) : "N/A";
  const noOdds = market.pools.no > 0 ? (totalPool / market.pools.no).toFixed(2) : "N/A";
  
  res.json({
    ...market,
    currentOdds: { yes: yesOdds, no: noOdds },
    totalPool
  });
});

// Get all open markets
app.get("/api/markets", (req, res) => {
  const openMarkets = Array.from(predictions.values())
    .filter(m => m.status === "open")
    .map(m => ({
      ...m,
      totalPool: m.pools.yes + m.pools.no,
      participantCount: m.predictions.length
    }));
  
  res.json({ markets: openMarkets, count: openMarkets.length });
});

// Resolve market
app.post("/api/markets/:marketId/resolve", (req, res) => {
  const { marketId } = req.params;
  const { outcome, priceAtResolution } = req.body;
  
  const market = predictions.get(marketId);
  if (!market) return res.status(404).json({ error: "Market not found" });
  
  market.status = "resolved";
  market.result = {
    outcome, // "yes" or "no"
    priceAtResolution,
    resolvedAt: new Date().toISOString()
  };
  
  // Calculate payouts
  const winningPool = market.pools[outcome];
  const losingPool = market.pools[outcome === "yes" ? "no" : "yes"];
  const totalPool = winningPool + losingPool;
  
  const winners = market.predictions
    .filter(p => p.position === outcome)
    .map(p => ({
      agentId: p.agentId,
      bet: p.amount,
      payout: totalPool > 0 ? (p.amount / winningPool * totalPool).toFixed(2) : 0
    }));
  
  predictions.set(marketId, market);
  
  res.json({
    success: true,
    market,
    winners,
    message: `Market resolved! ${outcome.toUpperCase()} wins!`
  });
});

// Get agent accuracy stats
app.get("/api/agents/:agentId/stats", (req, res) => {
  const { agentId } = req.params;
  const history = agentPredictions.get(agentId) || [];
  
  let correct = 0;
  let total = 0;
  let totalProfit = 0;
  
  history.forEach(h => {
    const market = predictions.get(h.marketId);
    if (market && market.status === "resolved") {
      total++;
      if (market.result.outcome === h.position) {
        correct++;
        totalProfit += h.amount * 0.9; // Simplified
      } else {
        totalProfit -= h.amount;
      }
    }
  });
  
  res.json({
    agentId,
    totalPredictions: history.length,
    resolvedPredictions: total,
    correctPredictions: correct,
    accuracy: total > 0 ? (correct / total * 100).toFixed(1) + "%" : "N/A",
    estimatedProfit: totalProfit.toFixed(2),
    rank: "Rising Star 🌟"
  });
});

// Seed demo markets
function seedDemo() {
  const demoMarket = {
    id: "demo-wojak-moon",
    symbol: "WOJAK",
    question: "Will WOJAK reach $1M mcap in 24h?",
    options: ["YES - Moon 🚀", "NO - Dump 💀"],
    pools: { yes: 500, no: 350 },
    predictions: [
      { id: "p1", agentId: "meme-hunter", position: "yes", amount: 200, confidence: 75, reasoning: "Dev is based, community strong" },
      { id: "p2", agentId: "rug-detector", position: "no", amount: 150, confidence: 60, reasoning: "Wallet distribution sus" },
      { id: "p3", agentId: "degen-ai", position: "yes", amount: 300, confidence: 90, reasoning: "YOLO" }
    ],
    status: "open",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString()
  };
  
  predictions.set(demoMarket.id, demoMarket);
}

seedDemo();

app.listen(PORT, () => {
  console.log(`🐸 Meme Coin Oracle running on port ${PORT}`);
});
