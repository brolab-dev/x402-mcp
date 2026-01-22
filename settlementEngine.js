const config = require('./config');
const MCPClient = require('./mcpClient');
const { PolicyEngine } = require('./policyEngine');
const X402Client = require('./x402Client');

class SettlementEngine {
  constructor() {
    this.mcpClient = new MCPClient();
    this.policyEngine = new PolicyEngine();
    this.x402Client = new X402Client();
    this.isRunning = false;
    this.pollingInterval = null;
    this.settlementHistory = [];
    this.monitoredSymbols = ['BTC_USDT', 'ETH_USDT', 'CRO_USDT'];
  }

  /**
   * Start the settlement engine
   */
  async start() {
    console.log('🚀 Starting MCP-triggered x402 Auto-Settlement Engine...');
    console.log(`   Network: ${config.network} (Chain ID: ${config.chainId})`);
    console.log(`   Wallet: ${this.x402Client.getAddress()}`);
    console.log(`   Recipient: ${config.settlement.recipient}`);
    console.log(`   Settlement Amount: ${config.settlement.amount} USDC.e units`);
    console.log(`   Polling Interval: ${config.mcp.pollingIntervalMs}ms`);
    console.log(`   Active Policies: ${this.policyEngine.getActivePolicies().length}`);
    console.log('');

    // Check x402 facilitator health
    const health = await this.x402Client.checkHealth();
    if (health) {
      console.log('✅ x402 Facilitator is healthy');
    } else {
      console.log('⚠️ x402 Facilitator health check failed - continuing anyway');
    }

    this.isRunning = true;
    await this.runPollingLoop();
  }

  /**
   * Main polling loop
   */
  async runPollingLoop() {
    while (this.isRunning) {
      try {
        await this.checkAndSettle();
      } catch (error) {
        console.error('Error in polling loop:', error.message);
      }
      await this.sleep(config.mcp.pollingIntervalMs);
    }
  }

  /**
   * Check market data and trigger settlements if policies match
   */
  async checkAndSettle() {
    console.log(`\n📊 Fetching market data at ${new Date().toISOString()}...`);
    
    // Fetch market data for all monitored symbols
    const marketData = await this.mcpClient.getMultipleMarketData(this.monitoredSymbols);
    
    if (marketData.length === 0) {
      console.log('   No market data available');
      return;
    }

    // Log current market state
    for (const data of marketData) {
      console.log(`   ${data.symbol}: $${data.price?.toFixed(2) || 'N/A'} | Volatility: ${data.volatility?.toFixed(2) || 'N/A'}% | Change: ${data.priceChange?.toFixed(2) || 'N/A'}%`);
    }

    // Evaluate policies
    const triggered = this.policyEngine.evaluatePolicies(marketData);

    // Execute settlements for triggered policies
    for (const trigger of triggered) {
      await this.executeSettlement(trigger);
    }
  }

  /**
   * Execute a settlement based on triggered policy
   * @param {object} trigger - Triggered policy with market data
   */
  async executeSettlement(trigger) {
    console.log(`\n💰 Executing settlement for policy: ${trigger.policy.id}`);

    try {
      // Create payment authorization
      const authorization = await this.x402Client.createPaymentAuthorization(
        config.settlement.recipient,
        config.settlement.amount
      );

      console.log('   ✅ Payment authorization created');
      console.log(`   From: ${authorization.message.from}`);
      console.log(`   To: ${authorization.message.to}`);
      console.log(`   Amount: ${authorization.message.value} USDC.e units`);

      // Create payment header (base64 encoded)
      const paymentHeader = this.x402Client.createPaymentHeader(authorization);

      // Create payment requirements (what the resource expects)
      // x402 facilitator expects: network as 'cronos-testnet'/'cronos-mainnet', asset as token address
      const paymentRequirements = {
        scheme: 'exact',
        network: config.network, // 'cronos-testnet' or 'cronos-mainnet'
        maxAmountRequired: config.settlement.amount,
        resource: `settlement:${trigger.policy.id}`,
        description: `Auto-settlement triggered by ${trigger.policy.description}`,
        mimeType: 'application/json',
        payTo: config.settlement.recipient,
        maxTimeoutSeconds: 3600,
        asset: config.usdce.address, // Just the token address
      };

      console.log('   📤 Submitting settlement to x402 facilitator...');

      // Actually call the x402 settle API
      const settleResult = await this.x402Client.settlePayment(paymentHeader, paymentRequirements);
      console.log('   API Response:', JSON.stringify(settleResult, null, 2));

      // Store settlement record
      const settlementRecord = {
        policyId: trigger.policy.id,
        triggeredAt: trigger.triggeredAt,
        triggerValue: trigger.triggerValue,
        marketData: trigger.marketData,
        authorization: authorization.message,
        status: settleResult?.status || 'submitted',
        txHash: settleResult?.txHash || null,
        result: settleResult,
        timestamp: Date.now(),
      };

      this.settlementHistory.push(settlementRecord);

      if (settleResult?.txHash) {
        console.log(`   ✅ Settlement confirmed on-chain!`);
        console.log(`   TX Hash: ${settleResult.txHash}`);
      } else {
        console.log(`   ⚠️ Settlement submitted (status: ${settleResult?.status || 'unknown'})`);
      }
      console.log(`   Total settlements: ${this.settlementHistory.length}`);

    } catch (error) {
      console.error(`   ❌ Settlement failed: ${error.response?.data?.error || error.message}`);

      // Store failed settlement
      this.settlementHistory.push({
        policyId: trigger.policy.id,
        triggeredAt: trigger.triggeredAt,
        status: 'failed',
        error: error.response?.data?.error || error.message,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Stop the settlement engine
   */
  stop() {
    console.log('\n🛑 Stopping settlement engine...');
    this.isRunning = false;
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
  }

  /**
   * Get settlement history
   */
  getSettlementHistory() {
    return this.settlementHistory;
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = SettlementEngine;

