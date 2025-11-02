export function calculateConnections(containerRef, rowsCount) {
  if (!containerRef.current) return []

  const connections = []
  const rowElements = containerRef.current.querySelectorAll('[data-row]')

  rowElements.forEach((rowElement, rowIndex) => {
    if (rowIndex < rowsCount - 1) {
      const connection = calculateRowConnection(rowElement, rowIndex, containerRef.current)
      if (connection) connections.push(connection)
    }
  })

  return connections
}

function calculateRowConnection(rowElement, rowIndex, container) {
  const cardBoxes = rowElement.querySelectorAll('[data-card-box]')
  const lastCardBox = cardBoxes[cardBoxes.length - 1]
  
  if (!lastCardBox) return null

  const nextRow = container.querySelector(`[data-row="${rowIndex + 1}"]`)
  if (!nextRow) return null

  const firstNextCardBox = nextRow.querySelector('[data-card-box]')
  if (!firstNextCardBox) return null

  const lastRect = lastCardBox.getBoundingClientRect()
  const firstRect = firstNextCardBox.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()

  return {
    startX: lastRect.left + lastRect.width / 2 - containerRect.left,
    startY: lastRect.bottom - containerRect.top,
    endX: firstRect.left + firstRect.width / 2 - containerRect.left,
    endY: firstRect.top - containerRect.top,
    rowIndex
  }
}

