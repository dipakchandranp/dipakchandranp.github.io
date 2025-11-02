import { TravelCard } from './TravelCard'

export function TravelRow({ stops, rowIndex }) {
  return (
    <div data-row={rowIndex} className="flex items-center overflow-x-auto pb-4">
      {stops.map((stop, cardIndex) => (
        <>
          <div key={stop.id} data-card-id={stop.id}>
            <TravelCard stop={stop} />
          </div>
          
          {/* Horizontal Connection Line */}
          {cardIndex < stops.length - 1 && (
            <div className="flex items-center justify-center relative" style={{ width: '80px' }}>
              <div className="h-0.5 bg-gray-400 w-full"></div>
            </div>
          )}
        </>
      ))}
    </div>
  )
}

