import { useRef } from "react"
import { JsonEditor } from "../editor/JsonEditor"
import { TravelPreview } from "../travel/TravelPreview"
import { PreviewHeader } from "../travel/PreviewHeader"
import { exportAsImage } from "@/utils/export.js"

export function DesktopLayout({ jsonValue, onChange, onReset, error, parsedData }) {
  const previewRef = useRef(null)

  const handleExport = () => {
    if (previewRef.current) {
      exportAsImage(previewRef.current)
    }
  }

  return (
    <div className="hidden lg:flex flex-1 overflow-hidden">
      <div className="w-2/5 border-r overflow-auto">
        <div className="p-6 h-full">
          <JsonEditor value={jsonValue} onChange={onChange} onReset={onReset} error={error} />
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-white">
        <div className="p-8">
          <PreviewHeader onExport={handleExport} />
          <div ref={previewRef}>
            <TravelPreview data={parsedData} />
          </div>
        </div>
      </div>
    </div>
  )
}

