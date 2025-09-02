/**
 * Base interface/contract for all LLM providers
 * 
 * All LLM providers (Chrome, OpenAI, Claude, Local) must implement this interface
 * to ensure consistent behavior and easy extensibility.
 */

export class LLMProviderInterface {
  /**
   * Check if this provider is available and ready to use
   * @returns {Promise<'ready'|'downloading'|'unavailable'>}
   */
  async checkAvailability() {
    throw new Error('checkAvailability() must be implemented by provider')
  }

  /**
   * Create a new session with the given configuration
   * @param {Object} config - Session configuration
   * @param {string} config.systemPrompt - System prompt for the session
   * @param {Function} [config.onProgress] - Progress callback for downloads
   * @param {Object} [config.options] - Provider-specific options
   * @returns {Promise<Object>} Session object
   */
  async createSession(config) {
    throw new Error('createSession() must be implemented by provider')
  }

  /**
   * Analyze a prompt using this provider
   * @param {string} prompt - User prompt to analyze
   * @param {Object} context - Context information (field info, etc.)
   * @param {Function} [onProgress] - Progress callback
   * @returns {Promise<Object>} Standardized analysis result
   */
  async analyzePrompt(prompt, context, onProgress) {
    throw new Error('analyzePrompt() must be implemented by provider')
  }

  /**
   * Cleanup provider resources
   * @returns {Promise<void>}
   */
  async destroy() {
    // Default implementation - providers can override
    console.log(`[${this.providerName}] Destroying provider`)
  }

  /**
   * Get provider name
   * @returns {string} Provider identifier
   */
  get providerName() {
    throw new Error('providerName getter must be implemented by provider')
  }

  /**
   * Get provider capabilities
   * @returns {string[]} List of capabilities
   */
  get capabilities() {
    return ['analysis'] // Default capability
  }

  /**
   * Check if provider requires authentication
   * @returns {boolean}
   */
  get requiresAuth() {
    return false // Default: no auth required
  }

  /**
   * Get provider metadata
   * @returns {Object} Provider information
   */
  get metadata() {
    return {
      name: this.providerName,
      capabilities: this.capabilities,
      requiresAuth: this.requiresAuth,
      description: 'LLM Provider'
    }
  }
}

/**
 * Standardized analysis result format
 * All providers should return results in this format
 */
export const createAnalysisResult = ({
  success = true,
  issues = [],
  suggestions = [],
  optimizedPrompt = '',
  vaguenessScore = 5,
  provider = 'unknown',
  confidence = 0.8,
  metadata = {}
}) => ({
  success,
  issues,
  suggestions,
  optimizedPrompt,
  vaguenessScore,
  provider,
  confidence,
  metadata: {
    timestamp: Date.now(),
    ...metadata
  }
})
