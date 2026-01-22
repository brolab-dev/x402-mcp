require('dotenv').config();
const express = require('express');
const SettlementEngine = require('./settlementEngine');
const config = require('./config');

// Validate required environment variables
function validateConfig() {
  const required = ['PRIVATE_KEY', 'SETTLEMENT_RECIPIENT'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nPlease copy .env.example to .env and fill in the values.');
    process.exit(1);
  }
}

// Main application
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   MCP-Triggered x402 Auto-Settlement Engine');
  console.log('   Crypto.com MCP → Policy Engine → x402 on Cronos EVM');
  console.log('═══════════════════════════════════════════════════════════\n');

  validateConfig();

  // Initialize settlement engine
  const engine = new SettlementEngine();

  // Optional: Start Express server for status endpoint
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  app.get('/status', (req, res) => {
    res.json({
      network: config.network,
      chainId: config.chainId,
      wallet: engine.x402Client.getAddress(),
      recipient: config.settlement.recipient,
      settlementAmount: config.settlement.amount,
      activePolicies: engine.policyEngine.getActivePolicies().length,
      totalSettlements: engine.getSettlementHistory().length,
    });
  });

  app.get('/settlements', (req, res) => {
    res.json(engine.getSettlementHistory());
  });

  app.get('/policies', (req, res) => {
    res.json(engine.policyEngine.getActivePolicies());
  });

  // Start HTTP server
  app.listen(PORT, () => {
    console.log(`📡 Status server running on http://localhost:${PORT}`);
    console.log(`   GET /health - Health check`);
    console.log(`   GET /status - Engine status`);
    console.log(`   GET /settlements - Settlement history`);
    console.log(`   GET /policies - Active policies\n`);
  });

  // Graceful shutdown handlers
  process.on('SIGINT', () => {
    console.log('\nReceived SIGINT...');
    engine.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM...');
    engine.stop();
    process.exit(0);
  });

  // Start the settlement engine
  await engine.start();
}

// Run the application
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

