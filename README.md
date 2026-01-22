# MCP-Triggered x402 Auto-Settlement Engine

A policy-based settlement engine that monitors Crypto.com MCP market data and automatically triggers x402 settlement intents on Cronos EVM using EIP-3009 payment authorizations.

## Overview

This application combines three key components:
- **MCP Market Data**: Real-time monitoring of Crypto.com's market prices
- **Policy Engine**: Configurable rules that evaluate market conditions
- **x402 Settlement**: Automatic execution of USDC.e transfers via EIP-3009 on Cronos

When market conditions meet your defined policies (e.g., volatility thresholds, price changes), the engine automatically creates and submits x402 settlement intents for gasless USDC.e transfers.

## Features

- 🔄 **Real-time Market Monitoring**: Connects to Crypto.com MCP for live price data
- 📋 **Policy-Based Triggers**: Configurable volatility and price change thresholds
- ⚡ **Gasless Settlements**: Uses x402 facilitator for EIP-3009 payment authorizations
- 🌐 **Multi-Network Support**: Works on both Cronos testnet and mainnet
- 📊 **REST API**: Monitor engine status, view settlement history, and manage policies
- 🔒 **Secure**: Private key management with environment variables

## Quick Start

### Prerequisites

- Node.js 16+
- A Cronos wallet with USDC.e tokens
- Private key for signing transactions

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/brolab-dev/x402-mcp.git
   cd x402-mcp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```

4. **Edit `.env` with your settings**
   ```env
   # Required: Private key for signing x402 payment authorizations
   PRIVATE_KEY=your_private_key_here

   # Required: Recipient wallet for settlements
   SETTLEMENT_RECIPIENT=0x...

   # Network: cronos-testnet or cronos-mainnet
   NETWORK=cronos-testnet

   # Settlement amount in USDC.e base units (1000000 = 1 USDC.e)
   SETTLEMENT_AMOUNT=1000000

   # Policy thresholds
   VOLATILITY_THRESHOLD=5
   PRICE_CHANGE_THRESHOLD=3
   POLLING_INTERVAL_MS=30000
   ```

5. **Start the engine**
   ```bash
   npm start
   ```

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PRIVATE_KEY` | ✅ | - | Private key for signing EIP-3009 authorizations |
| `SETTLEMENT_RECIPIENT` | ✅ | - | Wallet address to receive settlements |
| `NETWORK` | ❌ | `cronos-testnet` | Network to use (`cronos-testnet` or `cronos-mainnet`) |
| `SETTLEMENT_AMOUNT` | ❌ | `1000000` | Amount in USDC.e base units (6 decimals) |
| `VOLATILITY_THRESHOLD` | ❌ | `5` | Volatility percentage threshold |
| `PRICE_CHANGE_THRESHOLD` | ❌ | `3` | Price change percentage threshold |
| `POLLING_INTERVAL_MS` | ❌ | `30000` | Market data polling interval (ms) |
| `RPC_URL` | ❌ | Network default | Custom RPC endpoint |

### Network Configuration

**Cronos Testnet**
- Chain ID: 338
- RPC: https://evm-t3.cronos.org
- USDC.e: `0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0`

**Cronos Mainnet**
- Chain ID: 25
- RPC: https://evm.cronos.org
- USDC.e: `0xf951eC28187D9E5Ca673Da8FE6757E6f0Be5F77C`

## API Endpoints

The engine exposes several REST endpoints for monitoring:

```bash
# Health check
GET http://localhost:3000/health

# Engine status and configuration
GET http://localhost:3000/status

# Settlement history
GET http://localhost:3000/settlements

# Active policies
GET http://localhost:3000/policies
```

## How It Works

1. **Market Data Collection**: Continuously polls Crypto.com MCP API for price data
2. **Policy Evaluation**: Checks if current market conditions meet configured thresholds
3. **Settlement Creation**: When triggered, creates an EIP-3009 payment authorization
4. **x402 Submission**: Submits the signed authorization to the x402 facilitator
5. **Gasless Execution**: Facilitator executes the USDC.e transfer without requiring gas

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Crypto.com    │───▶│  Policy Engine   │───▶│ Settlement      │
│   MCP API       │    │  (Thresholds)    │    │ Engine          │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Cronos EVM    │◀───│  x402 Facilitator│◀───│ EIP-3009        │
│   (USDC.e)      │    │  API             │    │ Authorization   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Development

### Scripts

```bash
npm start     # Start the engine
npm run dev   # Start with auto-reload
```

### Project Structure

```
├── index.js              # Main application entry point
├── config.js             # Configuration management
├── settlementEngine.js   # Core settlement logic
├── policyEngine.js       # Market condition policies
├── x402Client.js         # x402 facilitator interface
├── mcpClient.js          # Crypto.com MCP client
└── .env.example          # Environment template
```

## Security Considerations

- Store private keys securely (use environment variables, not hardcoded)
- Test thoroughly on testnet before mainnet deployment
- Monitor settlement amounts and frequency
- Keep dependencies updated
- Consider implementing additional access controls for production

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

- GitHub Issues: Report bugs and request features
- Documentation: Check inline code comments for implementation details
- Community: Join discussions in the repository

---

**⚠️ Disclaimer**: This is experimental software. Use at your own risk and test thoroughly before production deployment.