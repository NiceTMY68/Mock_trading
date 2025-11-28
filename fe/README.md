# Crypto Community Platform - Frontend

Modern React frontend for crypto market dashboard with real-time price updates.

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Charts**: Chart.js + react-chartjs-2
- **WebSocket**: Native WebSocket API
- **Routing**: React Router DOM

## Features

- 📊 **Market Dashboard**: Real-time market overview with top coins, trending, losers
- 📈 **Price Charts**: Interactive candlestick charts with multiple timeframes
- ⭐ **Watchlist**: Personal watchlist with real-time price updates
- 🔄 **Real-time Updates**: WebSocket integration for live price streaming
- 🎨 **Modern UI**: Dark theme with glassmorphism effects
- 📱 **Responsive**: Mobile-friendly design

## Getting Started

### Prerequisites

- Node.js 18+
- Backend server running on `http://localhost:3000`

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
fe/
├── src/
│   ├── api/              # API clients (REST + WebSocket)
│   ├── components/       # React components
│   │   ├── dashboard/   # Dashboard components
│   │   └── layout/      # Layout components
│   ├── hooks/           # Custom React hooks
│   ├── pages/           # Page components
│   ├── store/           # Zustand stores
│   ├── types/           # TypeScript types
│   └── utils/           # Utility functions
├── public/              # Static assets
└── package.json
```

## Key Components

### Dashboard
- **DashboardPage**: Main dashboard with all market data
- **MarketTable**: Paginated table of all trading pairs
- **MarketHighlights**: Top coins, trending, losers tabs
- **PriceChartPanel**: Interactive price chart
- **WatchlistPanel**: Personal watchlist management
- **OverviewCards**: Market statistics cards

### Hooks
- **useWebSocket**: WebSocket connection management
- **useRealtimePrices**: Real-time price updates subscription

### API
- **market.ts**: REST API client for market data
- **websocket.ts**: WebSocket client class
- **client.ts**: Axios instance with interceptors

## Environment Variables

Create `.env` file:

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_WS_URL=ws://localhost:3000/ws/prices
```

## Features in Detail

### Real-time Price Updates

Frontend subscribes to WebSocket for real-time price updates:

```typescript
const { prices, isConnected } = useRealtimePrices(['BTCUSDT', 'ETHUSDT']);
```

### Watchlist

Persistent watchlist stored in localStorage:

```typescript
const { symbols, addSymbol, removeSymbol } = useWatchlistStore();
```

### Data Fetching

All API calls use React Query for caching and refetching:

```typescript
const { data, isLoading } = useQuery({
  queryKey: ['market-list', page, sortBy],
  queryFn: () => fetchMarketList({ page, size: 20, sortBy }),
  refetchInterval: 60000
});
```

## Styling

Theme colors (defined in `tailwind.config.cjs`):
- **Primary**: `#00BFA6` (Teal)
- **Accent**: `#7C3AED` (Purple)
- **Success**: `#22C55E` (Green)
- **Danger**: `#EF4444` (Red)
- **Dark**: `#0F172A` (Slate)

## Performance

- **Code Splitting**: Automatic with Vite
- **Lazy Loading**: Components loaded on demand
- **Caching**: React Query caches API responses
- **WebSocket**: Efficient real-time updates without polling

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Development Tips

1. **Hot Reload**: Changes reflect immediately in dev mode
2. **TypeScript**: Full type safety for API responses
3. **ESLint**: Code quality checks
4. **React Query DevTools**: Available in development mode

## Troubleshooting

### WebSocket Not Connecting
- Check backend is running on port 3000
- Verify CORS settings in backend
- Check browser console for errors

### API Errors
- Verify `VITE_API_BASE_URL` in `.env`
- Check backend logs
- Verify network connectivity

### Build Errors
- Clear `node_modules` and reinstall
- Check Node.js version (18+)
- Verify all dependencies are installed
