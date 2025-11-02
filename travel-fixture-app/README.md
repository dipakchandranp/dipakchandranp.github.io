# TravelFixture Generator

A visual travel itinerary builder that uses JSON input to create beautiful, customizable travel cards.

## Features

- 📝 JSON-based itinerary editing with syntax highlighting
- 🎨 Customizable card colors
- 📱 Responsive layout (desktop and mobile)
- 🔄 Live preview
- 🗺️ Grid layout with connection lines
- ↔️ Horizontal scrolling support for long rows

## Technology Stack

- **Vite** - Fast build tool
- **React** - UI framework
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **CodeMirror** - JSON editor with syntax highlighting

## Development

### Install dependencies
```bash
npm install
```

### Run development server
```bash
npm run dev
```

Visit `http://localhost:5173` to see the app.

### Build for production
```bash
npm run build
```

This builds the app to `../travel-fixture/` directory, ready for GitHub Pages deployment at `https://dipakchandranp.github.io/travel-fixture/`

## JSON Structure

```json
[
  {
    "id": "1",
    "row": 1,
    "date": 7,
    "month": "July",
    "startingCity": "FRANKFURT",
    "startingDescription": "Frankfurt Airport - Terminal 1",
    "endingCity": "DARMSTADT",
    "endingDescription": "Hotel Maritim Darmstadt",
    "distance": "32 min (23 km)",
    "color": "#E5E7EB"
  }
]
```

### Field Descriptions

- **id** (required): Unique identifier for the stop
- **row** (required): Row number for grid layout (1, 2, 3, etc.)
- **date** (required): Day number (1-31)
- **month** (required): Month name
- **startingCity** (required): City where you start the day
- **startingDescription** (optional): Details about starting location
- **endingCity** (required): City where you end the day
- **endingDescription** (optional): Details about ending location
- **distance** (optional): Travel distance/time (shown only if traveling)
- **color** (optional): Background color for the card (hex code)

## Layout

Cards are arranged in rows based on the `row` property. Connection lines automatically flow from the last card in a row to the first card in the next row.

Example layout:
```
[Card 1] ─── [Card 2] ─── [Card 3]
                              |
                              └──────┐
                                     ↓
                        [Card 4] ─── [Card 5]
```

## Deployment

The app is configured to deploy to GitHub Pages at `/travel-fixture/` path.

After building, commit the changes:
```bash
cd ..
git add travel-fixture/
git commit -m "Update TravelFixture app"
git push origin main
```

Your app will be live at: `https://dipakchandranp.github.io/travel-fixture/`

## Project Structure

```
travel-fixture-app/
├── src/
│   ├── components/
│   │   ├── ui/               # shadcn/ui components
│   │   ├── TravelCard.jsx    # Individual card component
│   │   ├── TravelPreview.jsx # Grid layout with connections
│   │   └── JsonEditor.jsx    # CodeMirror JSON editor
│   ├── lib/
│   │   └── utils.js          # Utility functions
│   ├── App.jsx               # Main app component
│   ├── main.jsx              # App entry point
│   └── index.css             # Global styles
├── vite.config.js            # Vite configuration
├── tailwind.config.js        # Tailwind configuration
└── package.json              # Dependencies
```

## Future Enhancements

- 🖼️ Export as image
- 🔗 Share via URL
- 💾 Save/load templates
- 🎨 Color picker UI
- 📋 Copy/paste cards
- ↕️ Drag & drop reordering
