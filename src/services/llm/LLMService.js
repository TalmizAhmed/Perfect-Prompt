/**
 * LLM Service - Main Orchestrator
 * 
 * Provides a unified interface for all LLM operations with automatic provider
 * selection, session caching, and fallback handling.
 */

import { SessionCache } from '@/services/llm/SessionCache'
import { ChromePromptProvider } from '@/services/llm/providers/ChromePromptProvider'
import { LLM_CONFIG, getProvidersByPriority, isFeatureEnabled } from '@/services/llm/config/llmConfig'
import { 
  PROMPT_ANALYSIS_SYSTEM, 
  CLARIFYING_QUESTIONS_SYSTEM,
  createClarifyingQuestionsPrompt,
  createFinalOptimizationPrompt
} from '@/prompts/systemPrompts'

/**
 * Simple JSON extraction - handles markdown code blocks as fallback
 */
function parseAIResponse(response) {
  const text = response.trim()
  
  // First try: direct JSON parse (what we want)
  try {
    return JSON.parse(text)
  } catch (e) {
    // Fallback: extract from markdown if AI ignored instructions
    const jsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim())
    }
    // Last resort: find JSON-like content
    const possibleJson = text.match(/\{[\s\S]*\}/)
    if (possibleJson) {
      return JSON.parse(possibleJson[0])
    }
    throw new Error(`Invalid JSON response: ${text.substring(0, 100)}...`)
  }
}

export class LLMService {
  constructor() {
    try {
      console.log('[LLMService] Initializing LLMService...')
      
      this.providers = new Map()
      this.sessionCache = new SessionCache({
        ttl: LLM_CONFIG.session.defaultTTL,
        maxSessions: LLM_CONFIG.session.maxConcurrentSessions
      })
      this.activeProvider = null
      this.isInitialized = false
      
      // Initialize providers
      this.initializeProviders()
      this.isInitialized = true
      
      console.log('[LLMService] LLMService initialization complete')
    } catch (error) {
      console.error('[LLMService] Constructor failed:', error)
      throw error
    }
  }

  /**
   * Singleton pattern
   */
  static getInstance() {
    if (!LLMService._instance) {
      LLMService._instance = new LLMService()
    }
    return LLMService._instance
  }

  /**
   * Initialize available providers
   */
  initializeProviders() {
    try {
      // Register Chrome PromptAPI provider
      console.log('[LLMService] Registering ChromePromptProvider...')
      const chromeProvider = new ChromePromptProvider()
      this.providers.set('chrome-prompt', chromeProvider)
      console.log('[LLMService] ChromePromptProvider registered:', chromeProvider.metadata)
      
      // Future providers can be registered here:
      // this.providers.set('openai', new OpenAIProvider())
      // this.providers.set('local', new LocalModelProvider())
      
      console.log(`[LLMService] Initialized ${this.providers.size} providers:`, Array.from(this.providers.keys()))
    } catch (error) {
      console.error('[LLMService] Provider initialization failed:', error)
    }
  }

  /**
   * Select the best available provider based on priority and availability
   */
  async selectBestProvider() {
    console.log('[LLMService] Selecting best provider...')
    console.log('[LLMService] Available providers:', Array.from(this.providers.keys()))
    
    const providerConfigs = getProvidersByPriority()
    console.log('[LLMService] Provider configs:', providerConfigs)
    
    for (const config of providerConfigs) {
      console.log(`[LLMService] Checking provider: ${config.name}`)
      const provider = this.providers.get(config.name)
      
      if (!provider) {
        console.warn(`[LLMService] Provider ${config.name} not found in registry`)
        continue
      }

      try {
        console.log(`[LLMService] Checking availability for: ${config.name}`)
        const availability = await provider.checkAvailability()
        console.log(`[LLMService] Provider ${config.name}: ${availability}`)
        
        if (availability === 'ready') {
          this.activeProvider = provider
          console.log(`[LLMService] Selected provider: ${config.name}`)
          return provider
        } else if (availability === 'downloading' && config.name === 'chrome-prompt') {
          // Chrome is downloading, use it anyway
          this.activeProvider = provider
          console.log(`[LLMService] Selected downloading provider: ${config.name}`)
          return provider
        }
      } catch (error) {
        console.warn(`[LLMService] Provider ${config.name} check failed:`, error)
      }
    }

    // Enhanced error with debugging info
    const debugInfo = {
      registeredProviders: Array.from(this.providers.keys()),
      availableConfigs: providerConfigs.map(c => c.name)
    }
    console.error('[LLMService] No providers available. Debug info:', debugInfo)
    throw new Error(`No LLM providers available. Debug: ${JSON.stringify(debugInfo)}`)
  }

  /**
   * Get or select the best available provider (used by multiple methods)
   */
  async getOrSelectProvider() {
    if (this.activeProvider) {
      return this.activeProvider
    }
    return await this.selectBestProvider()
  }

  /**
   * Main method: Analyze prompt with automatic provider selection and caching
   */
  async analyzePrompt(prompt, fieldInfo, onProgress) {
    console.log(`[LLMService] Starting prompt analysis`, { 
      promptLength: prompt.length, 
      fieldType: fieldInfo?.type 
    })

    // Validate input
    if (!prompt || prompt.length < LLM_CONFIG.analysis.minPromptLength) {
      throw new Error('Prompt too short for analysis')
    }

    if (prompt.length > LLM_CONFIG.analysis.maxPromptLength) {
      throw new Error('Prompt too long for analysis')
    }

    try {
      // Select best provider
      const provider = await this.getOrSelectProvider()
      
      // Create context for analysis
      const context = {
        systemPrompt: PROMPT_ANALYSIS_SYSTEM,
        fieldInfo: fieldInfo,
        onProgress: onProgress
      }

      // Use session cache for analysis
      const sessionKey = this.sessionCache.getSessionKey(provider.providerName, PROMPT_ANALYSIS_SYSTEM)
      
      const session = await this.sessionCache.getOrCreateSession(
        provider.providerName,
        PROMPT_ANALYSIS_SYSTEM,
        () => provider.createSession(context)
      )

      // Perform analysis using cached session
      const result = await provider.analyzePrompt(prompt, context, onProgress)
      
      // Validate result confidence
      if (isFeatureEnabled('enableProviderFallback') && result.confidence < LLM_CONFIG.analysis.confidenceThreshold) {
        console.warn(`[LLMService] Low confidence result (${result.confidence}), considering fallback`)
        // Could implement fallback logic here
      }

      return result

    } catch (error) {
      console.error('[LLMService] Analysis failed:', error)
      
      // Return error result in standard format
      return {
        success: false,
        issues: [`Analysis failed: ${error.message}`],
        suggestions: [
          'Check if PromptAPI is enabled in chrome://flags/',
          'Ensure you have sufficient storage space',
          'Try refreshing the page and trying again'
        ],
        optimizedPrompt: prompt,
        vaguenessScore: 0,
        provider: 'error',
        confidence: 0,
        metadata: { 
          error: error.message,
          timestamp: Date.now()
        }
      }
    }
  }

  /**
   * Generate clarifying questions for vague prompts
   * @param {string} prompt - Original prompt text
   * @param {Object} fieldInfo - Context about the input field
   * @param {Function} [onProgress] - Progress callback function
   * @returns {Promise<Object>} Questions and metadata
   */
  async generateClarifyingQuestions(prompt, fieldInfo, onProgress) {
    console.log('[LLMService] Generating clarifying questions for vague prompt')
    
    try {
      const provider = await this.getOrSelectProvider()
      
      // Get or create session for clarifying questions
      const session = await this.sessionCache.getOrCreateSession(
        provider.providerName,
        CLARIFYING_QUESTIONS_SYSTEM,
        () => provider.createSession({
          systemPrompt: CLARIFYING_QUESTIONS_SYSTEM,
          onProgress
        })
      )

      const questionPrompt = createClarifyingQuestionsPrompt(prompt, fieldInfo)
      
      console.log('[LLMService] Asking AI for clarifying questions...')
      const response = await session.prompt(questionPrompt)
      
      try {
        const parsed = parseAIResponse(response)
        console.log('[LLMService] Generated clarifying questions:', parsed.questions?.length || 0)
        
        return {
          success: true,
          questions: parsed.questions || [],
          provider: provider.providerName,
          metadata: { timestamp: Date.now() }
        }
      } catch (parseError) {
        console.warn('[LLMService] Failed to parse clarifying questions JSON:', parseError)
        return {
          success: false,
          questions: [],
          error: 'Failed to generate questions. Please try again.',
          provider: provider.providerName
        }
      }
    } catch (error) {
      console.error('[LLMService] Clarifying questions generation failed:', error)
      return {
        success: false,
        questions: [],
        error: error.message,
        provider: 'error'
      }
    }
  }

  /**
   * Final optimization using clarifying answers
   * @param {string} originalPrompt - Original prompt text
   * @param {Array} clarifyingAnswers - Array of {question, answer} objects
   * @param {Object} fieldInfo - Context about the input field
   * @param {Function} [onProgress] - Progress callback function
   * @returns {Promise<Object>} Final optimization result
   */
  async optimizeWithContext(originalPrompt, clarifyingAnswers, fieldInfo, onProgress) {
    console.log('[LLMService] Optimizing prompt with clarifying context')
    
    try {
      const provider = await this.getOrSelectProvider()
      
      // Get or create session for final optimization
      const session = await this.sessionCache.getOrCreateSession(
        provider.providerName,
        PROMPT_ANALYSIS_SYSTEM,
        () => provider.createSession({
          systemPrompt: PROMPT_ANALYSIS_SYSTEM,
          onProgress
        })
      )

      const optimizationPrompt = createFinalOptimizationPrompt(originalPrompt, clarifyingAnswers, fieldInfo)
      
      console.log('[LLMService] Performing final optimization with context...')
      const response = await session.prompt(optimizationPrompt)
      
      try {
        const parsed = parseAIResponse(response)
        console.log('[LLMService] Final optimization complete')
        
        return {
          success: true,
          optimizedPrompt: parsed.optimizedPrompt || originalPrompt,
          improvements: parsed.improvements || [],
          vaguenessScore: parsed.vaguenessScore || 8, // Should be much higher after clarification
          provider: provider.providerName,
          confidence: 0.9, // High confidence after clarification
          metadata: { 
            timestamp: Date.now(),
            hadClarifyingQuestions: true,
            questionsCount: clarifyingAnswers.length
          }
        }
      } catch (parseError) {
        console.warn('[LLMService] Failed to parse optimization JSON:', parseError)
        return {
          success: false,
          optimizedPrompt: originalPrompt,
          improvements: [],
          vaguenessScore: 3,
          error: 'Failed to optimize prompt. Please try again.',
          provider: provider.providerName
        }
      }
    } catch (error) {
      console.error('[LLMService] Final optimization failed:', error)
      return {
        success: false,
        optimizedPrompt: originalPrompt,
        improvements: [],
        vaguenessScore: 1,
        error: error.message,
        provider: 'error'
      }
    }
  }

  /**
   * Get service statistics and status
   */
  getStatus() {
    const providerStatuses = Array.from(this.providers.entries()).map(([name, provider]) => ({
      name,
      metadata: provider.metadata,
      isActive: provider === this.activeProvider
    }))

    return {
      activeProvider: this.activeProvider?.providerName || null,
      providers: providerStatuses,
      sessionCache: this.sessionCache.getStats(),
      config: {
        enabledFeatures: Object.entries(LLM_CONFIG.features)
          .filter(([_, enabled]) => enabled)
          .map(([feature, _]) => feature)
      }
    }
  }

  /**
   * Force refresh of provider availability
   */
  async refreshProviders() {
    this.activeProvider = null
    return await this.selectBestProvider()
  }

  /**
   * Cleanup all resources
   */
  async destroy() {
    console.log('[LLMService] Destroying service...')
    
    // Destroy all providers
    for (const [name, provider] of this.providers) {
      try {
        await provider.destroy()
      } catch (error) {
        console.warn(`[LLMService] Error destroying provider ${name}:`, error)
      }
    }
    
    // Destroy session cache
    await this.sessionCache.destroy()
    
    // Clear references
    this.providers.clear()
    this.activeProvider = null
    LLMService._instance = null
    
    console.log('[LLMService] Service destroyed')
  }
}

// Cleanup on page unload
window.addEventListener('beforeunload', async () => {
  const service = LLMService.getInstance()
  await service.destroy()
})
