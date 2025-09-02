/**
 * LLM Service Configuration
 * 
 * Centralized configuration for all LLM providers, priorities, and settings.
 */

export const LLM_CONFIG = {
  /**
   * Provider configuration and priorities
   */
  providers: [
    {
      name: 'chrome-prompt',
      priority: 1,                    // Highest priority (free, fast, private)
      capabilities: ['analysis', 'optimization'],
      fallbackTo: 'openai',
      config: {
        sessionTTL: 30 * 60000,      // 30 minutes
        maxSessions: 3
      }
    },
    {
      name: 'openai',
      priority: 2,                    // Medium priority (paid, powerful)
      capabilities: ['analysis', 'optimization', 'streaming'],
      requiresAuth: true,
      fallbackTo: 'local',
      config: {
        sessionTTL: 10 * 60000,      // 10 minutes (API costs)
        maxSessions: 2,
        model: 'gpt-4',
        maxTokens: 1000
      }
    },
    {
      name: 'local',
      priority: 3,                    // Lowest priority (slower, always available)
      capabilities: ['analysis'],
      alwaysAvailable: true,
      config: {
        sessionTTL: 60 * 60000,      // 1 hour (no API costs)
        maxSessions: 1,
        model: 'llama-3.2-1b'
      }
    }
  ],

  /**
   * Session management settings
   */
  session: {
    defaultTTL: 30 * 60000,          // 30 minutes
    maxConcurrentSessions: 5,         // Total across all providers
    cleanupInterval: 5 * 60000,       // Cleanup every 5 minutes
    retryAttempts: 2,
    retryDelay: 1000                  // 1 second between retries
  },

  /**
   * Analysis settings
   */
  analysis: {
    timeout: 30000,                   // 30 seconds max per analysis
    maxPromptLength: 10000,           // Max chars to analyze
    minPromptLength: 3,               // Min chars to analyze
    vaguenessThreshold: 4,            // Below 4 = suggest clarifying questions
    confidenceThreshold: 0.7          // Minimum confidence for results
  },

  /**
   * Feature flags
   */
  features: {
    enableStreamingResponses: true,
    enableProviderFallback: true,
    enableSessionCaching: true,
    enableDownloadProgress: true,
    enableVaguenessScoring: true
  },

  /**
   * Development/debugging settings
   */
  debug: {
    logProviderSelection: true,
    logSessionCaching: true,
    logAnalysisResults: true,
    enableProviderStats: true
  }
}

/**
 * Get provider configuration by name
 */
export const getProviderConfig = (providerName) => {
  return LLM_CONFIG.providers.find(p => p.name === providerName)
}

/**
 * Get providers ordered by priority
 */
export const getProvidersByPriority = () => {
  return [...LLM_CONFIG.providers].sort((a, b) => a.priority - b.priority)
}

/**
 * Check if feature is enabled
 */
export const isFeatureEnabled = (featureName) => {
  return LLM_CONFIG.features[featureName] ?? false
}
