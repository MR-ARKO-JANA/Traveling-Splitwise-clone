# Splitwise Clone - Expense Management App

A full-stack expense sharing application built with Node.js, Express, MongoDB, and vanilla JavaScript. Split bills with friends and track who owes what.

[![CI/CD Pipeline](https://github.com/YOUR_USERNAME/splitwise-clone/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/splitwise-clone/actions/workflows/ci.yml)

## Features

- 🔐 **User authentication** with JWT, httpOnly cookies, and email verification (OTP)
- 👥 **Group management** — Create groups and invite members
- 💰 **Expense splitting** — Equal, exact amount, percentage, and share-based splits
- 📊 **Balance tracking** — See who owes what in real-time
- ⚡ **Real-time updates** via Socket.IO
- 📈 **Spending analytics** with interactive charts
- 👤 **Profile management** with image upload
- 📄 **Export data** — CSV and PDF statement generation
- 📱 **Responsive design** — Works on desktop and mobile
- 🛡️ **Enterprise security** — Rate limiting, Helmet, input validation

## Tech Stack

**Backend:**

- Node.js & Express 5
- MongoDB with Mongoose
- JWT authentication (httpOnly cookies)
- Joi input validation
- Helmet security headers
- Express Rate Limiting (3-tier)
- Morgan HTTP request logging
- Swagger/OpenAPI documentation
- Socket.IO real-time sync
- Multer file uploads

**Frontend:**

- HTML5, CSS3 (Glassmorphism UI), JavaScript
- Chart.js for analytics
- Font Awesome icons

**DevOps:**

- Docker & Docker Compose
- GitHub Actions CI/CD
- Jest + Supertest (65+ automated tests)

## Getting Started

### Local Development

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set up environment variables**
   Create `.env` file in `backend/` folder:

   ```env
   DB_URI=mongodb://localhost:27017/splitwise-clone
   JWT_SECRET=your-strong-random-secret-key
   MAIL_USER=your-email@gmail.com
   MAIL_PASS=your-app-password
   NODE_ENV=development
   ```

3. **Start the application**

   ```bash
   npm run dev    # Development with auto-reload
   npm start      # Production
   ```

4. **Open your browser**
   - App: `http://localhost:5000`
   - API Docs: `http://localhost:5000/api-docs`

### Docker

```bash
docker-compose up -d
```

This starts:

- **App** on port `5000`
- **MongoDB** on port `27017`

## Testing

```bash
npm test              # Run all tests
npm run test:coverage # Run with coverage report
npm run test:watch    # Watch mode for development
npm run lint          # Run formatting check (Prettier)
npm run format        # Auto-format all code
```

**Test Coverage:**

- Auth (signup, login, forgot-password, reset-password)
- Groups (CRUD, pagination, authorization)
- Expenses (CRUD, pagination, ownership)
- Balances (summary, details, settlements)
- Middleware (auth, error handler, validation)
- Split Logic (equal, exact, percentage, shares)

## Performance Benchmarking

A zero-dependency HTTP load testing script is included to measure server throughput and response latencies locally.

Before running the benchmark, make sure your server is running (`npm run dev` or `npm start`).

```bash
npm run benchmark                                  # Benchmark the local health endpoint
npm run benchmark <url> <requests> <concurrency>   # Benchmark a custom endpoint
# Example:
npm run benchmark http://localhost:5000/api/health 1000 50
```

## API Documentation

Interactive Swagger docs available at `/api-docs` when the server is running.

### Key Endpoints

| Method | Endpoint                    | Description                | Auth |
| ------ | --------------------------- | -------------------------- | ---- |
| POST   | `/api/auth/signup`          | Register user              | ❌   |
| POST   | `/api/auth/login`           | Login                      | ❌   |
| POST   | `/api/auth/forgot-password` | Send OTP                   | ❌   |
| GET    | `/api/groups`               | List groups (paginated)    | ✅   |
| POST   | `/api/groups`               | Create group               | ✅   |
| POST   | `/api/expenses`             | Add expense                | ✅   |
| GET    | `/api/expenses/:groupId`    | Group expenses (paginated) | ✅   |
| GET    | `/api/balance/summary`      | Balance summary            | ✅   |
| GET    | `/api/balance/details`      | Detailed balances          | ✅   |
| POST   | `/api/balance/settle`       | Record settlement          | ✅   |
| GET    | `/api/balance/settlements`  | Settlements (paginated)    | ✅   |
| GET    | `/api/export/csv/user/all`  | Export CSV                 | ✅   |
| GET    | `/api/export/pdf/user/all`  | Export PDF                 | ✅   |
| GET    | `/api/health`               | Health check               | ❌   |

## Security & Observability Features

- **Dynamic CORS** — Configurable origins via the `ALLOWED_ORIGINS` environment variable in production.
- **Structured JSON Logging** — Level-based (`info`, `warn`, `error`, `debug`), environment-aware logger. In production, logs output as structured JSON.
- **Rate Limiting** — 3-tier: general API (100/15min), auth (20/15min), password reset (5/15min)
- **Helmet** — Security headers (XSS protection, Content-Type sniffing, etc.)
- **JWT** — HttpOnly cookies with secure flag in production
- **Input Validation** — Joi schemas on all endpoints
- **Password Hashing** — bcryptjs with salt rounds
- **Error Handling** — Centralized error handler with structured responses

## Project Structure

```
splitwise-clone/
├── backend/
│   ├── config/         # Database & Swagger configuration
│   ├── controllers/    # Route handlers (auth, group, expense, balance, user)
│   ├── middleware/      # Auth, validation, rate limiter, error handler
│   ├── models/         # MongoDB schemas (User, Group, Expense, Settlement, Activity)
│   ├── routes/         # API route definitions with Swagger docs
│   ├── tests/          # Jest + Supertest test suites
│   ├── utils/          # Helpers (asyncHandler, splitLogic)
│   ├── validations/    # Joi validation schemas
│   └── server.js       # Express app entry point
├── frontend/
│   ├── css/            # Stylesheets (Glassmorphism theme)
│   ├── js/             # JavaScript modules
│   └── *.html          # HTML pages
├── .github/workflows/  # CI/CD pipeline
├── Dockerfile          # Container build
├── docker-compose.yml  # Multi-service orchestration
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests (`npm test`)
4. Commit changes (`git commit -m 'Add amazing feature'`)
5. Push to branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## License

MIT License
