import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { ChevronUpIcon, ChevronDownIcon } from "@radix-ui/react-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { LLMService } from "@/services/llm/LLMService"

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
  
  // Clarifying questions flow state
  const [clarifyingQuestions, setClarifyingQuestions] = React.useState([])
  const [clarifyingAnswers, setClarifyingAnswers] = React.useState([])
  const [isGeneratingQuestions, setIsGeneratingQuestions] = React.useState(false)
  const [showClarifyingQuestions, setShowClarifyingQuestions] = React.useState(false)
  const [phase, setPhase] = React.useState('initial') // 'initial' | 'clarifying' | 'final'
  const [downloadProgress, setDownloadProgress] = React.useState(0)
  const [isDownloading, setIsDownloading] = React.useState(false)
  const [showDetails, setShowDetails] = React.useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0)

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

  // Reset state when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setAnalysis(null)
      setOptimizedPrompt('')
      setClarifyingQuestions([])
      setClarifyingAnswers([])
      setShowClarifyingQuestions(false)
      setPhase('initial')
      setIsAnalyzing(false)
      setIsGeneratingQuestions(false)
      setDownloadProgress(0)
      setIsDownloading(false)
      setCurrentQuestionIndex(0) // Reset stepper
    }
  }, [isOpen])

  const analyzePrompt = async () => {
    setIsAnalyzing(true)
    setAnalysis(null) // Clear previous results
    
    try {
      console.log('[AnalysisModal] Starting analysis...')
      
      // Get LLMService instance
      console.log('[AnalysisModal] Getting LLMService instance...')
      const llmService = LLMService.getInstance()
      console.log('[AnalysisModal] LLMService instance obtained:', llmService)
      
      // Setup progress callback for download tracking
      const onProgress = (e) => {
        const progress = Math.round(e.loaded * 100)
        console.log(`[Perfect Prompt] Model download progress: ${progress}%`)
        
        // Update analysis state to show download progress
        setAnalysis({
          issues: [`Downloading AI model: ${progress}%`],
          suggestions: ['Please wait while the AI model downloads...'],
          optimizedPrompt: prompt,
          isDownloading: true,
          downloadProgress: progress
        })
      }

      // Perform analysis using LLMService (handles provider selection, caching, etc.)
      const analysisResult = await llmService.analyzePrompt(prompt, fieldInfo, onProgress)
      
      console.log('[Perfect Prompt] Analysis complete:', analysisResult)
      
      // Update UI with results
      setAnalysis(analysisResult)
      setOptimizedPrompt(analysisResult.optimizedPrompt)
      
      // Check if prompt needs clarifying questions (vagueness score < 5)
      console.log('[AnalysisModal] CLARIFYING DECISION:')
      console.log('  - Prompt analyzed:', `"${prompt}"`)
      console.log('  - Vagueness score:', analysisResult.vaguenessScore)
      console.log('  - Analysis success:', analysisResult.success)
      console.log('  - Needs clarifying?', analysisResult.vaguenessScore < 5 && analysisResult.success)
      
      if (analysisResult.vaguenessScore < 5 && analysisResult.success) {
        console.log('[AnalysisModal] 🔍 Prompt is vague (score:', analysisResult.vaguenessScore, '), generating clarifying questions...')
        setPhase('clarifying')
        await generateClarifyingQuestions()
      } else {
        console.log('[AnalysisModal] ✅ Prompt is clear enough (score:', analysisResult.vaguenessScore, '), skipping clarifying questions')
        setPhase('final')
      }

    } catch (error) {
      console.error('[Perfect Prompt] Analysis failed:', error)
      
      // Show error in standard format
      setAnalysis({
        success: false,
        issues: [`Analysis failed: ${error.message}`],
        suggestions: [
          "Check if PromptAPI is enabled in chrome://flags/",
          "Ensure sufficient storage space (22GB)",
          "Try refreshing the page and trying again"
        ],
        optimizedPrompt: prompt,
        vaguenessScore: 0,
        provider: 'error',
        confidence: 0
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const generateClarifyingQuestions = async () => {
    setIsGeneratingQuestions(true)
    
    try {
      const llmService = LLMService.getInstance()
      
      const onProgress = (e) => {
        const progress = Math.round(e.loaded * 100)
        setDownloadProgress(progress)
        setIsDownloading(true)
      }
      
      const questionsResult = await llmService.generateClarifyingQuestions(prompt, fieldInfo, onProgress)
      
      if (questionsResult.success && questionsResult.questions?.length > 0) {
        setClarifyingQuestions(questionsResult.questions)
        setClarifyingAnswers(questionsResult.questions.map(q => ({ question: q, answer: '' })))
        setCurrentQuestionIndex(0) // Start from first question
        setShowClarifyingQuestions(true)
        console.log('[AnalysisModal] Clarifying questions generated:', questionsResult.questions.length)
      } else {
        console.warn('[AnalysisModal] No clarifying questions generated, proceeding to final')
        setPhase('final')
      }
    } catch (error) {
      console.error('[AnalysisModal] Failed to generate clarifying questions:', error)
      setPhase('final') // Fallback to final phase
    } finally {
      setIsGeneratingQuestions(false)
      setIsDownloading(false)
    }
  }

  const handleAnswerChange = (questionIndex, answer) => {
    setClarifyingAnswers(prev => 
      prev.map((qa, index) => 
        index === questionIndex ? { ...qa, answer } : qa
      )
    )
  }

  const handleContinueWithAnswers = async () => {
    // Filter only answered questions for optimization
    const answeredQuestions = clarifyingAnswers.filter(qa => qa.answer.trim())
    
    if (answeredQuestions.length === 0) {
      console.log('[AnalysisModal] No questions answered, proceeding with original analysis')
      setPhase('final')
      return
    }
    
    console.log(`[AnalysisModal] Continuing with ${answeredQuestions.length} answered questions`)

    setIsAnalyzing(true)
    setShowClarifyingQuestions(false)
    
    try {
      const llmService = LLMService.getInstance()
      
      const onProgress = (e) => {
        const progress = Math.round(e.loaded * 100)
        setDownloadProgress(progress)
        setIsDownloading(true)
      }
      
      // Get final optimization with answered questions only
      const finalResult = await llmService.optimizeWithContext(prompt, answeredQuestions, fieldInfo, onProgress)
      
      console.log('[AnalysisModal] Final optimization complete:', finalResult)
      
      // Update analysis with final results
      setAnalysis(prev => ({
        ...prev,
        ...finalResult,
        issues: prev.issues, // Keep original issues for reference
        suggestions: prev.suggestions // Keep original suggestions for reference
      }))
      setOptimizedPrompt(finalResult.optimizedPrompt)
      setPhase('final')
      
    } catch (error) {
      console.error('[AnalysisModal] Final optimization failed:', error)
      setPhase('final') // Still show results even if final optimization failed
    } finally {
      setIsAnalyzing(false)
      setIsDownloading(false)
    }
  }

  // Analysis now handled by extensible LLMService with session caching

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

  // Custom Dialog without Portal - renders directly in Shadow DOM
  if (!isOpen) return null

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={onClose}>
      {/* No overlay - clean modal without background darkening */}
      
      {/* Custom content that renders in place without Portal */}
      <div
        className={cn(
          "fixed z-50 w-full max-w-[450px] border bg-background p-4 shadow-lg",
          "rounded-lg border border-border bg-card text-card-foreground"
        )}
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          maxHeight: '80vh',
          overflow: 'auto'
        }}
      >
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-3">
          <DialogPrimitive.Title className="text-lg font-semibold">
            🎯 Perfect Prompt Analysis
          </DialogPrimitive.Title>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
            ✕
          </Button>
        </div>
        
        <div className="space-y-3">
          {/* Compact Status Bar */}
          {analysis && !isAnalyzing && (
            <div className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
              <div className="flex items-center space-x-2">
                <span>📊 Clarity:</span>
                <span className={`font-medium ${
                  analysis.vaguenessScore >= 7 ? 'text-green-600' :
                  analysis.vaguenessScore >= 4 ? 'text-yellow-600' : 
                  'text-red-600'
                }`}>
                  {analysis.vaguenessScore}/10
                </span>
                <span className="text-xs">
                  {analysis.vaguenessScore >= 7 ? '✅ Clear' :
                   analysis.vaguenessScore >= 4 ? '⚠️ Needs work' : 
                   '❌ Too vague'}
                </span>
              </div>
              {phase === 'clarifying' && (
                <span className="text-xs text-muted-foreground">🔍 Asking questions...</span>
              )}
            </div>
          )}

          {/* Compact Loading */}
          {isAnalyzing && (
            <div className="flex items-center space-x-2 p-2 bg-muted/30 rounded text-sm">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
              <span className="text-muted-foreground">
                {isDownloading ? `Downloading model ${downloadProgress}%` : 'Analyzing...'}
              </span>
              {isDownloading && downloadProgress > 0 && (
                <div className="flex-1 bg-secondary rounded-full h-1 max-w-[100px]">
                  <div 
                    className="bg-primary h-1 rounded-full transition-all"
                    style={{ width: `${downloadProgress}%` }}
                  ></div>
                </div>
              )}
            </div>
          )}

          {/* Step-by-Step Clarifying Questions */}
          {showClarifyingQuestions && phase === 'clarifying' && clarifyingAnswers.length > 0 && (
            <div className="bg-blue-50/50 border border-blue-200 rounded p-4">
              {/* Progress Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-blue-900">❓ Clarifying Questions</span>
                  <span className="text-xs bg-blue-100 px-2 py-1 rounded text-blue-700">
                    {currentQuestionIndex + 1} of {clarifyingAnswers.length}
                  </span>
                </div>
                
                {/* Progress Dots */}
                <div className="flex space-x-1">
                  {clarifyingAnswers.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full ${
                        index <= currentQuestionIndex ? 'bg-blue-500' : 'bg-blue-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
              
              {/* Current Question */}
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-blue-900 block mb-2">
                    {clarifyingAnswers[currentQuestionIndex]?.question}
                  </label>
                  <Input
                    value={clarifyingAnswers[currentQuestionIndex]?.answer || ''}
                    onChange={(e) => handleAnswerChange(currentQuestionIndex, e.target.value)}
                    placeholder="Type your answer here..."
                    className="w-full"
                    autoFocus
                  />
                </div>
              </div>
              
              {/* Navigation */}
              <div className="flex justify-between mt-4">
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                    disabled={currentQuestionIndex === 0}
                  >
                    ← Previous
                  </Button>
                  {currentQuestionIndex < clarifyingAnswers.length - 1 && (
                    <Button 
                      size="sm"
                      onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                    >
                      Next →
                    </Button>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    size="sm"
                    onClick={handleContinueWithAnswers}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Optimize Now
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setPhase('final')}>
                    Skip All
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Focused Results */}
          {analysis && !isAnalyzing && phase === 'final' && (
            <div className="space-y-3">
              {/* Main Result - Editable Optimized Prompt */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">✅ Optimized Result:</label>
                  <Button 
                     variant="ghost" 
                     size="sm" 
                     onClick={() => setShowDetails(!showDetails)}
                     className="text-xs h-6 flex items-center space-x-1"
                   >
                     <span>Details</span>
                     {showDetails ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />}
               </Button>
                </div>
                
                <textarea
                  className="w-full p-3 border border-green-300 rounded-md text-sm bg-green-50/30 focus:bg-background focus:border-green-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/20 min-h-[100px] resize-y"
                  value={optimizedPrompt}
                  onChange={(e) => setOptimizedPrompt(e.target.value)}
                  placeholder="Optimized prompt will appear here (you can edit it)..."
                />
              </div>
              {/* Collapsible Details */}
              {showDetails && (
                <div className="space-y-2 text-xs">
                  {/* Issues */}
                  {analysis.issues?.length > 0 && (
                    <div>
                      <span className="font-medium text-red-600">Issues:</span>
                      <ul className="mt-1 space-y-1 text-red-700">
                        {analysis.issues.map((issue, index) => (
                          <li key={index}>• {issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Suggestions */}
                  {analysis.suggestions?.length > 0 && (
                    <div>
                      <span className="font-medium text-blue-600">Suggestions:</span>
                      <ul className="mt-1 space-y-1 text-blue-700">
                        {analysis.suggestions.map((suggestion, index) => (
                          <li key={index}>• {suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Compact Actions */}
        {analysis && !isAnalyzing && phase === 'final' && (
          <div className="flex justify-center space-x-2 mt-4 pt-3 border-t">
            <Button onClick={handleApply} className="flex-1">
              Apply to Field
            </Button>
            <Button variant="outline" onClick={handleOptimize} size="sm">
              Copy
            </Button>
          </div>
        )}
      </div>
    </DialogPrimitive.Root>
  )
}
