# CoinLab - Cryptocurrency Research Platform

A comprehensive crypto research and community platform with separated user and admin interfaces.

## 🏗️ Architecture

```
Mock_trading/
├── fe/               # User Application (Port 5173)
│   └── Public users and authenticated user features
│
├── fe-admin/         # Admin Dashboard (Port 5174)  
│   └── Administrative panel for platform management
│
└── be-nodejs/        # Backend API (Port 3000)
    └── REST API + WebSocket services
```

## 🚀 Quick Start

### Prerequisites
- Node.js v18+ 
- PostgreSQL
- Redis (via Docker)

### 1. Start Backend
```bash
cd be-nodejs
npm install
npm start
# Runs on http://localhost:3000
```

### 2. Start User App  
```bash
cd fe
npm install
npm run dev
# Runs on http://localhost:5173
```

### 3. Start Admin Dashboard
```bash
cd fe-admin
npm install
npm run dev
# Runs on http://localhost:5174
```

## 📦 Applications

### User Application (`fe/`)
**Port:** 5173  
**Audience:** Public users and authenticated users

**Features:**
- Landing page for anonymous visitors
- Real-time cryptocurrency market data
- Portfolio management
- Price alerts
- Community discussions
- News aggregation
- User profiles

**Key Technologies:**
- React 19 + TypeScript
- Zustand (state management)
- TanStack Query (data fetching)
- TailwindCSS + Glassmorphism design
- Chart.js (data visualization)
- WebSocket (real-time prices)

### Admin Dashboard (`fe-admin/`)
**Port:** 5174  
**Audience:** Platform administrators only

**Features:**
- User management (roles, status, deletion)
- Content moderation (posts, comments)
- Security monitoring (failed logins)
- Global alerts management
- Announcements system
- System analytics

**Security:**
- Separate build/deployment
- Admin-only authentication check
- Independent session management

**Key Technologies:**
- React 19 + TypeScript
- Zustand (state management)
- TanStack Query
- TailwindCSS (admin-themed)
- Dedicated admin layout

### Backend API (`be-nodejs/`)
**Port:** 3000  
**Services:** REST API + WebSocket

**Core Features:**
- JWT authentication with refresh tokens
- Role-based access control (guest/user/admin)
- PostgreSQL database
- Redis caching
- Real-time price streaming via WebSocket
- Binance API integration
- Rate limiting

**API Endpoints:**
- `/api/auth` - Authentication
- `/api/market` - Market data
- `/api/portfolio` - Portfolio management
- `/api/community` - Posts & comments
- `/api/admin` - Admin operations
- `/ws/prices` - WebSocket price stream

## 🔧 Development

### Environment Variables

**Backend (`.env`):**
```env
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/coinlab
JWT_SECRET=your-secret-key
REDIS_URL=redis://localhost:6379
BINANCE_API_KEY=optional
```

**Frontend (`fe/.env.local`):**
```env
VITE_API_BASE_URL=http://localhost:3000/api
```

**Admin (`fe-admin/.env.local`):**
```env
VITE_API_BASE_URL=http://localhost:3000/api
```

### Build for Production

```bash
# User App
cd fe
npm run build
# Output: fe/dist

# Admin Dashboard  
cd fe-admin
npm run build
# Output: fe-admin/dist

# Backend
cd be-nodejs
# Node.js app, no build needed
```

## 🎨 Design System

**Theme:** CoinLab - Scientific Research meets Cryptocurrency

**Colors:**
- Primary: Cyan/Teal (data, technology)
- Secondary: Purple (admin, special features)
- Accent: Emerald (success, growth)
- Background: Dark slate with gradients

**UI Patterns:**
- Glassmorphism cards
- Neon glow effects
- Smooth transitions
- Scientific/lab aesthetic

## 📝 Development Workflow

1. **Feature Development:**
   - User features → `fe/src/`
   - Admin features → `fe-admin/src/`
   - API endpoints → `be-nodejs/src/`

2. **Shared Code:**
   - API client logic can be shared
   - Utility functions can be copied
   - Keep admin and user UIs separate

3. **Testing:**
   - Test user app on port 5173
   - Test admin on port 5174
   - Ensure proper role-based access

## 🔐 Security Notes

- Admin dashboard requires `role: 'admin'`
- Admin app should be deployed on separate subdomain
- Use environment-based API URLs
- Implement proper CORS policies
- Never expose admin routes in user app

## 📚 Tech Stack

**Frontend:**
- React 19
- TypeScript
- TailwindCSS
- Zustand
- TanStack Query
- Axios
- Chart.js
- Heroicons

**Backend:**
- Node.js + Express
- PostgreSQL
- Redis
- JWT
- WebSocket (ws)
- Binance API

## 🤝 Contributing

1. Choose the appropriate app (user/admin)
2. Follow the established patterns
3. Keep apps independent
4. Test across all three services

## 📄 License

Private/Proprietary

