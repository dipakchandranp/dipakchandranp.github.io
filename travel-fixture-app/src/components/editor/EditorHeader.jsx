import { RotateCcw } from 'lucide-react'

export function EditorHeader({ onReset }) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold">JSON Input</h2>
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-100 transition-colors"
          title="Reset to default"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
      </div>
      <p className="text-sm text-muted-foreground">
        Edit your travel itinerary using JSON format
      </p>
    </div>
  )
}

