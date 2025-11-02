export class TravelDataManager {
  constructor(data) {
    this.data = data || []
  }

  isValid() {
    return Array.isArray(this.data) && this.data.length > 0
  }

  groupByRow() {
    const grouped = {}
    this.data.forEach(stop => {
      const row = stop.row || 1
      if (!grouped[row]) grouped[row] = []
      grouped[row].push(stop)
    })
    return Object.keys(grouped)
      .sort((a, b) => a - b)
      .map(key => grouped[key])
  }

  getRows() {
    return this.groupByRow()
  }
}

export function parseJSON(jsonString) {
  try {
    const parsed = JSON.parse(jsonString)
    return { data: parsed, error: null }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

export function isTraveling(stop) {
  return stop.startingCity !== stop.endingCity
}

