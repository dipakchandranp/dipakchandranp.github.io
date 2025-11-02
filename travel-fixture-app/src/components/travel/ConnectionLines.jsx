export function ConnectionLines({ connections }) {
  return (
    <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
      {connections.map((conn, idx) => {
        const midY = (conn.startY + conn.endY) / 2
        const radius = 16 // Curve radius (adjusted for smaller cards)
        
        // Create a smooth path with curved corners
        const path = `
          M ${conn.startX} ${conn.startY}
          L ${conn.startX} ${midY - radius}
          Q ${conn.startX} ${midY} ${conn.startX + (conn.endX > conn.startX ? radius : -radius)} ${midY}
          L ${conn.endX - (conn.endX > conn.startX ? radius : -radius)} ${midY}
          Q ${conn.endX} ${midY} ${conn.endX} ${midY + radius}
          L ${conn.endX} ${conn.endY}
        `
        
        return (
          <path
            key={idx}
            d={path}
            stroke="#9CA3AF"
            strokeWidth="2"
            fill="none"
          />
        )
      })}
    </svg>
  )
}

