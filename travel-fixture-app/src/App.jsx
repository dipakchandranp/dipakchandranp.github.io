import { Header } from './components/layout/Header'
import { DesktopLayout } from './components/layout/DesktopLayout'
import { MobileLayout } from './components/layout/MobileLayout'
import { useJsonEditor } from './hooks/useJsonEditor'
import { DEFAULT_ITINERARY } from './data/defaultData'

function App() {
  const { jsonValue, parsedData, error, handleChange, handleReset } = useJsonEditor(DEFAULT_ITINERARY)

  return (
    <div className="h-screen flex flex-col">
      <Header />
      <DesktopLayout 
        jsonValue={jsonValue}
        onChange={handleChange}
        onReset={handleReset}
        error={error}
        parsedData={parsedData}
      />
      <MobileLayout 
        jsonValue={jsonValue}
        onChange={handleChange}
        onReset={handleReset}
        error={error}
        parsedData={parsedData}
      />
    </div>
  )
}

export default App
