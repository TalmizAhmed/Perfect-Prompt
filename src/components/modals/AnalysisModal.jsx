import * as React from "react"
import { ChevronUpIcon, ChevronDownIcon, CheckCircledIcon, ExclamationTriangleIcon, CrossCircledIcon } from "@radix-ui/react-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { DraggableModal } from "@/components/ui/draggable-modal"
import { LLMService } from "@/services/llm/LLMService"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useToast } from "@/hooks/use-toast"



// Simple form schema - no validation constraints (handled in logic)
const formSchema = z.object({
  optimizationGoal: z.string().optional(),
  clarifyingAnswer: z.string().optional()
})

export function AnalysisModal({ 
  isOpen, 
  onClose, 
  prompt = "",
  field = null,
  onOptimize = () => {},
  onApply = () => {}
}) {
  // Hooks
  const { toast } = useToast()
  
  // Form setup
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      optimizationGoal: "",
      clarifyingAnswer: ""
    }
  })

  // Component state
  const [clarifyingQuestion, setClarifyingQuestion] = React.useState("")
  const [optimizedPrompt, setOptimizedPrompt] = React.useState("")
  
  // Background clarity analysis (informational only)
  const [clarity, setClarity] = React.useState(null)
  const [isAnalyzingClarity, setIsAnalyzingClarity] = React.useState(false)
  
  // Process states  
  const [isGeneratingQuestion, setIsGeneratingQuestion] = React.useState(false)
  const [isOptimizing, setIsOptimizing] = React.useState(false)
  const [showDetails, setShowDetails] = React.useState(false)
  const [showResults, setShowResults] = React.useState(false)

  // Get field info for context
  const fieldInfo = React.useMemo(() => {
    if (!field) return { type: "unknown", placeholder: "" }
    
    return {
      type: field.tagName?.toLowerCase() || "input",
      placeholder: field.placeholder || "",
      value: field.value || field.textContent || "",
    }
  }, [field])

  // Start background processes when modal opens (non-blocking)
  React.useEffect(() => {
    if (isOpen && prompt) {
      startBackgroundClarityAnalysis()
      generateClarifyingQuestion() // Generate immediately, independent of goal
    }
  }, [isOpen, prompt])

  // Reset state when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      form.reset() // Reset form values
      setClarifyingQuestion('')
      setOptimizedPrompt('')
      setClarity(null)
      setIsAnalyzingClarity(false)
      setIsGeneratingQuestion(false)
      setIsOptimizing(false)
      setShowDetails(false)
      setShowResults(false)
    }
  }, [isOpen, form])

  // Background clarity analysis (informational, non-blocking)
  const startBackgroundClarityAnalysis = async () => {
    setIsAnalyzingClarity(true)
    try {
      const llmService = LLMService.getInstance()
      const result = await llmService.analyzeClarity(prompt)
      setClarity(result)
      console.log('[AnalysisModal] Background clarity analysis complete:', result?.clarityScore)
    } catch (error) {
      console.warn('[AnalysisModal] Background clarity analysis failed:', error)
      // Subtle notification for background process failure
      toast({
        variant: "default",
        title: "Clarity Analysis Unavailable",
        description: "Background analysis couldn't complete, but you can still optimize your prompt.",
        duration: 3000
      })
    } finally {
      setIsAnalyzingClarity(false)
    }
  }

  // Generate clarifying question immediately on modal open (independent of goal)
  const generateClarifyingQuestion = async () => {
    setIsGeneratingQuestion(true)
    try {
      const llmService = LLMService.getInstance()
      // Generate question based ONLY on original prompt clarity, not optimization goal
      const result = await llmService.generateSmartQuestion(prompt)
      
      if (result?.question) {
        setClarifyingQuestion(result.question)
        console.log('[AnalysisModal] Clarifying question generated:', result.question)
      }
    } catch (error) {
      console.warn('[AnalysisModal] Question generation failed:', error)
      // Subtle notification for background process failure
      toast({
        variant: "default",
        title: "Clarifying Question Unavailable",
        description: "Couldn't generate a clarifying question, but optimization will still work.",
        duration: 3000
      })
    } finally {
      setIsGeneratingQuestion(false)
    }
  }

  // Form submission handler with proper event isolation
  const onSubmit = async (data, event) => {
    // Critical: Stop event from bubbling to original page
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    await handleOptimizeNow(data)
  }

  // Independent optimization using form data
  const handleOptimizeNow = async (formData = null) => {
    const data = formData || form.getValues()
    const hasGoal = data.optimizationGoal?.trim()
    const hasAnswer = data.clarifyingAnswer?.trim()
    
    // Your original logic - allow optimization with either goal OR answer OR both
    if (!hasGoal && !hasAnswer) {
      toast({
        variant: "destructive",
        title: "Input Required",
        description: "Please provide either an optimization goal or answer the clarifying question!"
      })
      return
    }

    setIsOptimizing(true)
    setShowResults(false) // Reset animation
    
    try {
      console.log('[AnalysisModal] Starting independent optimization...')
      console.log('  - Has goal:', hasGoal)
      console.log('  - Has clarifying answer:', hasAnswer)
      
      const llmService = LLMService.getInstance()
      
      // Use appropriate optimization goal
      const effectiveGoal = hasGoal 
        ? data.optimizationGoal 
        : "general improvement based on clarifying context"
      
      const result = await llmService.optimizeWithFullContext({
        originalPrompt: prompt,
        optimizationGoal: effectiveGoal,
        clarifyingAnswer: data.clarifyingAnswer
      })
      
      setOptimizedPrompt(result.optimizedPrompt)
      
      // Smooth reveal after optimization
      setTimeout(() => setShowResults(true), 150)
      
      console.log('[AnalysisModal] Independent optimization complete')
      
    } catch (error) {
      console.error('[AnalysisModal] Optimization failed:', error)
      toast({
        variant: "destructive",
        title: "Optimization Failed",
        description: "Something went wrong while optimizing your prompt. Please try again!"
      })
    } finally {
      setIsOptimizing(false)
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

  return (
    <DraggableModal
      isOpen={isOpen}
      onClose={onClose}
      title="Perfect Prompt Analysis"
      maxWidth="450px"
    >
        
        {/* Original Prompt - Always Visible */}
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <Label className="text-xs text-muted-foreground block mb-1">Original Prompt:</Label>
          <p className="text-sm text-gray-800 font-medium leading-relaxed">{prompt}</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

          {/* ✨ Optimization Goal Input - Hide when results shown */}
          {!(optimizedPrompt && showResults) && (
            <Card>
            <CardContent className="p-4">
              <FormField
                control={form.control}
                name="optimizationGoal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      What optimization would you like?
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Make it more professional, Add technical details, Simplify for beginners..."
                        {...field}
                        className="w-full"
                        autoFocus // 🎯 User Intent First!
                        onKeyDown={(e) => {
                          // Prevent Enter from bubbling to original field
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            e.stopPropagation()
                            // Submit the form instead
                            form.handleSubmit(onSubmit)()
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          )}

          {/* Clean Clarity Display */}
          {clarity && (
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center space-x-3">
                <span className="text-sm text-muted-foreground">Clarity:</span>
                <span className={`text-sm font-mono font-semibold ${
                  clarity.clarityScore >= 7 
                    ? 'text-green-600' 
                    : clarity.clarityScore >= 4 
                    ? 'text-yellow-600' 
                    : 'text-red-600'
                }`}>
                  {clarity.clarityScore}/10
                </span>
              </div>
              <Badge 
                variant="secondary"
                className={`pointer-events-none ${
                  clarity.clarityScore >= 7 
                    ? 'bg-green-500 text-white' 
                    : clarity.clarityScore >= 4 
                    ? 'bg-yellow-500 text-white' 
                    : 'bg-red-500 text-white'
                }`}
              >
                {clarity.clarityScore >= 7 ? (
                  <><CheckCircledIcon className="h-3 w-3 mr-1" />Clear</>
                ) : clarity.clarityScore >= 4 ? (
                  <><ExclamationTriangleIcon className="h-3 w-3 mr-1" />Needs work</>
                ) : (
                  <><CrossCircledIcon className="h-3 w-3 mr-1" />Too vague</>
                )}
              </Badge>
            </div>
          )}

          {/* Background Clarity Analysis Status */}
          {isAnalyzingClarity && (
            <div className="flex items-center space-x-2 p-3 bg-muted/30 rounded-lg text-sm">
              <Skeleton className="h-3 w-3 rounded-full animate-pulse" />
              <span className="text-muted-foreground">Analyzing clarity in background...</span>
            </div>
          )}

          {/* ✨ NEW: Smart Clarifying Question Loading - Hide when results shown */}
          {isGeneratingQuestion && !clarifyingQuestion && !(optimizedPrompt && showResults) && (
            <Card className="border-blue-200 bg-blue-50/30">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Skeleton className="h-4 w-4 rounded-full animate-pulse" />
                  <span>Generating clarifying question...</span>
                </div>
              </CardContent>
            </Card>
          )}

                      {/* Smart Clarifying Question - Hide when results shown */}
            {clarifyingQuestion && !(optimizedPrompt && showResults) && (
              <Card className="border-blue-200 bg-blue-50/30">
                <CardContent className="p-4">
                  <FormField
                    control={form.control}
                    name="clarifyingAnswer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-blue-900">
                          One clarifying question to improve your result:
                        </FormLabel>
                        <p className="text-sm text-blue-800 mb-3">{clarifyingQuestion}</p>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Your answer (optional - you can skip and optimize anyway)..."
                            className="w-full min-h-[60px] border-blue-300 focus:border-blue-400"
                            onKeyDown={(e) => {
                              // Prevent Enter from bubbling to original field
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                e.stopPropagation()
                                // Submit the form instead
                                form.handleSubmit(onSubmit)()
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

          {/* Optimized Results */}
          {optimizedPrompt && showResults && (
            <div className="space-y-3">
              {/* Main Result - Editable Optimized Prompt */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">Optimized Result</Label>
                  <Button 
                     variant="ghost" 
                     size="sm" 
                     type="button"
                     onClick={() => setShowDetails(!showDetails)}
                     className="text-xs h-6 flex items-center space-x-1"
                   >
                     <span>Details</span>
                     {showDetails ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />}
               </Button>
                </div>
                
                <Textarea
                  className="border-green-300 bg-green-50/30 focus:bg-background focus:border-green-400 min-h-[100px] resize-y"
                  value={optimizedPrompt}
                  onChange={(e) => setOptimizedPrompt(e.target.value)}
                  placeholder="Optimized prompt will appear here (you can edit it)..."
                  onKeyDown={(e) => {
                    // Prevent any key events from bubbling to original field
                    e.stopPropagation()
                  }}
                />
              </div>
              {/* Professional Collapsible Details */}
              {showDetails && (
                <div className="space-y-3">
                  
                  {/* Show clarity details when available */}
                  {clarity?.issues?.length > 0 && (
                    <Alert>
                      <ExclamationTriangleIcon className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-1">
                          <span className="font-medium text-xs">Issues Found:</span>
                          <ul className="mt-1 space-y-1 text-xs">
                            {clarity.issues.map((issue, index) => (
                              <li key={index}>• {issue}</li>
                            ))}
                          </ul>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {clarity?.feedback && (
                    <div className="p-2 bg-muted/30 rounded text-xs text-muted-foreground">
                      💡 {clarity.feedback}
                    </div>
                  )}
                  
                  {/* Show placeholder if no clarity data yet */}
                  {!clarity && (
                    <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
                      💡 Clarity analysis details will appear here when ready
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

            {/* Bottom Submit Button - Inside Form */}
            <div className="flex justify-center mt-6 pt-4">
              {/* Hide Optimize button when results are shown */}
              {!(optimizedPrompt && showResults) && (
                <Button 
                  type="submit"
                  disabled={isOptimizing}
                  className="bg-green-600 hover:bg-green-700"
                >
                {isOptimizing ? (
                  <>
                    <Skeleton className="h-4 w-4 rounded-full animate-pulse mr-2" />
                    Optimizing...
                  </>
                ) : (
                  "✨ Optimize Prompt"
                )}
                </Button>
              )}
            </div>
          </form>
        </Form>
        
        {/* Action Bar - Outside Form (for Apply/Copy) */}
        {optimizedPrompt && showResults && (
          <div className="flex justify-center space-x-3 mt-4 pt-3 border-t">
            <Button onClick={handleApply} variant="default">
              Apply to Field
            </Button>
            <Button variant="outline" onClick={handleOptimize} size="sm">
              Copy
            </Button>
          </div>
        )}
    </DraggableModal>
  )
}
