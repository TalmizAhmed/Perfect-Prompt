/**
 * Session Cache Manager
 * 
 * Manages LLM session lifecycle, caching, and cleanup to optimize performance
 * and avoid repeated model downloads.
 */

export class SessionCache {
  constructor(config = {}) {
    this.sessions = new Map()           // sessionKey → { session, timestamp, provider }
    this.sessionTTL = config.ttl || (30 * 60000)  // 30 minutes default
    this.maxSessions = config.maxSessions || 5     // Max concurrent sessions
    this.cleanupInterval = null
    
    // Start periodic cleanup
    this.startCleanup()
  }

  /**
   * Generate unique session key
   * @param {string} providerName - Provider identifier
   * @param {string} systemPrompt - System prompt (hashed)
   * @returns {string} Unique session key
   */
  getSessionKey(providerName, systemPrompt) {
    const promptHash = this.hashString(systemPrompt)
    return `${providerName}:${promptHash}`
  }

  /**
   * Get cached session or create new one
   * @param {string} providerName - Provider name
   * @param {string} systemPrompt - System prompt
   * @param {Function} createSessionFn - Function to create new session
   * @returns {Promise<Object>} Session object
   */
  async getOrCreateSession(providerName, systemPrompt, createSessionFn) {
    const sessionKey = this.getSessionKey(providerName, systemPrompt)
    
    // Check for valid cached session
    if (this.sessions.has(sessionKey)) {
      const cached = this.sessions.get(sessionKey)
      
      // Check if session is still valid
      if (this.isSessionValid(cached)) {
        console.log(`[SessionCache] Using cached session: ${sessionKey}`)
        return cached.session
      } else {
        console.log(`[SessionCache] Cached session expired: ${sessionKey}`)
        await this.removeSession(sessionKey)
      }
    }

    // Ensure we don't exceed max sessions
    await this.enforceSessionLimit()

    // Create new session
    console.log(`[SessionCache] Creating new session: ${sessionKey}`)
    const session = await createSessionFn()
    
    // Cache the session
    this.sessions.set(sessionKey, {
      session,
      timestamp: Date.now(),
      provider: providerName,
      key: sessionKey
    })

    console.log(`[SessionCache] Session cached successfully: ${sessionKey}`)
    return session
  }

  /**
   * Check if cached session is still valid
   * @param {Object} cached - Cached session object
   * @returns {boolean} True if valid
   */
  isSessionValid(cached) {
    if (!cached || !cached.session) return false
    
    // Check TTL
    const age = Date.now() - cached.timestamp
    if (age > this.sessionTTL) return false
    
    // Check if session is destroyed (provider-specific check)
    if (cached.session.destroyed) return false
    
    return true
  }

  /**
   * Remove session from cache and cleanup
   * @param {string} sessionKey - Session key to remove
   */
  async removeSession(sessionKey) {
    const cached = this.sessions.get(sessionKey)
    if (cached && cached.session) {
      try {
        // Cleanup session if it has destroy method
        if (typeof cached.session.destroy === 'function') {
          await cached.session.destroy()
        }
      } catch (error) {
        console.warn(`[SessionCache] Error destroying session ${sessionKey}:`, error)
      }
    }
    
    this.sessions.delete(sessionKey)
    console.log(`[SessionCache] Session removed: ${sessionKey}`)
  }

  /**
   * Enforce maximum session limit by removing oldest sessions
   */
  async enforceSessionLimit() {
    if (this.sessions.size >= this.maxSessions) {
      // Find oldest session
      let oldestKey = null
      let oldestTime = Date.now()
      
      for (const [key, cached] of this.sessions) {
        if (cached.timestamp < oldestTime) {
          oldestTime = cached.timestamp
          oldestKey = key
        }
      }
      
      if (oldestKey) {
        console.log(`[SessionCache] Removing oldest session to enforce limit: ${oldestKey}`)
        await this.removeSession(oldestKey)
      }
    }
  }

  /**
   * Start periodic cleanup of expired sessions
   */
  startCleanup() {
    if (this.cleanupInterval) return
    
    this.cleanupInterval = setInterval(async () => {
      const now = Date.now()
      const expiredKeys = []
      
      for (const [key, cached] of this.sessions) {
        if (!this.isSessionValid(cached)) {
          expiredKeys.push(key)
        }
      }
      
      // Remove expired sessions
      for (const key of expiredKeys) {
        await this.removeSession(key)
      }
      
      if (expiredKeys.length > 0) {
        console.log(`[SessionCache] Cleaned up ${expiredKeys.length} expired sessions`)
      }
    }, 5 * 60000) // Check every 5 minutes
  }

  /**
   * Stop cleanup and destroy all sessions
   */
  async destroy() {
    // Stop cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    
    // Cleanup all sessions
    const allKeys = Array.from(this.sessions.keys())
    for (const key of allKeys) {
      await this.removeSession(key)
    }
    
    console.log('[SessionCache] Cache destroyed')
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    return {
      totalSessions: this.sessions.size,
      maxSessions: this.maxSessions,
      sessionTTL: this.sessionTTL,
      sessions: Array.from(this.sessions.entries()).map(([key, cached]) => ({
        key,
        provider: cached.provider,
        age: Date.now() - cached.timestamp,
        valid: this.isSessionValid(cached)
      }))
    }
  }

  /**
   * Simple string hash function
   * @param {string} str - String to hash
   * @returns {string} Hash
   */
  hashString(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }
}
