import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from 'lucide-react'

export function EditorError({ message }) {
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}

