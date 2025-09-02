import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function AnalysisModal({ 
  isOpen, 
  onClose, 
  prompt = "",
  field = null,
  onOptimize = () => {},
  onApply = () => {}
}) {
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [analysis, setAnalysis] = React.useState(null)
  const [optimizedPrompt, setOptimizedPrompt] = React.useState("")

  // Get field info for context
  const fieldInfo = React.useMemo(() => {
    if (!field) return { type: "unknown", placeholder: "" }
    
    return {
      type: field.tagName?.toLowerCase() || "input",
      placeholder: field.placeholder || "",
      value: field.value || field.textContent || "",
    }
  }, [field])

  // Analyze prompt when modal opens
  React.useEffect(() => {
    if (isOpen && prompt && !analysis) {
      analyzePrompt()
    }
  }, [isOpen, prompt, analysis])

  const analyzePrompt = async () => {
    setIsAnalyzing(true)
    
    try {
      // TODO: Replace with actual PromptAPI call
      // Simulating analysis for now
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Mock analysis result
      const mockAnalysis = {
        issues: ["Too vague", "Missing context", "No specific goal"],
        suggestions: ["Be more specific about the desired outcome", "Add context about your use case", "Include constraints or requirements"],
        optimizedPrompt: `${prompt}\n\nPlease provide a detailed response that addresses the specific requirements and constraints mentioned above.`
      }
      
      setAnalysis(mockAnalysis)
      setOptimizedPrompt(mockAnalysis.optimizedPrompt)
    } catch (error) {
      console.error('[Perfect Prompt] Analysis failed:', error)
      setAnalysis({ 
        issues: ["Analysis failed"], 
        suggestions: ["Please try again"],
        optimizedPrompt: prompt 
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleOptimize = () => {
    onOptimize(optimizedPrompt)
  }

  const handleApply = () => {
    if (field && optimizedPrompt) {
      // Apply optimized prompt to the field
      if (field.value !== undefined) {
        field.value = optimizedPrompt
      } else if (field.textContent !== undefined) {
        field.textContent = optimizedPrompt
      }
      
      // Trigger input event to notify any listeners
      field.dispatchEvent(new Event('input', { bubbles: true }))
    }
    
    onApply(optimizedPrompt)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Perfect Prompt Analysis</DialogTitle>
          <DialogDescription>
            Analyzing your prompt for clarity and effectiveness
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Original Prompt */}
          <div>
            <label className="text-sm font-medium">Original Prompt</label>
            <div className="mt-1 p-3 bg-muted rounded-md text-sm">
              {prompt || "No prompt provided"}
            </div>
          </div>

          {/* Field Context */}
          {fieldInfo.placeholder && (
            <div>
              <label className="text-sm font-medium">Field Context</label>
              <div className="mt-1 p-2 bg-accent rounded-md text-xs text-muted-foreground">
                Field type: {fieldInfo.type} • Placeholder: "{fieldInfo.placeholder}"
              </div>
            </div>
          )}

          {/* Analysis Loading */}
          {isAnalyzing && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="text-sm text-muted-foreground">Analyzing prompt...</span>
              </div>
            </div>
          )}

          {/* Analysis Results */}
          {analysis && !isAnalyzing && (
            <>
              {/* Issues Found */}
              {analysis.issues?.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-destructive">Issues Found</label>
                  <ul className="mt-1 space-y-1">
                    {analysis.issues.map((issue, index) => (
                      <li key={index} className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                        • {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggestions */}
              {analysis.suggestions?.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-primary">Suggestions</label>
                  <ul className="mt-1 space-y-1">
                    {analysis.suggestions.map((suggestion, index) => (
                      <li key={index} className="text-sm bg-primary/10 p-2 rounded">
                        • {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Optimized Prompt */}
              <div>
                <label className="text-sm font-medium">Optimized Prompt</label>
                <textarea
                  className="mt-1 w-full p-3 border border-input rounded-md text-sm min-h-[120px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={optimizedPrompt}
                  onChange={(e) => setOptimizedPrompt(e.target.value)}
                  placeholder="Optimized prompt will appear here..."
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {analysis && (
            <>
              <Button variant="secondary" onClick={handleOptimize}>
                Copy Optimized
              </Button>
              <Button onClick={handleApply}>
                Apply to Field
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
