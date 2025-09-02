import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function DisablePopup({ 
  isOpen, 
  onClose, 
  onConfirm,
  position = { x: 0, y: 0 }
}) {
  const [hostname, setHostname] = React.useState('')

  React.useEffect(() => {
    const currentHostname = window.location.hostname
    // Truncate very long hostnames for better display
    const displayHostname = currentHostname.length > 35 ? 
      currentHostname.substring(0, 32) + '...' : 
      currentHostname
    setHostname(displayHostname)
  }, [])

  const handleConfirm = () => {
    onConfirm?.(window.location.hostname)
    onClose()
  }

  // Custom Dialog without Portal - renders directly in Shadow DOM
  if (!isOpen) return null

  console.log('[Perfect Prompt] DisablePopup rendering at position:', position)

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={onClose}>
      {/* No overlay - clean popup without background darkening */}
      
      {/* Custom content that renders in place without Portal */}
      <div
        className={cn(
          "fixed z-50 grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg",
          "rounded-lg border border-border bg-card text-card-foreground"
        )}
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          maxWidth: '350px',
        }}
      >
        {/* Header */}
        <div className="flex flex-col space-y-1.5 text-left p-0">
          <DialogPrimitive.Title className="text-sm font-medium leading-none tracking-tight">
            Turn off Perfect Prompt for {hostname}?
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-xs text-muted-foreground">
            You can re-enable from the extension popup
          </DialogPrimitive.Description>
        </div>
        
        {/* Footer with buttons */}
        <div className="flex flex-row justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="text-xs h-8 px-3"
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            className="text-xs h-8 px-3"
          >
            Turn Off
          </Button>
        </div>
      </div>
    </DialogPrimitive.Root>
  )
}
