/**
 * Chrome PromptAPI Provider
 * 
 * Implements Chrome's built-in PromptAPI (Gemini Nano) with proper session caching
 * and download handling.
 */

import { LLMProviderInterface, createAnalysisResult } from './LLMProviderInterface'
import { createAnalysisPrompt } from '@/prompts/systemPrompts'

export class ChromePromptProvider extends LLMProviderInterface {
  constructor() {
    super()
    this.sessions = new Map() // systemPromptHash → session
    this.isDownloading = false
    this.downloadProgress = 0
  }

  /**
   * Provider identification
   */
  get providerName() {
    return 'chrome-prompt'
  }

  get capabilities() {
    return ['analysis', 'optimization', 'streaming']
  }

  get metadata() {
    return {
      name: 'Chrome PromptAPI',
      description: 'Chrome built-in Gemini Nano model',
      model: 'Gemini Nano',
      cost: 'free',
      privacy: 'local',
      ...super.metadata
    }
  }

  /**
   * Check Chrome PromptAPI availability
   */
  async checkAvailability() {
    try {
      // Check if PromptAPI is available
      if (typeof LanguageModel === 'undefined') {
        return 'unavailable'
      }

      const availability = await LanguageModel.availability()
      console.log(`[ChromePromptProvider] Availability: ${availability}`)

      switch (availability) {
        case 'readily':
        case 'available':  // Handle 'available' state
          return 'ready'
        case 'after-download':
        case 'downloadable':
          return 'downloading'
        default:
          console.warn(`[ChromePromptProvider] Unknown availability state: ${availability}`)
          return 'unavailable'
      }
    } catch (error) {
      console.error('[ChromePromptProvider] Availability check failed:', error)
      return 'unavailable'
    }
  }

  /**
   * Create or get cached session
   */
  async createSession(config) {
    const sessionKey = this.getSessionKey(config.systemPrompt)
    
    // Return cached session if available and valid
    if (this.sessions.has(sessionKey)) {
      const session = this.sessions.get(sessionKey)
      if (!session.destroyed) {
        console.log(`[ChromePromptProvider] Using cached session`)
        return session
      } else {
        // Remove destroyed session
        this.sessions.delete(sessionKey)
      }
    }

    // Create new session
    console.log(`[ChromePromptProvider] Creating new session`)
    
    const sessionConfig = {
      initialPrompts: [{
        role: 'system',
        content: config.systemPrompt
      }]
    }

    // Add download monitoring if progress callback provided
    if (config.onProgress) {
      sessionConfig.monitor = (m) => {
        m.addEventListener('downloadprogress', (e) => {
          this.downloadProgress = Math.round(e.loaded * 100)
          this.isDownloading = true
          console.log(`[ChromePromptProvider] Download progress: ${this.downloadProgress}%`)
          config.onProgress(e)
        })

        m.addEventListener('downloadcomplete', () => {
          this.isDownloading = false
          console.log(`[ChromePromptProvider] Download complete`)
        })
      }
    }

    const session = await LanguageModel.create(sessionConfig)
    
    // Cache the session
    this.sessions.set(sessionKey, session)
    console.log(`[ChromePromptProvider] Session created and cached`)
    
    return session
  }

  /**
   * Analyze prompt using Chrome PromptAPI
   */
  async analyzePrompt(prompt, context, onProgress) {
    const startTime = Date.now()
    
    try {
      // Create session with progress tracking
      const session = await this.createSession({
        systemPrompt: context.systemPrompt,
        onProgress: onProgress
      })

      // Generate analysis prompt
      const analysisPrompt = createAnalysisPrompt(prompt, context.fieldInfo)
      
      // Get AI analysis
      console.log(`[ChromePromptProvider] Analyzing prompt...`)
      const aiResponse = await session.prompt(analysisPrompt)
      
      // Parse response
      const analysisResult = this.parseAnalysisResponse(aiResponse, prompt)
      
      // Add provider metadata
      analysisResult.provider = this.providerName
      analysisResult.metadata = {
        ...analysisResult.metadata,
        responseTime: Date.now() - startTime,
        model: 'Gemini Nano',
        tokensUsed: aiResponse.length // Approximate
      }

      console.log(`[ChromePromptProvider] Analysis complete:`, analysisResult)
      return analysisResult

    } catch (error) {
      console.error('[ChromePromptProvider] Analysis failed:', error)
      
      return createAnalysisResult({
        success: false,
        issues: [`Analysis failed: ${error.message}`],
        suggestions: [
          'Check chrome://flags/ for PromptAPI settings',
          'Ensure sufficient storage space (22GB)',
          'Try again after enabling PromptAPI'
        ],
        optimizedPrompt: prompt,
        vaguenessScore: 0,
        provider: this.providerName,
        confidence: 0,
        metadata: { error: error.message }
      })
    }
  }

  /**
   * Parse AI response with robust error handling
   */
  parseAnalysisResponse(aiResponse, originalPrompt) {
    try {
      // Try to extract JSON from response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        
        // Validate required fields
        if (parsed.issues && parsed.suggestions && parsed.optimizedPrompt) {
          return createAnalysisResult({
            issues: parsed.issues,
            suggestions: parsed.suggestions,
            optimizedPrompt: parsed.optimizedPrompt,
            vaguenessScore: parsed.vaguenessScore || 5,
            provider: this.providerName
          })
        }
      }
      
      // Fallback if JSON parsing fails
      return this.createFallbackAnalysis(aiResponse, originalPrompt)
      
    } catch (parseError) {
      console.warn('[ChromePromptProvider] JSON parsing failed:', parseError)
      return this.createFallbackAnalysis(aiResponse, originalPrompt)
    }
  }

  /**
   * Create fallback analysis when JSON parsing fails
   */
  createFallbackAnalysis(aiResponse, originalPrompt) {
    return createAnalysisResult({
      issues: ['AI analysis completed but response format unclear'],
      suggestions: ['Review the raw AI response below'],
      optimizedPrompt: aiResponse.length > originalPrompt.length ? aiResponse : originalPrompt,
      vaguenessScore: 5,
      provider: this.providerName,
      confidence: 0.3,
      metadata: { 
        rawResponse: aiResponse,
        parseError: true
      }
    })
  }

  /**
   * Cleanup all sessions
   */
  async destroy() {
    console.log(`[ChromePromptProvider] Destroying ${this.sessions.size} sessions`)
    
    for (const [key, session] of this.sessions) {
      try {
        if (session && typeof session.destroy === 'function') {
          await session.destroy()
        }
      } catch (error) {
        console.warn(`[ChromePromptProvider] Error destroying session ${key}:`, error)
      }
    }
    
    this.sessions.clear()
    console.log(`[ChromePromptProvider] All sessions destroyed`)
  }

  /**
   * Generate session key from system prompt
   */
  getSessionKey(systemPrompt) {
    // Simple hash function
    let hash = 0
    for (let i = 0; i < systemPrompt.length; i++) {
      const char = systemPrompt.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return `session_${Math.abs(hash).toString(36)}`
  }

  /**
   * Get current download status
   */
  getDownloadStatus() {
    return {
      isDownloading: this.isDownloading,
      progress: this.downloadProgress
    }
  }
}
