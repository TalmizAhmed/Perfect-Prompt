import React from 'react'
import { createRoot } from 'react-dom/client'
import { AnalysisModal } from '@/components/modals/AnalysisModal'
import { DisablePopup } from '@/components/modals/DisablePopup'
import styles from '@/index.css?inline'

/**
 * React Bridge - Connects Plain JS magicIcon.js with React components
 * Manages Shadow DOM isolation and component lifecycle
 */
class ReactPortal {
  constructor() {
    this.activeModals = new Map() // modalId -> { root, shadowHost, cleanup }
    this.modalCounter = 0
  }

  /**
   * Create isolated Shadow DOM container for React components
   */
  createShadowContainer(id) {
    // Create shadow host
    const shadowHost = document.createElement('div')
    shadowHost.id = `perfect-prompt-shadow-${id}`
    shadowHost.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 2147483647;
    `

    // Create shadow DOM
    const shadowRoot = shadowHost.attachShadow({ mode: 'open' })

    // Use Vite ?inline + adoptedStyleSheets for instant CSS loading
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(styles)
    shadowRoot.adoptedStyleSheets = [sheet]

    console.log('[Perfect Prompt] CSS applied to Shadow DOM via adoptedStyleSheets')

    // Create React mount point
    const reactMount = document.createElement('div')
    reactMount.style.cssText = `
      pointer-events: auto;
      position: relative;
      width: 100%;
      height: 100%;
    `
    shadowRoot.appendChild(reactMount)

    // Add to page
    document.body.appendChild(shadowHost)

    return { shadowHost, shadowRoot, reactMount }
  }

  /**
   * Show Analysis Modal
   */
  async showAnalysisModal({ field, prompt, onOptimize, onApply, onClose }) {
    const modalId = `analysis-${++this.modalCounter}`
    
    console.log('[Perfect Prompt] Opening Analysis Modal:', { modalId, prompt })

    try {
      // Create isolated container
      const { shadowHost, shadowRoot, reactMount } = this.createShadowContainer(modalId)

      // Create React root
      const root = createRoot(reactMount)

      // Cleanup function
      const cleanup = () => {
        console.log('[Perfect Prompt] Cleaning up Analysis Modal:', modalId)
        root.unmount()
        shadowHost.remove()
        this.activeModals.delete(modalId)
      }

      // Enhanced close handler
      const handleClose = () => {
        cleanup()
        if (onClose) onClose()
      }

      // Enhanced optimize handler  
      const handleOptimize = (optimizedPrompt) => {
        console.log('[Perfect Prompt] Optimized prompt:', optimizedPrompt)
        
        // Copy to clipboard
        navigator.clipboard.writeText(optimizedPrompt).then(() => {
          console.log('[Perfect Prompt] Copied to clipboard')
        }).catch(err => {
          console.error('[Perfect Prompt] Failed to copy:', err)
        })

        if (onOptimize) onOptimize(optimizedPrompt)
      }

      // Enhanced apply handler
      const handleApply = (optimizedPrompt) => {
        console.log('[Perfect Prompt] Applying prompt to field:', optimizedPrompt)
        
        if (onApply) onApply(optimizedPrompt)
        cleanup()
      }

      // Store modal reference
      this.activeModals.set(modalId, { root, shadowHost, cleanup })

      // Render React component
      root.render(
        <AnalysisModal
          isOpen={true}
          onClose={handleClose}
          prompt={prompt}
          field={field}
          onOptimize={handleOptimize}
          onApply={handleApply}
        />
      )

      console.log('[Perfect Prompt] Analysis Modal rendered successfully')

    } catch (error) {
      console.error('[Perfect Prompt] Failed to show Analysis Modal:', error)
    }
  }

  /**
   * Show Disable Popup
   */
  async showDisablePopup({ position, onConfirm, onClose }) {
    const modalId = `disable-${++this.modalCounter}`
    
    console.log('[Perfect Prompt] Opening Disable Popup:', { modalId, position })

    try {
      // Create isolated container
      const { shadowHost, shadowRoot, reactMount } = this.createShadowContainer(modalId)

      // Create React root
      const root = createRoot(reactMount)

      // Cleanup function
      const cleanup = () => {
        console.log('[Perfect Prompt] Cleaning up Disable Popup:', modalId)
        root.unmount()
        shadowHost.remove()
        this.activeModals.delete(modalId)
      }

      // Enhanced close handler
      const handleClose = () => {
        cleanup()
        if (onClose) onClose()
      }

      // Enhanced confirm handler
      const handleConfirm = (hostname) => {
        console.log('[Perfect Prompt] Confirming disable for:', hostname)
        if (onConfirm) onConfirm(hostname)
        cleanup()
      }

      // Store modal reference
      this.activeModals.set(modalId, { root, shadowHost, cleanup })

      // Render React component
      root.render(
        <DisablePopup
          isOpen={true}
          onClose={handleClose}
          onConfirm={handleConfirm}
          position={position}
        />
      )

      console.log('[Perfect Prompt] Disable Popup rendered successfully')

    } catch (error) {
      console.error('[Perfect Prompt] Failed to show Disable Popup:', error)
    }
  }

  /**
   * Close specific modal
   */
  closeModal(modalId) {
    const modal = this.activeModals.get(modalId)
    if (modal) {
      modal.cleanup()
    }
  }

  /**
   * Close all active modals
   */
  closeAllModals() {
    console.log('[Perfect Prompt] Closing all modals:', this.activeModals.size)
    this.activeModals.forEach(({ cleanup }) => cleanup())
    this.activeModals.clear()
  }

  /**
   * Check if any modals are open
   */
  hasOpenModals() {
    return this.activeModals.size > 0
  }
}

// Create global instance
const reactPortal = new ReactPortal()

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  reactPortal.closeAllModals()
})

// Export for use by magicIcon.js
export default reactPortal
