# Project Structure

Clean, minimal file structure with max 100 lines per file.

## Folder Organization

```
src/
├── components/
│   ├── editor/              # JSON editor components
│   │   ├── JsonEditor.jsx   (30 lines)
│   │   ├── EditorHeader.jsx (10 lines)
│   │   └── EditorError.jsx  (10 lines)
│   │
│   ├── travel/              # Travel itinerary components
│   │   ├── TravelPreview.jsx    (45 lines)
│   │   ├── TravelCard.jsx       (50 lines)
│   │   ├── TravelRow.jsx        (20 lines)
│   │   ├── ConnectionLines.jsx  (25 lines)
│   │   └── EmptyState.jsx       (10 lines)
│   │
│   ├── layout/              # Layout components
│   │   ├── Header.jsx           (12 lines)
│   │   ├── DesktopLayout.jsx    (20 lines)
│   │   └── MobileLayout.jsx     (25 lines)
│   │
│   └── ui/                  # shadcn/ui components
│       ├── card.jsx
│       ├── tabs.jsx
│       └── alert.jsx
│
├── hooks/
│   └── useJsonEditor.js     (25 lines) - JSON parsing & state
│
├── utils/
│   ├── travelData.js        (30 lines) - TravelDataManager class
│   └── connections.js       (45 lines) - Connection line calculations
│
├── data/
│   └── defaultData.js       (60 lines) - Default itinerary
│
├── lib/
│   └── utils.js             - Tailwind cn() helper
│
├── App.jsx                  (29 lines)
├── main.jsx
└── index.css
```

## Design Principles

### 1. **Small Files** (Max 100 lines)
- Each file has single responsibility
- Easy to read and maintain
- Quick to understand

### 2. **Logical Grouping**
- `components/` - UI components by feature
- `hooks/` - Custom React hooks
- `utils/` - Pure utility functions & classes
- `data/` - Constants and default data

### 3. **Class-Based Logic**
```javascript
// TravelDataManager class encapsulates related logic
class TravelDataManager {
  isValid()
  groupByRow()
  getRows()
}
```

### 4. **Minimal Functions**
```javascript
// Each function does one thing
export function parseJSON(jsonString) { }
export function isTraveling(stop) { }
export function calculateConnections(containerRef, rowsCount) { }
```

### 5. **Component Composition**
```
App
├── Header
├── DesktopLayout
│   ├── JsonEditor
│   │   ├── EditorHeader
│   │   └── EditorError
│   └── TravelPreview
│       ├── ConnectionLines
│       └── TravelRow[]
│           └── TravelCard[]
└── MobileLayout (same structure in tabs)
```

## Key Features

- ✅ No file > 100 lines
- ✅ Clear folder structure
- ✅ Minimal functions
- ✅ JS class for related logic (TravelDataManager)
- ✅ Utils for calculations
- ✅ Child components for every piece
- ✅ Easy to navigate
- ✅ Easy to test (if needed)
- ✅ Easy to extend

## Building

```bash
npm run dev   # Development
npm run build # Production (outputs to ../travel-fixture/)
```

