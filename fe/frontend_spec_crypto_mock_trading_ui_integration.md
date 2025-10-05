# Frontend Specification — Crypto Mock Trading + AI Coach

**Mục tiêu:** Tài liệu hướng dẫn chi tiết cho dev frontend (intern → junior) để có thể bắt tay vào xây dựng giao diện, tích hợp API backend, cấu hình môi trường, test và deploy — không cần đọc thêm tài liệu dự án.

> Ngôn ngữ: Tiếng Việt. Tech stack gợi ý: React + TypeScript + Tailwind CSS.

---

## 1. Tóm tắt ngắn
- Ứng dụng: Website mô phỏng giao dịch crypto dành cho người mới, kèm tính năng AI Coaching, Glossary (OpenAI), News, Backtest, Alerts, Subscription (Stripe).
- Mục tiêu frontend: xây dựng SPA responsive, accessible, performative, với UX hướng người mới.

---

## 2. Công nghệ & thư viện chính (gợi ý)
- **React** (v18+) + **TypeScript** (bắt buộc) — strong typing giúp dev an tâm.
- **Vite** hoặc Create React App (Vite ưu tiên cho tốc độ dev).
- **Tailwind CSS** — hệ design token nhanh, consistent.
- **React Router v6** — routing.
- **React Query (TanStack Query)** — data fetching, cache, stale-while-revalidate.
- **Axios** — for custom http client (use with interceptors for auth refresh).
- **Charting**: `react-chartjs-2` + `chart.js` hoặc `recharts`. Nếu cần trading-grade charts, dùng TradingView widget (external embed).
- **State management**: local component state + React Query for server state; global UI state via Context or Zustand (lightweight).
- **Form**: React Hook Form + Zod (validation + types).
- **Authentication UI**: JWT-flow; store refresh token in HttpOnly cookie (backend) and access token in memory.
- **WebSocket**: native WebSocket or `socket.io-client` (match backend). Fallback: React Query polling.
- **Stripe.js** + `@stripe/stripe-js` for client-side subscription flow.
- **Testing**: Jest + React Testing Library; E2E: Cypress.
- **Lint & Format**: ESLint (with TypeScript), Prettier.
- **Error monitoring**: Sentry (optional).
- **Analytics**: Plausible / Google Analytics (optional).

---

## 3. Project structure (recommended)
```
src/
├─ api/                # wrapper axios instances, endpoints, types
├─ components/         # reusable UI components (Button, Modal, Table...)
├─ features/           # feature folders (dashboard, trade, glossary...)
│  ├─ dashboard/
│  ├─ trade/
│  └─ aiCoach/
├─ hooks/              # custom hooks (useAuth, useWebSocket, useToast)
├─ layouts/            # AppLayout, AuthLayout
├─ pages/              # route pages: DashboardPage.tsx, LoginPage.tsx...
├─ routes/             # react-router config
├─ store/              # contexts or zustand stores
├─ styles/             # tailwind config, design tokens
├─ utils/              # helpers, formatters
├─ assets/
├─ services/           # client helpers for charts, stripe utils
└─ index.tsx
```

---

## 4. Các pages (route) & mô tả chức năng UI
> Đây là bản rút gọn — developer hãy tham khảo prompt visual design đã có để triển khai CSS và layout chi tiết.

- `/` LandingPage (public)
- `/auth/login`, `/auth/register`, `/auth/forgot` (public)
- `/dashboard` (protected)
- `/trade` (modal hoặc page) (protected)
- `/coins/:symbol` CoinDetail (protected)
- `/portfolio` (protected)
- `/watchlist` (protected)
- `/ai-coach` (protected)
- `/glossary` (public)
- `/news` (public)
- `/backtest` (protected)
- `/alerts` (protected)
- `/settings` (protected)
- `/pricing` (public)
- `/account/billing` (protected) — subscription management (Stripe customer portal redirect)

Mỗi page cần: loading state, empty state, error state, mobile responsive behaviour.

---

## 5. Components chính (với props cơ bản & responsibilities)
> Tập trung component-based để tái sử dụng và test dễ dàng.

1. **AppHeader** (props: onSearch, user) — Logo, Search box, Balance chip, Profile menu.
2. **SidebarNav** (props: active) — links và collapsed state.
3. **Card** (children, size) — reusable card wrapper.
4. **ChartWrapper** (props: symbol, timeframe, indicators) — encapsulate chart lib, accepts data or subscribes to WS.
5. **OrderForm** (props: defaultPair) — Market/Limit UI, validation, emits `onPlaceOrder(payload)`.
6. **PortfolioTable** (props: holdings[]) — sortable columns, export CSV action.
7. **AIReportCard** (props: report) — show bullets: correctPoints[], issues[], suggestions[]
8. **GlossaryTooltip** (props: term) — fetch / cache definition, shows on hover.
9. **NewsList** (props: sourceFilter) — paginated list.
10. **BacktestRunner** (props: defaultStrategy) — form + results display.
11. **PricingCard** (props: tier) — used on /pricing.
12. **ProtectedRoute** — route guard for auth.
13. **Modal** — generic modal component.

---

## 6. API Contract (frontend view)
> Frontend calls backend API described below. Use React Query to manage these calls. All protected endpoints require Authorization header `Bearer <accessToken>`.

Base URL: `https://api.yoursite.com` (use env)

### Auth
- `POST /api/auth/register`  
  Request: `{ name, email, password }`  
  Response: `{ user: User, accessToken, refreshToken }` (refresh token set as HttpOnly cookie by backend)

- `POST /api/auth/login`  
  Request: `{ email, password }`  
  Response: `{ user, accessToken }`

- `POST /api/auth/logout`  
  Request: none (use refresh cookie)  
  Response: 204

- `POST /api/auth/refresh`  
  Request: none (refresh from HttpOnly cookie)  
  Response: `{ accessToken }`

### Coins & Market Data
- `GET /api/coins`  
  Query: `?limit=50&page=1`  
  Response: `{ coins: CoinSummary[] }`

- `GET /api/coins/:symbol/price?tf=1D`  
  Response: `{ symbol, price, chart: [{ts, price, volume}], indicators: {...} }`

- `GET /api/market/top-movers`  
  Response: `{ topGainers: [], topLosers: [] }`

### Orders & Trades
- `POST /api/orders`  
  Body: `{ portfolioId, symbol, side, orderType, price?, quantity }`  
  Response: `{ order }`

- `GET /api/orders?status=active`  
  Response: `{ orders[] }`

- `GET /api/trades?portfolioId=...`  
  Response: `{ trades[] }`

### Portfolio & Holdings
- `GET /api/portfolios/:id`  
  Response: `{ portfolio: { holdings[], virtual_balance, equity_history[] } }`

- `GET /api/watchlist` / `POST /api/watchlist` / `DELETE /api/watchlist/:symbol`

### Glossary
- `POST /api/glossary/define`  
  Body: `{ term }`  
  Response: `{ term, definition, example, cached }`  
  (Frontend should cache results locally for fast UX.)

### AI Coach
- `POST /api/ai/analyze`  
  Body: `{ portfolioId, options? }`  
  Response: `{ reportId, status }` or synchronous `{ report }` if quick

- `GET /api/ai/reports/:id`  
  Response: `{ report: { score, correctPoints[], issues[], suggestions[], meta } }`

### News & Events
- `GET /api/news?coin=BTC&page=1`  
  Response: `{ news: NewsItem[] }`

### Alerts
- `POST /api/alerts`  
  Body: `{ symbol, condition, targetPrice, channel }`  
  Response: `{ alert }`

### Backtesting
- `POST /api/backtests`  
  Body: `{ symbol, startDate, endDate, strategy, params }`  
  Response: `{ backtestId, summary }`

- `GET /api/backtests/:id`  
  Response: `{ trades[], metrics, equitySeries }`

### Billing / Subscription (frontend interactions)
- `GET /api/subscription/plans`  
  Response: `{ plans[] }`

- `POST /api/subscription/create-checkout-session`  
  Body: `{ planId }`  
  Response: `{ checkoutUrl }` (frontend redirects user)

- `POST /api/subscription/portal`  
  Response: `{ portalUrl }` (redirect user to Stripe Customer Portal)

> **Note:** Stripe publishable key used only on client side; secret keys ONLY on backend.

---

## 7. Types (TypeScript) — basic interfaces
```ts
interface User { id: string; email: string; fullName?: string }
interface CoinSummary { symbol: string; name: string; price: number; change24h: number }
interface Holding { coinSymbol: string; quantity: number; avgCost: number; unrealizedPL: number }
interface Order { id: string; symbol: string; side: 'buy'|'sell'; orderType: 'market'|'limit'; status: string }
interface AIReport { id: string; score: number; correctPoints: string[]; issues: string[]; suggestions: string[] }
```

---

## 8. Auth flow (frontend responsibilities)
1. **Login:** POST `/api/auth/login` → store `accessToken` in memory (React Query auth header) and rely on backend cookie for refresh token.
2. **Refresh:** On 401, call `POST /api/auth/refresh` to obtain new accessToken. Use Axios interceptor to queue requests while refreshing.
3. **Logout:** call logout endpoint, clear memory tokens and redirect to login.
4. **Protect routes:** `ProtectedRoute` checks `isAuthenticated` state; if unknown, show spinner while validating.

**Security notes:** never store accessToken in localStorage; store refresh token only as HttpOnly cookie handled by backend.

---

## 9. WebSocket & Real-time
- **Purpose:** live price streaming, order fills notification, AI progress updates.
- **Client:** `useWebSocket` hook that connects to `wss://api.yoursite.com/stream?token=<accessToken>` or uses session cookie.
- **Message types:** `price_update`, `order_update`, `ai_report_update`, `news_update`.
- **Fallback:** When WS unavailable, React Query polling every 5–15s for key endpoints.
- **Reconnection strategy:** exponential backoff with jitter, limit attempts, notify user when offline.

---

## 10. Stripe (Frontend)
- Use `@stripe/stripe-js` to load Stripe with `STRIPE_PUBLISHABLE_KEY` from env.
- Flow: user clicks Subscribe → frontend POST `/api/subscription/create-checkout-session` → backend returns `sessionId` or `checkoutUrl` → frontend redirects to Stripe Checkout or uses `stripe.redirectToCheckout({ sessionId })`.
- For portal: `POST /api/subscription/portal` → redirect to portalUrl.
- Do not handle webhooks client-side; backend should process them. Frontend can poll subscription status or get via `GET /api/subscription/status`.

---

## 11. OpenAI (Frontend considerations)
- **Never call OpenAI directly from client**. Always call backend endpoints (`/api/glossary/define`, `/api/ai/analyze`) which will forward to OpenAI with server-side API key.
- Provide UX for loading & rate limits; cache glossary locally (localStorage or react-query cache) with TTL.

---

## 12. Feature flags
- Implementation: server-side feature flags API (`GET /api/feature-flags`) returning enabled features per user. Frontend reads flags initially and stores in context; re-check periodically.
- Use flags to toggle AI Coach, Realtime Streaming (enable for paid users only), Backtesting.

---

## 13. Design tokens & Tailwind config
- Colors (as requested):
  - `--color-primary: #00BFA6` (teal)
  - `--color-dark: #0F172A` (navy)
  - `--color-accent: #7C3AED` (violet)
  - `--color-success: #22C55E`
  - `--color-danger: #EF4444`
  - `--color-neutral: #F8FAFC`
- Tailwind: setup `theme.extend.colors` mapping, spacing scale base 8/16.
- Fonts: Inter via Google Fonts.

---

## 14. Accessibility (a11y)
- All interactive elements must be keyboard accessible.
- Use semantic HTML (button, form, nav, main, header, footer).
- Provide aria-labels for icons and charts.
- Contrast ratio: ensure text vs background passes WCAG AA.

---

## 15. Testing strategy
- **Unit tests** for pure components (Jest + RTL).
- **Integration tests** for forms (login, trade flow) using RTL.
- **E2E tests** in Cypress simulating happy path: register → login → place market order → check holdings → run AI analyze.
- Include test IDs (`data-testid`) for key flows.

---

## 16. Env variables (.env.example)
```
VITE_API_BASE_URL=https://api.yoursite.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_ENV=development
```

> Notes: OpenAI key and Stripe secret stay in backend env.

---

## 17. Performance & best practices
- Code-splitting per route (React.lazy + Suspense).
- Use React Query caching, keep staleTime for market data (short) and glossary (long).
- Debounce search inputs (250ms).
- Avoid heavy libraries on initial bundle; lazy-load chart lib and Stripe.js.

---

## 18. CI/CD & Deployment
- Build pipeline: install -> lint -> test -> build -> deploy.
- Deploy static frontend to Netlify / Vercel / S3+CloudFront.
- Use environment variables in hosting platform.

---

## 19. Developer checklist (MVP) — tasks to start
1. Setup repo (Vite + TS + Tailwind) + eslint/prettier.
2. Implement Auth pages + ProtectedRoute + Axios auth client.
3. Implement Dashboard basic layout + `GET /api/coins` data fetch.
4. Implement CoinDetail (chart stub) + OrderForm modal (client validation only).
5. Implement Portfolio page reading `/api/portfolios/:id` and holdings table.
6. Implement Glossary page + Tooltip calling `/api/glossary/define` and caching.
7. Implement News list calling `/api/news`.
8. Wire Stripe flow on `/pricing` (create-checkout-session flow).
9. Add React Query & global error handling + toasts.
10. Add unit tests for components & basic E2E test.

---

## 20. Helpful utilities & snippets
- Axios instance with interceptor (attach accessToken):
```ts
// api/client.ts
import axios from 'axios';
const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL });
api.interceptors.request.use(config => {
  const token = auth.getAccessToken();
  if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
export default api;
```

- React Query sample usage:
```ts
const useCoins = () => useQuery(['coins'], () => api.get('/api/coins').then(res => res.data));
```

---

## 21. Handover notes cho backend devs
- Thống nhất API contract và error shapes ` { status: 'ok'|'error', data:..., message?:... } `
- Trả mã lỗi tiêu chuẩn 401 cho expired token, 403 for forbidden.
- Add CORS config to allow frontend origin.

---

## 22. Tài liệu tham khảo
- Tailwind docs, React Query docs, React Hook Form docs, Stripe Checkout docs, OpenAI best practices (server-side).

---

Nếu bạn muốn, mình có thể:
- Xuất phiên bản tiếng Anh, hoặc
- Chuyển một phần thành checklist Trello/Asana, hoặc
- Tạo các PR templates / branch naming convention cho team.

Nói mình biết bạn muốn gì tiếp theo!

