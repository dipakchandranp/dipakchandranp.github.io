import { useEffect, useRef, useState } from "react"
import { TravelDataManager } from "@/utils/travelData.js"
import { calculateConnections } from "@/utils/connections.js"
import { ConnectionLines } from "./ConnectionLines"
import { TravelRow } from "./TravelRow"
import { EmptyState } from "./EmptyState"

export function TravelPreview({ data }) {
  const containerRef = useRef(null)
  const [connections, setConnections] = useState([])
  
  const manager = new TravelDataManager(data)

  useEffect(() => {
    if (!manager.isValid()) return
    
    const timer = setTimeout(() => {
      const rows = manager.getRows()
      const conns = calculateConnections(containerRef, rows.length)
      setConnections(conns)
    }, 100)

    return () => clearTimeout(timer)
  }, [data])

  if (!manager.isValid()) {
    return <EmptyState message="No valid data" submessage="Enter valid JSON to see preview" />
  }

  const rows = manager.getRows()
  if (rows.length === 0) {
    return <EmptyState message="No stops added" submessage="Add travel stops to your itinerary" />
  }

  return (
    <div className="relative" ref={containerRef}>
      <ConnectionLines connections={connections} />
      <div className="space-y-16">
        {rows.map((rowStops, rowIndex) => (
          <TravelRow key={rowIndex} stops={rowStops} rowIndex={rowIndex} />
        ))}
      </div>
    </div>
  )
}

