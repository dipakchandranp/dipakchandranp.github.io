import { useState } from 'react'
import { parseJSON } from '@/utils/travelData.js'

export function useJsonEditor(initialData) {
  const initialJson = JSON.stringify(initialData, null, 2)
  const [jsonValue, setJsonValue] = useState(initialJson)
  const [parsedData, setParsedData] = useState(initialData)
  const [error, setError] = useState(null)

  const handleChange = (value) => {
    setJsonValue(value)
    const { data, error: parseError } = parseJSON(value)
    
    if (parseError) {
      setError(parseError)
      setParsedData(null)
    } else {
      setError(null)
      setParsedData(data)
    }
  }

  const handleReset = () => {
    setJsonValue(initialJson)
    setParsedData(initialData)
    setError(null)
  }

  return { jsonValue, parsedData, error, handleChange, handleReset }
}

