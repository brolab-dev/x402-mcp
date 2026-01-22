const axios = require('axios');
const config = require('./config');

class MCPClient {
  constructor() {
    this.baseUrl = config.mcp.baseUrl;
    this.lastPrices = {};
    this.volatilityData = {};
  }

  /**
   * Fetch current ticker price for a symbol
   * @param {string} symbol - Trading pair (e.g., 'BTC_USDT', 'ETH_USDT')
   */
  async getTickerPrice(symbol) {
    try {
      const response = await axios.get(`${this.baseUrl}/public/get-ticker`, {
        params: { instrument_name: symbol },
      });

      // API returns data in result.data array with first element containing ticker info
      // Fields: i=instrument, a=ask, b=bid, h=high24h, l=low24h, v=volume, c=change, t=timestamp
      if (response.data && response.data.result && response.data.result.data && response.data.result.data[0]) {
        const data = response.data.result.data[0];
        return {
          symbol,
          price: parseFloat(data.a), // Best ask price
          bid: parseFloat(data.b),
          high24h: parseFloat(data.h),
          low24h: parseFloat(data.l),
          volume24h: parseFloat(data.v),
          change24h: parseFloat(data.c) * 100, // Convert to percentage
          timestamp: Date.now(),
        };
      }
      return null;
    } catch (error) {
      console.error(`Error fetching ticker for ${symbol}:`, error.message);
      return null;
    }
  }

  /**
   * Calculate volatility based on 24h high/low range
   * @param {object} ticker - Ticker data
   */
  calculateVolatility(ticker) {
    if (!ticker || !ticker.high24h || !ticker.low24h) return 0;
    const range = ticker.high24h - ticker.low24h;
    const midPrice = (ticker.high24h + ticker.low24h) / 2;
    return (range / midPrice) * 100; // Volatility as percentage
  }

  /**
   * Calculate price change from last recorded price
   * @param {string} symbol - Trading pair
   * @param {number} currentPrice - Current price
   */
  calculatePriceChange(symbol, currentPrice) {
    const lastPrice = this.lastPrices[symbol];
    if (!lastPrice) {
      this.lastPrices[symbol] = currentPrice;
      return 0;
    }
    const change = ((currentPrice - lastPrice) / lastPrice) * 100;
    this.lastPrices[symbol] = currentPrice;
    return change;
  }

  /**
   * Get market data with volatility and price change metrics
   * @param {string} symbol - Trading pair
   */
  async getMarketData(symbol) {
    const ticker = await this.getTickerPrice(symbol);
    if (!ticker) return null;

    const volatility = this.calculateVolatility(ticker);
    const priceChange = this.calculatePriceChange(symbol, ticker.price);

    return {
      ...ticker,
      volatility,
      priceChange,
    };
  }

  /**
   * Get market data for multiple symbols
   * @param {string[]} symbols - Array of trading pairs
   */
  async getMultipleMarketData(symbols) {
    const results = await Promise.all(
      symbols.map(symbol => this.getMarketData(symbol))
    );
    return results.filter(Boolean);
  }
}

module.exports = MCPClient;

