import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Cross2Icon } from "@radix-ui/react-icons"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Reusable Draggable Modal Component
 * 
 * A customizable modal that can be dragged by its header, designed to work
 * within Shadow DOM contexts while maintaining all accessibility features.
 * 
 * @param {boolean} isOpen - Whether the modal is open
 * @param {function} onClose - Callback when modal closes
 * @param {string} title - Modal title text
 * @param {React.ReactNode} children - Modal content
 * @param {string} maxWidth - Maximum width (default: 450px)
 * @param {string} className - Additional CSS classes
 * @param {boolean} showCloseButton - Whether to show close button (default: true)
 * @param {object} headerStyle - Custom header styling
 */
export function DraggableModal({ 
  isOpen, 
  onClose, 
  title = "Modal",
  children,
  maxWidth = "450px",
  className = "",
  showCloseButton = true,
  headerStyle = {}
}) {
  // Draggable modal state
  const [position, setPosition] = React.useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = React.useState(false)
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 })

  // Reset position when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setPosition({ x: 0, y: 0 })
      setIsDragging(false)
      setDragOffset({ x: 0, y: 0 })
    }
  }, [isOpen])

  // Draggable handlers
  const handleDragStart = (e) => {
    setIsDragging(true)
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    })
  }

  const handleDragMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      })
    }
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  // Don't render if closed
  if (!isOpen) return null

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={onClose}>
      {/* Custom draggable modal - Shadow DOM compatible */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
      >
        <div
          className={cn(
            "relative z-10 w-full border bg-background shadow-lg",
            "rounded-lg border border-border bg-card text-card-foreground",
            className
          )}
          style={{ 
            transform: `translate(${position.x}px, ${position.y}px)`,
            maxWidth,
            maxHeight: '80vh',
            overflow: 'auto'
          }}
        >
          {/* Draggable Header */}
          <div 
            className="cursor-move rounded-t-lg bg-gray-100 px-4 py-3 border-b select-none"
            onMouseDown={handleDragStart}
            style={headerStyle}
          >
            <div className="flex items-center justify-between">
              <DialogPrimitive.Title className="text-lg font-semibold flex-1">
                {title}
              </DialogPrimitive.Title>
              {showCloseButton && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onClose} 
                  className="h-6 w-6 p-0 cursor-pointer ml-2"
                  type="button"
                >
                  <Cross2Icon className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          
          {/* Modal Content */}
          <div className="p-4">
            {children}
          </div>
        </div>
      </div>
    </DialogPrimitive.Root>
  )
}
