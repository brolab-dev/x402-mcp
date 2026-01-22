const config = require('./config');

/**
 * Policy types for triggering settlements
 */
const POLICY_TYPES = {
  VOLATILITY: 'volatility',
  PRICE_CHANGE: 'price_change',
  PRICE_THRESHOLD: 'price_threshold',
};

class PolicyEngine {
  constructor() {
    this.policies = [];
    this.loadDefaultPolicies();
  }

  /**
   * Load default policies from config
   */
  loadDefaultPolicies() {
    // Volatility-based policy
    this.addPolicy({
      id: 'default-volatility',
      type: POLICY_TYPES.VOLATILITY,
      symbol: 'BTC_USDT',
      threshold: config.policy.volatilityThreshold,
      operator: '>',
      description: `Settle when BTC volatility exceeds ${config.policy.volatilityThreshold}%`,
    });

    // Price change policy
    this.addPolicy({
      id: 'default-price-change',
      type: POLICY_TYPES.PRICE_CHANGE,
      symbol: 'BTC_USDT',
      threshold: config.policy.priceChangeThreshold,
      operator: 'abs>',
      description: `Settle when BTC price changes more than ${config.policy.priceChangeThreshold}%`,
    });
  }

  /**
   * Add a new policy
   * @param {object} policy - Policy configuration
   */
  addPolicy(policy) {
    this.policies.push({
      ...policy,
      enabled: true,
      createdAt: Date.now(),
    });
  }

  /**
   * Remove a policy by ID
   * @param {string} policyId - Policy ID to remove
   */
  removePolicy(policyId) {
    this.policies = this.policies.filter(p => p.id !== policyId);
  }

  /**
   * Evaluate a condition based on operator
   * @param {number} value - Current value
   * @param {string} operator - Comparison operator
   * @param {number} threshold - Threshold value
   */
  evaluateCondition(value, operator, threshold) {
    switch (operator) {
      case '>': return value > threshold;
      case '<': return value < threshold;
      case '>=': return value >= threshold;
      case '<=': return value <= threshold;
      case '==': return value === threshold;
      case 'abs>': return Math.abs(value) > threshold;
      case 'abs<': return Math.abs(value) < threshold;
      default: return false;
    }
  }

  /**
   * Evaluate all policies against market data
   * @param {object[]} marketDataArray - Array of market data objects
   * @returns {object[]} - Array of triggered policies with market data
   */
  evaluatePolicies(marketDataArray) {
    const triggered = [];

    for (const policy of this.policies) {
      if (!policy.enabled) continue;

      const marketData = marketDataArray.find(m => m.symbol === policy.symbol);
      if (!marketData) continue;

      let value;
      switch (policy.type) {
        case POLICY_TYPES.VOLATILITY:
          value = marketData.volatility;
          break;
        case POLICY_TYPES.PRICE_CHANGE:
          value = marketData.priceChange;
          break;
        case POLICY_TYPES.PRICE_THRESHOLD:
          value = marketData.price;
          break;
        default:
          continue;
      }

      if (this.evaluateCondition(value, policy.operator, policy.threshold)) {
        triggered.push({
          policy,
          marketData,
          triggeredAt: Date.now(),
          triggerValue: value,
        });
        console.log(`🔔 Policy triggered: ${policy.description}`);
        console.log(`   Value: ${value.toFixed(2)}, Threshold: ${policy.threshold}`);
      }
    }

    return triggered;
  }

  /**
   * Get all active policies
   */
  getActivePolicies() {
    return this.policies.filter(p => p.enabled);
  }
}

module.exports = { PolicyEngine, POLICY_TYPES };

