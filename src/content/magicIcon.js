/**
 * Perfect Prompt Magic Icon - Content Script
 * Based on Grammarly's field detection and positioning approach
 * Enhanced with React Bridge for rich UI components
 */

// Import React portal bridge for modals
import reactPortal from './reactPortal.jsx'

class MagicIconManager {
  constructor() {
    this.icons = new Map(); // field -> icon element
    this.observer = null;
    this.currentField = null;
    
    this.init();
  }

  init() {
    console.log('[Perfect Prompt] Magic Icon Manager initialized');
    
    // Initial scan of existing fields
    this.scanForFields();
    
    // Watch for dynamically added fields
    this.setupMutationObserver();
    
    // Handle window events for responsive positioning
    this.setupEventListeners();
  }

  /**
   * Scan page for compatible text fields
   * Based on Grammarly's approach from the research
   */
  scanForFields() {
    // Query all potential text input fields
    const fields = document.querySelectorAll(
      'input[type="text"], input[type="email"], input[type="search"], ' +
      'input[type="url"], input[type="tel"], input:not([type]), ' +
      'textarea, [contenteditable="true"], [role="textbox"]'
    );

    fields.forEach(field => {
      if (this.isFieldCompatible(field)) {
        this.setupFieldListeners(field);
      }
    });
  }

  /**
   * Check if field is compatible with our icon
   * Implements Grammarly's compatibility rules from research
   */
  isFieldCompatible(field) {
    // Rule 1: Check dimensions (Grammarly requires >301px width, >38px height)
    const rect = field.getBoundingClientRect();
    if (rect.width <= 301 || rect.height <= 38) {
      console.log('[Perfect Prompt] Field too small:', rect);
      return false;
    }

    // Rule 2: Check for data-gramm="false" or similar opt-out attributes
    if (field.getAttribute('data-gramm') === 'false' || 
        field.getAttribute('data-perfect-prompt') === 'false') {
      console.log('[Perfect Prompt] Field explicitly disabled');
      return false;
    }

    // Rule 3: Check if field is in unsupported iframe
    if (field.ownerDocument.defaultView.parent !== field.ownerDocument.defaultView) {
      console.log('[Perfect Prompt] Field in iframe, skipping');
      return false;
    }

    // Rule 4: Exclude password and hidden fields
    if (field.type === 'password' || field.type === 'hidden') {
      return false;
    }

    // Rule 5: Check if field is visible and not disabled
    const styles = window.getComputedStyle(field);
    if (styles.display === 'none' || styles.visibility === 'hidden' || field.disabled) {
      return false;
    }

    return true;
  }

  /**
   * Setup event listeners for a compatible field
   */
  setupFieldListeners(field) {
    // Focus event - show icon (keep visible until another field is focused)
    field.addEventListener('focus', (e) => {
      this.showIcon(e.target);
    });

    // Input event - reposition icon if field size changes
    field.addEventListener('input', (e) => {
      if (this.icons.has(e.target)) {
        this.updateIconPosition(e.target);
      }
    });
  }

  /**
   * Show magic icon for the focused field
   */
  showIcon(field) {
    // If there's already an icon on a different field, hide it first
    if (this.currentField && this.currentField !== field) {
      this.hideIcon(this.currentField);
    }

    // Don't create duplicate icons for the same field
    if (this.icons.has(field)) {
      this.currentField = field;
      return;
    }

    console.log('[Perfect Prompt] Showing icon for field:', field);
    
    // Create icon container with hover menu
    const container = this.createIconElement(field);
    
    // Position the container
    this.positionIcon(field, container);
    
    // Add to DOM and track
    document.body.appendChild(container);
    this.icons.set(field, container);
    this.currentField = field;
  }

  /**
   * Create the magic icon element with hover menu
   */
  createIconElement(field) {
    // Create container for icon and hover menu
    const container = document.createElement('div');
    container.className = 'perfect-prompt-container';
    container.style.cssText = `
      position: absolute;
      z-index: 2147483647;
      user-select: none;
      font-family: system-ui, -apple-system, sans-serif;
    `;

    // Create the main icon
    const icon = document.createElement('div');
    icon.className = 'perfect-prompt-icon';
    icon.style.cssText = `
      width: 24px;
      height: 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 14px;
      color: white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      transition: all 0.2s ease;
      position: relative;
    `;
    icon.textContent = '✨';

    // Create hover menu
    const hoverMenu = this.createHoverMenu(field);
    
    // Add elements to container
    container.appendChild(icon);
    container.appendChild(hoverMenu);

    // Setup hover interactions
    this.setupHoverInteractions(container, icon, hoverMenu, field);

    return container;
  }

  /**
   * Create the hover buttons (minimal slide-out like Grammarly)
   */
  createHoverMenu(field) {
    const hoverButtons = document.createElement('div');
    hoverButtons.className = 'perfect-prompt-hover-buttons';
    hoverButtons.style.cssText = `
      position: absolute;
      right: 28px;
      top: 0;
      display: flex;
      gap: 4px;
      opacity: 0;
      visibility: hidden;
      transform: translateX(10px);
      transition: all 0.2s ease;
    `;

    // Create on/off toggle button
    const toggleButton = document.createElement('div');
    toggleButton.className = 'perfect-prompt-toggle-btn';
    toggleButton.style.cssText = `
      width: 20px;
      height: 20px;
      background: white;
      border: 1px solid #d1d5db;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 10px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
      transition: all 0.15s ease;
    `;
    toggleButton.innerHTML = '⚙️';
    toggleButton.title = 'Extension settings';

    // Create templates button
    const templatesButton = document.createElement('div');
    templatesButton.className = 'perfect-prompt-templates-btn';
    templatesButton.style.cssText = `
      width: 20px;
      height: 20px;
      background: white;
      border: 1px solid #d1d5db;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 10px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
      transition: all 0.15s ease;
    `;
    templatesButton.innerHTML = '📋';
    templatesButton.title = 'Prompt templates';

    // Add hover effects
    [toggleButton, templatesButton].forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'scale(1.1)';
        btn.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.15)';
      });

      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'scale(1)';
        btn.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.12)';
      });
    });

    // Add click handlers with proper event handling
    toggleButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      console.log('[Perfect Prompt] Gear button clicked');
      this.showDisablePopup(field, e.target);
    });

    templatesButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      console.log('[Perfect Prompt] Templates button clicked');
      this.handleTemplatesClick(field);
    });

    hoverButtons.appendChild(toggleButton);
    hoverButtons.appendChild(templatesButton);

    return hoverButtons;
  }

  /**
   * Setup hover interactions for icon and buttons
   */
  setupHoverInteractions(container, icon, hoverButtons, field) {
    let hoverTimeout;

    // Show buttons on icon hover
    const showButtons = () => {
      clearTimeout(hoverTimeout);
      hoverButtons.style.opacity = '1';
      hoverButtons.style.visibility = 'visible';
      hoverButtons.style.transform = 'translateX(0)';
      
      // Scale up icon slightly
      icon.style.transform = 'scale(1.1)';
      icon.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.25)';
    };

    // Hide buttons with delay (but not if popup is open)
    const hideButtons = () => {
      if (container._isPopupOpen) {
        console.log('[Perfect Prompt] Not hiding buttons - popup is open');
        return; // Don't hide if popup is open
      }
      
      hoverTimeout = setTimeout(() => {
        // Check again if popup is still closed
        if (!container._isPopupOpen && !document.querySelector('.perfect-prompt-disable-popup')) {
          this.hideHoverButtons(hoverButtons);
          // Reset icon
          icon.style.transform = 'scale(1)';
          icon.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
        }
      }, 200);
    };

    // Icon hover events
    icon.addEventListener('mouseenter', showButtons);
    icon.addEventListener('mouseleave', hideButtons);

    // Buttons hover events (keep buttons visible)
    hoverButtons.addEventListener('mouseenter', () => {
      clearTimeout(hoverTimeout);
    });
    hoverButtons.addEventListener('mouseleave', hideButtons);

    // Store reference for popup state tracking
    container._isPopupOpen = false;
    container._showButtons = showButtons;
    container._hideButtons = hideButtons;

    // Direct click on main icon - analyze prompt
    icon.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('[Perfect Prompt] Main icon clicked');
      this.handleIconClick(field);
    });
  }

  /**
   * Hide hover buttons
   */
  hideHoverButtons(buttons) {
    buttons.style.opacity = '0';
    buttons.style.visibility = 'hidden';
    buttons.style.transform = 'translateX(10px)';
  }

  /**
   * Position icon container relative to field - Grammarly's approach
   */
  positionIcon(field, container) {
    const rect = field.getBoundingClientRect();
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    // Position at bottom-right corner of field (like Grammarly)
    const iconSize = 24;
    const padding = 4;

    container.style.left = `${rect.right + scrollX - iconSize - padding}px`;
    container.style.top = `${rect.bottom + scrollY - iconSize - padding}px`;

    console.log('[Perfect Prompt] Icon positioned at:', {
      left: container.style.left,
      top: container.style.top,
      fieldRect: rect
    });
  }

  /**
   * Update icon position (for responsive updates)
   */
  updateIconPosition(field) {
    const container = this.icons.get(field);
    if (container) {
      this.positionIcon(field, container);
    }
  }

  /**
   * Hide icon for field
   */
  hideIcon(field) {
    const container = this.icons.get(field);
    if (container) {
      container.remove();
      this.icons.delete(field);
      
      if (this.currentField === field) {
        this.currentField = null;
      }
    }
  }

  /**
   * Handle main icon click - analyze prompt
   */
  async handleIconClick(field) {
    console.log('[Perfect Prompt] Analyze prompt clicked for field:', field);
    
    // Get current prompt text from field
    const prompt = field.value || field.textContent || field.innerText || '';
    console.log('[Perfect Prompt] Current text:', prompt);
    
    if (!prompt.trim()) {
      // If no text, show helpful message
      console.log('[Perfect Prompt] No prompt text found');
      alert('💡 Please enter some text first, then click the ✨ icon to analyze and optimize your prompt!');
      return;
    }

    try {
      // Use React portal to show analysis modal
      await reactPortal.showAnalysisModal({
        field: field,
        prompt: prompt,
        onOptimize: (optimizedPrompt) => {
          console.log('[Perfect Prompt] Prompt optimized:', optimizedPrompt);
          // Copy to clipboard is handled in the modal
        },
        onApply: (optimizedPrompt) => {
          console.log('[Perfect Prompt] Applying prompt to field:', optimizedPrompt);
          this.applyPromptToField(field, optimizedPrompt);
        },
        onClose: () => {
          console.log('[Perfect Prompt] Analysis modal closed');
        }
      });
    } catch (error) {
      console.error('[Perfect Prompt] Failed to show analysis modal:', error);
      alert('❌ Failed to open analysis modal. Please try again.');
    }
  }

  /**
   * Apply optimized prompt to field
   */
  applyPromptToField(field, prompt) {
    try {
      // Apply based on field type
      if (field.value !== undefined) {
        // Input/textarea
        field.value = prompt;
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (field.contentEditable === 'true') {
        // Contenteditable
        field.textContent = prompt;
        field.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      // Focus the field
      field.focus();
      
      // Show success feedback
      this.showSuccessMessage(field, 'Prompt applied successfully! ✨');
      
    } catch (error) {
      console.error('[Perfect Prompt] Failed to apply prompt:', error);
      alert('❌ Failed to apply prompt to field.');
    }
  }

  /**
   * Show success message near field
   */
  showSuccessMessage(field, message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      background: #10b981;
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-family: system-ui, -apple-system, sans-serif;
      z-index: 2147483646;
      pointer-events: none;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;

    // Position near the field
    const rect = field.getBoundingClientRect();
    toast.style.left = `${rect.left}px`;
    toast.style.top = `${rect.top - 40}px`;

    document.body.appendChild(toast);

    // Remove after 3 seconds
    setTimeout(() => {
      if (document.contains(toast)) {
        toast.remove();
      }
    }, 3000);
  }

  /**
   * Handle prompt templates click
   */
  handleTemplatesClick(field) {
    console.log('[Perfect Prompt] Templates clicked for field:', field);
    
    // TODO: Step 4 - Add templates functionality
    alert('📋 Prompt templates coming soon!\n\nWill include:\n• Blog post templates\n• Code review prompts\n• Creative writing starters\n• Technical documentation\n• And more...');
  }

  /**
   * Show disable popup (React version with Shadcn UI)
   */
  async showDisablePopup(field, clickedElement) {
    console.log('[Perfect Prompt] showDisablePopup called', { field, clickedElement });
    
    // Get container and mark popup as open
    const container = this.icons.get(field);
    if (container) {
      container._isPopupOpen = true;
      if (container._showButtons) {
        container._showButtons(); // Keep buttons visible
      }
    }

    // Calculate position relative to the gear button that was clicked
    let position = { x: 100, y: 100 }; // fallback position
    
    if (clickedElement) {
      const rect = clickedElement.getBoundingClientRect();
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      
      console.log('[Perfect Prompt] Gear button rect:', rect);
      console.log('[Perfect Prompt] Scroll offset:', { scrollX, scrollY });
      
      // Smart positioning logic
      const popupWidth = 350;
      const margin = 10;
      
      // Try to position to the left first
      let leftPos = rect.left + scrollX - popupWidth - margin;
      
      // If it would go off-screen, position to the right instead
      if (leftPos < 10) {
        leftPos = rect.right + scrollX + margin;
      }
      
      // If still off-screen (very narrow viewport), center it
      if (leftPos + popupWidth > window.innerWidth - 10) {
        leftPos = Math.max(10, (window.innerWidth - popupWidth) / 2);
      }
      
      position = {
        x: leftPos,
        y: rect.top + scrollY - 10
      };
      
      console.log('[Perfect Prompt] Popup positioned at:', position);
    } else {
      console.warn('[Perfect Prompt] No clicked element provided, using fallback position');
    }

    try {
      // Use React portal to show disable popup
      await reactPortal.showDisablePopup({
        position: position,
        onConfirm: (hostname) => {
          console.log('[Perfect Prompt] Disabling for hostname:', hostname);
          this.disableForSite(field, null); // Pass null since we don't have vanilla popup
        },
        onClose: () => {
          console.log('[Perfect Prompt] Disable popup closed');
          // Reset popup state
          if (container) {
            container._isPopupOpen = false;
          }
        }
      });
    } catch (error) {
      console.error('[Perfect Prompt] Failed to show disable popup:', error);
      // Reset popup state on error
      if (container) {
        container._isPopupOpen = false;
      }
    }
  }

  /**
   * Disable extension for current site
   */
  disableForSite(field, popup = null) {
    const hostname = window.location.hostname;
    console.log('[Perfect Prompt] Disabling for:', hostname);
    
    // Reset popup state
    const container = this.icons.get(field);
    if (container) {
      container._isPopupOpen = false;
    }
    
    // Remove popup (only for vanilla JS version, React handles its own cleanup)
    if (popup && popup.remove) {
      popup.remove();
    }
    
    // TODO: Store disabled sites in extension storage
    
    // Hide all current icons
    this.icons.forEach((container, field) => {
      this.hideIcon(field);
    });
    
    // No toast notification - silent disable for cleaner UX
    
    // TODO: Add to disabled sites list and prevent future icon display
  }

  /**
   * Setup mutation observer for dynamic content
   */
  setupMutationObserver() {
    this.observer = new MutationObserver((mutations) => {
      let shouldRescan = false;
      
      mutations.forEach((mutation) => {
        // Check for added nodes
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if the added node or its children contain text fields
            const fields = node.querySelectorAll ? 
              node.querySelectorAll('input, textarea, [contenteditable]') : [];
            
            if (fields.length > 0 || this.isTextField(node)) {
              shouldRescan = true;
            }
          }
        });

        // Check for removed nodes (cleanup)
        mutation.removedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if any of our tracked fields were removed
            this.icons.forEach((container, field) => {
              if (!document.contains(field)) {
                this.hideIcon(field);
              }
            });
          }
        });
      });

      if (shouldRescan) {
        // Debounce rescanning
        setTimeout(() => this.scanForFields(), 100);
      }
    });

    this.observer.observe(document, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Check if element is a text field
   */
  isTextField(element) {
    if (!element.tagName) return false;
    
    const tagName = element.tagName.toLowerCase();
    if (tagName === 'textarea') return true;
    if (tagName === 'input' && (!element.type || ['text', 'email', 'search', 'url', 'tel'].includes(element.type))) return true;
    if (element.contentEditable === 'true') return true;
    if (element.getAttribute('role') === 'textbox') return true;
    
    return false;
  }

  /**
   * Setup global event listeners for responsive positioning
   */
  setupEventListeners() {
    // Handle window resize
    window.addEventListener('resize', () => {
      this.icons.forEach((container, field) => {
        this.updateIconPosition(field);
      });
    });

    // Handle scroll events
    window.addEventListener('scroll', () => {
      this.icons.forEach((container, field) => {
        this.updateIconPosition(field);
      });
    }, true); // Use capture phase to catch all scroll events

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Hide all icons when page becomes hidden
        this.icons.forEach((container, field) => {
          this.hideIcon(field);
        });
        // Clear current field tracking since all icons are hidden
        this.currentField = null;
      }
    });
  }

  /**
   * Cleanup - remove all containers and observers
   */
  destroy() {
    // Remove all icon containers
    this.icons.forEach((container, field) => {
      this.hideIcon(field);
    });

    // Clear current field tracking
    this.currentField = null;

    // Disconnect observer
    if (this.observer) {
      this.observer.disconnect();
    }

    console.log('[Perfect Prompt] Magic Icon Manager destroyed');
  }
}

// Initialize the magic icon manager when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.perfectPromptManager = new MagicIconManager();
  });
} else {
  window.perfectPromptManager = new MagicIconManager();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (window.perfectPromptManager) {
    window.perfectPromptManager.destroy();
  }
});
