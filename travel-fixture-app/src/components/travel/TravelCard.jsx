import { Card } from "@/components/ui/card"
import { isTraveling } from "@/utils/travelData.js"

export function TravelCard({ stop }) {
  return (
    <div className="flex-shrink-0 relative flex flex-col items-center">
      {/* Distance - Right Side (Behind card, above lines) */}
      {stop.distance && (
        <div 
          className="absolute text-xs text-gray-600 bg-white px-2 py-1 whitespace-nowrap"
          style={{ 
            right: '-70px',
            top: '50%',
            transform: 'translateY(-50%) rotate(-90deg)',
            transformOrigin: 'center center',
            width: '120px',
            zIndex: 1
          }}
        >
          {stop.distance}
        </div>
      )}
      
      {/* Starting City - Above Card */}
      <div className="w-40 text-center text-sm font-bold uppercase tracking-wide bg-white px-3 py-1 rounded mb-1 relative z-10">
        {stop.startingCity}
      </div>
      
      {/* Main Card - Square */}
      <Card 
        data-card-box={stop.id}
        className="w-40 h-40 flex flex-col items-center justify-center rounded-3xl border-2 p-2 relative z-10"
        style={{ backgroundColor: stop.color || '#F5F5F5' }}
      >
        {stop.startingDescription && (
          <div className="text-xs text-gray-400 truncate w-full text-center mb-1">
            {stop.startingDescription}
          </div>
        )}
        <div className="text-7xl font-bold leading-none mb-2">
          {stop.date}
        </div>
        <div className="text-lg capitalize">
          {stop.month}
        </div>
        {stop.endingDescription && (
          <div className="text-xs text-gray-400 truncate w-full text-center mt-1">
            {stop.endingDescription}
          </div>
        )}
      </Card>
      
      {/* Ending City - Below Card */}
      <div className="w-40 text-center text-sm font-bold uppercase tracking-wide bg-white px-3 py-1 rounded mt-1 relative z-10">
        {stop.endingCity}
      </div>
    </div>
  )
}

