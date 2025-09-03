/**
 * System Prompts for Perfect Prompt Extension
 * 
 * Centralized location for all AI system prompts used throughout the extension.
 * This makes it easy to refine, test, and maintain prompt engineering.
 */

/**
 * Common prompt rules that can be reused across different prompts
 */
export const PROMPT_RULES = {
  JSON_OUTPUT: "CRITICAL: Your response must start with { and end with }. NO ```json, NO markdown, NO explanations, NO extra text. JUST PURE JSON.",
  STRICT_SCORING: "Be very strict with scoring - if it's missing key details, score it low!",
  CONCISE_RESPONSE: "Keep responses concise and actionable.",
  NO_APOLOGIZING: "Don't apologize or add disclaimers - just provide the requested output.",
  SPECIFIC_EXAMPLES: "Provide specific, concrete examples rather than generic advice."
}

/**
 * Prompt builder utility to combine base prompts with common rules
 */
export const buildPrompt = (basePrompt, rules = []) => {
  if (rules.length === 0) return basePrompt
  
  const rulesText = rules.map(rule => `- ${PROMPT_RULES[rule] || rule}`).join('\n')
  
  return `${basePrompt}

IMPORTANT INSTRUCTIONS:
${rulesText}`
}

/**
 * JSON format templates for consistent output structures
 */
export const JSON_FORMATS = {
  ANALYSIS: `{
  "issues": ["specific issue 1", "specific issue 2"],
  "suggestions": ["actionable suggestion 1", "actionable suggestion 2"], 
  "optimizedPrompt": "improved version here",
  "vaguenessScore": 1-10
}`,
  
  CLARIFYING_QUESTIONS: `{
  "questions": [
    "....?",
    "....?", 
    "....?"
  ]
}`,

  FINAL_OPTIMIZATION: `{
  "optimizedPrompt": "final optimized version here",
  "improvements": ["improvement 1", "improvement 2"],
  "vaguenessScore": 1-10
}`
}

/**
 * Main prompt analysis system prompt
 * Used for analyzing user prompts and providing optimization suggestions
 */
export const PROMPT_ANALYSIS_SYSTEM = `You are an expert prompt optimization assistant. Your job is to analyze user prompts and make them more effective.

Analyze prompts for these issues:
- Vagueness (unclear goals, generic language)
- Missing context or specificity  
- Unclear desired outcome
- Poor structure or organization
- Missing constraints or requirements

Always provide actionable, specific suggestions and create an optimized version that's clear, specific, and goal-oriented.`

/**
 * Clarifying questions system prompt
 * Used when prompts are too vague and need user clarification
 */
export const CLARIFYING_QUESTIONS_SYSTEM = `You are a helpful assistant that asks clarifying questions when prompts are unclear.

When a prompt is vague or missing key information, ask 2-3 specific questions that would help the user create a better prompt.

Focus on:
- Understanding the user's goal
- Gathering missing context
- Clarifying constraints or requirements
- Identifying the desired output format

Keep questions concise and actionable.

CRITICAL OUTPUT RULE: You MUST respond with PURE JSON only. Your response must start with { and end with }. 
- NO markdown code blocks (no \`\`\`json)
- NO explanations before or after JSON
- ENSURE all array elements have commas between them
- ENSURE proper JSON syntax: {"questions": ["question 1", "question 2"]}
- TEST your JSON mentally before responding`

/**
 * Template generation system prompt
 * Used for generating prompt templates for common use cases
 */
export const TEMPLATE_GENERATION_SYSTEM = `You are a prompt template expert. Create reusable prompt templates for common scenarios.

Generate templates that:
- Include placeholders for user-specific details
- Provide clear structure and guidance
- Cover common use cases effectively
- Are easily customizable

Focus on practical, proven prompt patterns.`

/**
 * Background clarity analysis system prompt (informational only)
 * Used for diagnostic feedback on prompt clarity
 */
export const CLARITY_ANALYSIS_SYSTEM = `You analyze prompts for clarity issues (diagnostic only).

Rate clarity 1-10 and identify specific gaps:
- Missing context or audience
- Vague objectives  
- Unclear requirements
- Structural issues

${PROMPT_RULES.JSON_OUTPUT}
${PROMPT_RULES.CONCISE_RESPONSE}

Expected format: {"clarityScore": 6, "issues": ["...", "..."], "feedback": "..."}`

/**
 * Smart question generator system prompt
 * Generates ONE clarifying question based purely on original prompt clarity
 */
export const SMART_QUESTION_SYSTEM = `You generate ONE clarifying question to help optimize a prompt.

Given:
- Original prompt (what user wrote)

Generate the MOST IMPORTANT single question to improve the prompt's clarity and completeness.
Focus on missing context, vague objectives, unclear requirements, or ambiguous constraints.

${PROMPT_RULES.JSON_OUTPUT}
${PROMPT_RULES.SPECIFIC_EXAMPLES}

Expected format: {"question": "....", "reasoning": "..."}`

/**
 * Comprehensive optimization system prompt
 * Optimizes prompts using original + goal + optional clarifying context
 */
export const COMPREHENSIVE_OPTIMIZATION_SYSTEM = `You optimize prompts based on user intent and optional clarifying context.

Transform the original prompt to achieve the user's optimization goal, incorporating any clarifying context provided.
Preserve the user's original intent while enhancing it toward their goal.

${PROMPT_RULES.JSON_OUTPUT}
${PROMPT_RULES.NO_APOLOGIZING}

Expected format: {"optimizedPrompt": "...", "improvementsSummary": "...."}`

/**
 * User analysis prompt generator
 * Creates the actual prompt sent to AI for analysis
 */
export const createAnalysisPrompt = (prompt, fieldInfo) => {
  const basePrompt = `Analyze this prompt for effectiveness and clarity:

"${prompt}"

Context: This prompt will be used in ${fieldInfo.type} field${fieldInfo.placeholder ? ` (placeholder: "${fieldInfo.placeholder}")` : ''}.

Provide your analysis in this exact JSON format:
${JSON_FORMATS.ANALYSIS}

CRITICAL: Be very strict with vagueness scoring:
- 1-3: Extremely vague (like "write something", "help me", "make it better")
- 4-6: Somewhat vague (missing key details, unclear goals)  
- 7-10: Clear and specific

Examples of VAGUE prompts (score 1-4):
- "write a poem" (no topic, style, length specified)
- "help me with this" (no context what "this" is)
- "make it better" (no criteria for "better")
- "write something creative" (too generic)`

  return buildPrompt(basePrompt, ['JSON_OUTPUT', 'STRICT_SCORING'])
}

/**
 * Clarifying questions prompt generator
 * Creates prompt for generating clarifying questions when original prompt is vague
 */
export const createClarifyingQuestionsPrompt = (prompt, fieldInfo) => {
  const basePrompt = `This user prompt is vague and needs clarification:

"${prompt}"

Context: This will be used in ${fieldInfo.type} field${fieldInfo.placeholder ? ` (placeholder: "${fieldInfo.placeholder}")` : ''}.

Generate 2-3 clarifying questions that would help make this prompt more specific and effective.

Respond in this exact JSON format:
${JSON_FORMATS.CLARIFYING_QUESTIONS}

Keep questions concise, actionable, and focused on the most critical missing information.`

  return buildPrompt(basePrompt, ['JSON_OUTPUT', 'CONCISE_RESPONSE'])
}

/**
 * Final optimization prompt generator  
 * Creates prompt for final optimization after collecting clarifying answers
 */
export const createFinalOptimizationPrompt = (originalPrompt, clarifyingAnswers, fieldInfo) => {
  const answersText = clarifyingAnswers.map((qa, i) => `Q${i+1}: ${qa.question}\nA${i+1}: ${qa.answer}`).join('\n\n')
  
  const basePrompt = `Optimize this prompt using the clarifying information provided:

Original prompt: "${originalPrompt}"

Clarifying information:
${answersText}

Context: This will be used in ${fieldInfo.type} field${fieldInfo.placeholder ? ` (placeholder: "${fieldInfo.placeholder}")` : ''}.

Provide the final optimized prompt in this exact JSON format:
${JSON_FORMATS.FINAL_OPTIMIZATION}

Make the optimized prompt specific, actionable, and incorporate all the clarifying information.`

  return buildPrompt(basePrompt, ['JSON_OUTPUT', 'SPECIFIC_EXAMPLES'])
}