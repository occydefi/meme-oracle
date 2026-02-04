const Anthropic = require("@anthropic-ai/sdk");
const client = new Anthropic();

async function analyzeMeme(coinData) {
  const msg = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    messages: [{
      role: "user",
      content: `You are the Meme Oracle, an AI expert at predicting which Solana memecoins will moon or rug. Analyze this token:
Symbol: ${coinData.symbol}, Name: ${coinData.name}
Market Cap: $${coinData.currentMcap}, Holders: ${coinData.holders}
24h Volume: $${coinData.volume24h}, 1h Change: ${coinData.priceChange1h}%
Risk Score: ${coinData.riskScore}/10

Give your prediction: MOON or RUG? Include confidence %, key risk factors, and a memecoin-style verdict. Reference pump.fun patterns and Solana DEX liquidity. Keep it punchy (3-4 sentences).`
    }]
  });
  return msg.content[0].text;
}

async function predictMarket(question, currentOdds, predictions) {
  const msg = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 400,
    messages: [{
      role: "user",
      content: `You are analyzing a memecoin prediction market on Solana.
Question: ${question}
Current YES pool: ${currentOdds.yes} | NO pool: ${currentOdds.no}
Number of predictions: ${predictions}

Provide AI analysis: which side has more merit? What on-chain signals support each position? Give a brief recommendation with reasoning. Be specific about Solana memecoin patterns.`
    }]
  });
  return msg.content[0].text;
}

async function rugCheck(tokenData) {
  const msg = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 400,
    messages: [{
      role: "user",
      content: `Perform an AI rug-check analysis for a Solana memecoin:
Symbol: ${tokenData.symbol}, Holders: ${tokenData.holders}, MCap: $${tokenData.currentMcap}
Volume: $${tokenData.volume24h}, Risk: ${tokenData.riskScore}/10

Check for: concentrated holdings, low liquidity, suspicious dev wallet patterns, honeypot indicators. Give a SAFE/CAUTION/DANGER rating with explanation. Be brutally honest.`
    }]
  });
  return msg.content[0].text;
}

module.exports = { analyzeMeme, predictMarket, rugCheck };
