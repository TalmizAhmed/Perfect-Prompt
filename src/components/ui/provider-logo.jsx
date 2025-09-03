import * as React from "react"
import { Badge } from "@/components/ui/badge"

/**
 * ProviderLogo Component
 * 
 * Renders appropriate logo/badge for different LLM providers
 * 
 * @param {Object} provider - Provider metadata object
 * @param {string} provider.model - Model name (e.g., "Gemini Nano", "GPT-4")
 * @param {string} provider.name - Provider name (e.g., "Chrome PromptAPI", "OpenAI")
 * @param {string} provider.cost - Cost indicator (e.g., "free", "paid")
 * @param {string} provider.privacy - Privacy level (e.g., "local", "cloud")
 * @param {string} size - Size variant ("sm", "md", "lg")
 */
export function ProviderLogo({ provider, size = "sm" }) {
  if (!provider) return null

  const { model, name, cost, privacy } = provider
  
  // Size configurations
  const sizeConfig = {
    sm: {
      iconSize: "w-4 h-4",
      textSize: "text-xs",
      badgeSize: "text-[10px] px-1 py-0 h-4",
      spacing: "space-x-1"
    },
    md: {
      iconSize: "w-5 h-5", 
      textSize: "text-sm",
      badgeSize: "text-xs px-2 py-1 h-5",
      spacing: "space-x-2"
    },
    lg: {
      iconSize: "w-6 h-6",
      textSize: "text-base", 
      badgeSize: "text-sm px-3 py-1 h-6",
      spacing: "space-x-3"
    }
  }
  
  const config = sizeConfig[size] || sizeConfig.sm

  // Gemini Nano (Chrome PromptAPI)
  if (model === 'Gemini Nano' || name === 'Chrome PromptAPI') {
    return (
      <div className={`flex items-center ${config.spacing} ${config.textSize} text-muted-foreground`}>
        <div className="flex items-center space-x-1">
          <div className={`${config.iconSize} rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center`}>
            <span className="text-white text-[10px] font-bold">G</span>
          </div>
          <span className="font-medium">Gemini Nano</span>
        </div>
        {privacy === 'local' && (
          <Badge variant="outline" className={config.badgeSize}>
            Local
          </Badge>
        )}
      </div>
    )
  }

  // OpenAI models (GPT-3.5, GPT-4, etc.)
  if (model?.includes('GPT') || name?.includes('OpenAI')) {
    return (
      <div className={`flex items-center ${config.spacing} ${config.textSize} text-muted-foreground`}>
        <div className="flex items-center space-x-1">
          <div className={`${config.iconSize} rounded bg-black flex items-center justify-center`}>
            <span className="text-white text-[10px] font-bold">AI</span>
          </div>
          <span className="font-medium">{model || 'OpenAI'}</span>
        </div>
        {cost === 'paid' && (
          <Badge variant="outline" className={config.badgeSize}>
            Paid
          </Badge>
        )}
      </div>
    )
  }

  // Anthropic Claude
  if (model?.includes('Claude') || name?.includes('Anthropic')) {
    return (
      <div className={`flex items-center ${config.spacing} ${config.textSize} text-muted-foreground`}>
        <div className="flex items-center space-x-1">
          <div className={`${config.iconSize} rounded bg-orange-500 flex items-center justify-center`}>
            <span className="text-white text-[10px] font-bold">C</span>
          </div>
          <span className="font-medium">{model || 'Claude'}</span>
        </div>
      </div>
    )
  }

  // Local models (Ollama, etc.)
  if (privacy === 'local' && !model?.includes('Gemini')) {
    return (
      <div className={`flex items-center ${config.spacing} ${config.textSize} text-muted-foreground`}>
        <div className="flex items-center space-x-1">
          <div className={`${config.iconSize} rounded-full bg-green-500 flex items-center justify-center`}>
            <span className="text-white text-[10px] font-bold">L</span>
          </div>
          <span className="font-medium">{model || name || 'Local AI'}</span>
        </div>
        <Badge variant="outline" className={config.badgeSize}>
          Local
        </Badge>
      </div>
    )
  }

  // Generic fallback for unknown providers
  return (
    <div className={`flex items-center space-x-1 ${config.textSize} text-muted-foreground`}>
      <div className={`${config.iconSize} rounded-full bg-gray-400 flex items-center justify-center`}>
        <span className="text-white text-[10px] font-bold">AI</span>
      </div>
      <span className="font-medium">{model || name || 'AI Model'}</span>
    </div>
  )
}