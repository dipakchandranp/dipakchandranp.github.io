import { useRef } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { JsonEditor } from "../editor/JsonEditor"
import { TravelPreview } from "../travel/TravelPreview"
import { PreviewHeader } from "../travel/PreviewHeader"
import { exportAsImage } from "@/utils/export.js"

export function MobileLayout({ jsonValue, onChange, onReset, error, parsedData }) {
  const previewRef = useRef(null)

  const handleExport = () => {
    if (previewRef.current) {
      exportAsImage(previewRef.current)
    }
  }

  return (
    <div className="lg:hidden flex-1 overflow-hidden">
      <Tabs defaultValue="preview" className="h-full flex flex-col">
        <TabsList className="w-full rounded-none border-b">
          <TabsTrigger value="edit" className="flex-1">Edit JSON</TabsTrigger>
          <TabsTrigger value="preview" className="flex-1">Preview</TabsTrigger>
        </TabsList>
        
        <TabsContent value="edit" className="flex-1 overflow-auto p-4 m-0">
          <JsonEditor value={jsonValue} onChange={onChange} onReset={onReset} error={error} />
        </TabsContent>
        
        <TabsContent value="preview" className="flex-1 overflow-auto p-4 m-0 bg-white">
          <PreviewHeader onExport={handleExport} />
          <div ref={previewRef}>
            <TravelPreview data={parsedData} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

