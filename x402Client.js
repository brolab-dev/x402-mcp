const { ethers } = require('ethers');
const axios = require('axios');
const config = require('./config');

class X402Client {
  constructor() {
    if (!config.privateKey) {
      throw new Error('PRIVATE_KEY is required in environment variables');
    }
    
    this.wallet = new ethers.Wallet(config.privateKey);
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.walletConnected = this.wallet.connect(this.provider);
    
    // EIP-712 domain for USDC.e
    this.domain = {
      name: config.usdce.name,
      version: config.usdce.version,
      chainId: config.chainId,
      verifyingContract: config.usdce.address,
    };

    // EIP-3009 TransferWithAuthorization types
    this.types = {
      TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
      ],
    };
  }

  /**
   * Generate a random nonce for EIP-3009
   */
  generateNonce() {
    return ethers.hexlify(ethers.randomBytes(32));
  }

  /**
   * Create EIP-3009 payment authorization
   * @param {string} to - Recipient address
   * @param {string} value - Amount in base units
   * @param {number} validitySeconds - How long the authorization is valid
   */
  async createPaymentAuthorization(to, value, validitySeconds = 3600) {
    const now = Math.floor(Date.now() / 1000);
    const validAfter = 0; // Valid immediately (per documentation example)
    const validBefore = now + validitySeconds;
    const nonce = this.generateNonce();

    const message = {
      from: this.wallet.address,
      to,
      value: value.toString(),
      validAfter,
      validBefore,
      nonce,
    };

    // Sign the EIP-712 typed data
    const signature = await this.wallet.signTypedData(this.domain, this.types, message);

    // Return payload in the format expected by x402 facilitator
    // Per documentation: payload contains from, to, value, validAfter, validBefore, nonce, signature, asset
    return {
      payload: {
        from: this.wallet.address,
        to,
        value: value.toString(),
        validAfter,
        validBefore,
        nonce,
        signature,
        asset: config.usdce.address,
      },
      message,
    };
  }

  /**
   * Create x402 payment header (base64 encoded)
   * @param {object} authorization - Payment authorization object
   */
  createPaymentHeader(authorization) {
    const paymentData = {
      x402Version: 1,
      scheme: 'exact',
      network: config.network, // Use 'cronos-testnet' or 'cronos-mainnet'
      payload: authorization.payload,
    };
    return Buffer.from(JSON.stringify(paymentData)).toString('base64');
  }

  /**
   * Verify payment with x402 facilitator
   * @param {string} paymentHeader - Base64 encoded payment header
   * @param {object} paymentRequirements - Payment requirements from resource
   */
  async verifyPayment(paymentHeader, paymentRequirements) {
    try {
      const response = await axios.post(
        `${config.x402.baseUrl}${config.x402.endpoints.verify}`,
        { paymentHeader, paymentRequirements },
        {
          headers: {
            'Content-Type': 'application/json',
            'X402-Version': config.x402.version,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Payment verification failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Settle payment with x402 facilitator
   * @param {string} paymentHeader - Base64 encoded payment header
   * @param {object} paymentRequirements - Payment requirements object
   */
  async settlePayment(paymentHeader, paymentRequirements) {
    try {
      const response = await axios.post(
        `${config.x402.baseUrl}${config.x402.endpoints.settle}`,
        {
          x402Version: 1,
          paymentHeader,
          paymentRequirements,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X402-Version': config.x402.version,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Payment settlement failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get wallet address
   */
  getAddress() {
    return this.wallet.address;
  }

  /**
   * Check x402 facilitator health by querying supported networks
   */
  async checkHealth() {
    try {
      const response = await axios.get(
        `${config.x402.baseUrl}${config.x402.endpoints.supported}`
      );
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error.message);
      return null;
    }
  }

  /**
   * Get supported networks from x402 facilitator
   */
  async getSupportedNetworks() {
    try {
      const response = await axios.get(
        `${config.x402.baseUrl}${config.x402.endpoints.supported}`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get supported networks:', error.message);
      return null;
    }
  }
}

module.exports = X402Client;

