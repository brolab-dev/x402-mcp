require('dotenv').config();

const NETWORKS = {
  'cronos-testnet': {
    chainId: 338,
    rpcUrl: 'https://evm-t3.cronos.org',
    usdceAddress: '0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0',
  },
  'cronos-mainnet': {
    chainId: 25,
    rpcUrl: 'https://evm.cronos.org',
    usdceAddress: '0xf951eC28187D9E5Ca673Da8FE6757E6f0Be5F77C',
  },
};

const network = process.env.NETWORK || 'cronos-testnet';
const networkConfig = NETWORKS[network];

if (!networkConfig) {
  throw new Error(`Invalid network: ${network}. Use 'cronos-testnet' or 'cronos-mainnet'`);
}

module.exports = {
  // Network configuration
  network,
  chainId: networkConfig.chainId,
  rpcUrl: process.env.RPC_URL || networkConfig.rpcUrl,
  
  // USDC.e token configuration (EIP-712 domain)
  usdce: {
    address: networkConfig.usdceAddress,
    name: 'Bridged USDC (Stargate)',
    version: '1',
    decimals: 6,
  },
  
  // x402 Facilitator API
  x402: {
    baseUrl: 'https://facilitator.cronoslabs.org/v2/x402',
    endpoints: {
      healthcheck: '/healthcheck',
      supported: '/supported',
      verify: '/verify',
      settle: '/settle',
    },
    version: '1',
  },
  
  // MCP API configuration (simulated for demo - actual endpoints vary)
  mcp: {
    baseUrl: 'https://api.crypto.com/v2',
    wsUrl: 'wss://stream.crypto.com/v2/market',
    pollingIntervalMs: parseInt(process.env.POLLING_INTERVAL_MS) || 30000,
  },
  
  // Wallet configuration
  privateKey: process.env.PRIVATE_KEY,
  
  // Settlement configuration
  settlement: {
    recipient: process.env.SETTLEMENT_RECIPIENT,
    amount: process.env.SETTLEMENT_AMOUNT || '1000000', // 1 USDC.e default
  },
  
  // Policy thresholds
  policy: {
    volatilityThreshold: parseFloat(process.env.VOLATILITY_THRESHOLD) || 5,
    priceChangeThreshold: parseFloat(process.env.PRICE_CHANGE_THRESHOLD) || 3,
  },
};

