import { useState } from 'react'

export default function PromptApiTest() {
  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [apiStatus, setApiStatus] = useState('Checking...')
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [session, setSession] = useState(null)
  const [modelParams, setModelParams] = useState(null)

  // Check Prompt API availability and model parameters
  const checkAvailability = async () => {
    try {
      // Check if LanguageModel is available (Chrome 138+)
      if (typeof LanguageModel === 'undefined') {
        setApiStatus('❌ LanguageModel API not available (requires Chrome 138+)')
        return
      }

      const available = await LanguageModel.availability()
      
      switch (available) {
        case 'unavailable':
          setApiStatus('❌ Prompt API not available on this device')
          break
        case 'downloadable':
          setApiStatus('⬇️ Model needs to be downloaded (22GB required)')
          break
        case 'downloading':
          setApiStatus('⏳ Model is currently downloading...')
          break
        case 'available':
          setApiStatus('✅ Prompt API ready to use')
          // Get model parameters when available
          try {
            const params = await LanguageModel.params()
            setModelParams(params)
            console.log('Model parameters:', params)
          } catch (paramError) {
            console.error('Error getting model parameters:', paramError)
          }
          break
        default:
          setApiStatus('❓ Unknown availability status')
      }
    } catch (error) {
      console.error('Error checking availability:', error)
      setApiStatus('❌ Error checking API availability: ' + error.message)
    }
  }

  // Initialize session with download monitoring
  const initializeSession = async () => {
    try {
      setIsLoading(true)
      const newSession = await LanguageModel.create({
        monitor(m) {
          m.addEventListener('downloadprogress', (e) => {
            const progress = Math.round(e.loaded * 100)
            setDownloadProgress(progress)
            console.log(`Downloaded ${progress}%`)
          })
        },
      })
      setSession(newSession)
      setApiStatus('✅ Session created successfully')
    } catch (error) {
      console.error('Error creating session:', error)
      setApiStatus('❌ Failed to create session')
    } finally {
      setIsLoading(false)
    }
  }

  // Send prompt to the model
  const sendPrompt = async () => {
    if (!session || !prompt.trim()) return

    try {
      setIsLoading(true)
      setResponse('Thinking...')
      
      const result = await session.prompt(prompt)
      setResponse(result)
      
      // Log session usage
      console.log(`Token usage: ${session.inputUsage}/${session.inputQuota}`)
    } catch (error) {
      console.error('Error with prompt:', error)
      setResponse('Error: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Send streaming prompt to the model
  const sendStreamingPrompt = async () => {
    if (!session || !prompt.trim()) return

    try {
      setIsLoading(true)
      setResponse('')
      
      const stream = session.promptStreaming(prompt)
      
      for await (const chunk of stream) {
        setResponse(prev => prev + chunk)
      }
    } catch (error) {
      console.error('Error with streaming prompt:', error)
      setResponse('Error: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Test prompts for demonstration
  const testPrompts = [
    "Write a haiku about debugging code",
    "Explain what a Chrome extension is in simple terms",
    "Create a short story about AI helping developers",
    "List 5 tips for better web development"
  ]

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Chrome Prompt API Test</h1>
      
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h3>API Status</h3>
        <p>{apiStatus}</p>
        {downloadProgress > 0 && downloadProgress < 100 && (
          <div>
            <p>Download Progress: {downloadProgress}%</p>
            <div style={{ 
              width: '100%', 
              height: '20px', 
              backgroundColor: '#ddd', 
              borderRadius: '10px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${downloadProgress}%`,
                height: '100%',
                backgroundColor: '#4CAF50',
                transition: 'width 0.3s'
              }} />
            </div>
          </div>
        )}
        
        {modelParams && (
          <div style={{ 
            marginTop: '10px', 
            padding: '10px', 
            backgroundColor: '#e8f5e8', 
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            <strong>Model Parameters:</strong>
            <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
              <li>Temperature: {modelParams.defaultTemperature} (max: {modelParams.maxTemperature})</li>
              <li>Top-K: {modelParams.defaultTopK} (max: {modelParams.maxTopK})</li>
            </ul>
          </div>
        )}
        
        <div style={{ marginTop: '10px' }}>
          <button onClick={checkAvailability} style={{ marginRight: '10px' }}>
            Check Availability
          </button>
          <button onClick={initializeSession} disabled={isLoading}>
            {isLoading ? 'Creating Session...' : 'Create Session'}
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Test the Prompt API</h3>
        
        <div style={{ marginBottom: '15px' }}>
          <h4>Quick Test Prompts:</h4>
          {testPrompts.map((testPrompt, index) => (
            <button
              key={index}
              onClick={() => setPrompt(testPrompt)}
              style={{ 
                margin: '5px',
                padding: '8px 12px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: '#f9f9f9',
                cursor: 'pointer'
              }}
            >
              {testPrompt}
            </button>
          ))}
        </div>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt here..."
          rows="4"
          style={{ 
            width: '100%', 
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            resize: 'vertical'
          }}
        />
        
        <div style={{ marginTop: '10px' }}>
          <button 
            onClick={sendPrompt} 
            disabled={isLoading || !session}
            style={{ marginRight: '10px', padding: '10px 20px' }}
          >
            {isLoading ? 'Processing...' : 'Send Prompt'}
          </button>
          <button 
            onClick={sendStreamingPrompt} 
            disabled={isLoading || !session}
            style={{ padding: '10px 20px' }}
          >
            Send Streaming Prompt
          </button>
        </div>
      </div>

      {response && (
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          border: '1px solid #ddd', 
          borderRadius: '8px',
          backgroundColor: '#fff'
        }}>
          <h3>Response:</h3>
          <div style={{ 
            whiteSpace: 'pre-wrap', 
            fontFamily: 'monospace',
            fontSize: '14px',
            lineHeight: '1.4'
          }}>
            {response}
          </div>
        </div>
      )}

      <div style={{ marginTop: '30px', fontSize: '12px', color: '#666' }}>
        <p><strong>Requirements:</strong></p>
        <ul>
          <li>Chrome 138+ (Manifest V3 extension)</li>
          <li>22GB+ free storage space</li>
          <li>4GB+ GPU VRAM</li>
          <li>Supported OS: Windows 10+, macOS 13+, Linux, ChromeOS</li>
          <li>Unmetered internet connection for initial download</li>
        </ul>
        <p>
          Learn more: <a href="https://developer.chrome.com/docs/extensions/ai/prompt-api" target="_blank">
            Chrome Prompt API Documentation
          </a>
        </p>
      </div>
    </div>
  )
}
