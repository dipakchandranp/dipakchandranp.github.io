import { Download } from 'lucide-react'

export function PreviewHeader({ onExport }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-semibold">Live Preview</h2>
      <button
        onClick={onExport}
        className="flex items-center gap-2 px-4 py-2 text-sm border rounded-lg hover:bg-gray-100 transition-colors"
        title="Export as image"
      >
        <Download className="w-4 h-4" />
        Export
      </button>
    </div>
  )
}

