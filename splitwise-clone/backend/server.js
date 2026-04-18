const express = require("express");
const connectDB = require("./config/db"); 
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const http = require("http");
const { Server } = require("socket.io");
const morgan = require("morgan");
const helmet = require("helmet");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const { apiLimiter, authLimiter, passwordResetLimiter } = require("./middleware/rateLimiter");
require("dotenv").config();

// ─── Validate critical environment variables ──────────────────────────────────
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "your-super-secret-key-change-this-in-production") {
    console.warn("⚠️  WARNING: JWT_SECRET is not set or is using the default value. Set a strong, unique secret in your .env file.");
    // Auto-generate a random secret for development (NOT for production)
    if (process.env.NODE_ENV !== "production") {
        const crypto = require("crypto");
        process.env.JWT_SECRET = crypto.randomBytes(64).toString("hex");
        console.log("🔑 Auto-generated a random JWT_SECRET for this session (development only).");
    } else {
        console.error("❌ FATAL: JWT_SECRET must be set in production. Exiting...");
        process.exit(1);
    }
}

const app = express();

connectDB();

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: true, credentials: true }
});
app.set("io", io);

io.on("connection", (socket) => {
    console.log("New real-time client connected:", socket.id);
    socket.on("disconnect", () => console.log("Real-time client disconnected:", socket.id));
});

// ─── Security & Logging Middleware ────────────────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Request logging — dev format in development, combined in production
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Apply general rate limiting to all API routes
app.use("/api", apiLimiter);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Swagger API Documentation ────────────────────────────────────────────────
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: "Splitwise Clone API Docs"
}));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/auth", authLimiter, require("./routes/authRoutes"));
app.use("/api/groups", require("./routes/groupRoutes"));
app.use("/api/expenses", require("./routes/expenseRoutes"));
app.use("/api/balance", require("./routes/balanceRoutes"));
app.use("/api/profile", require("./routes/userRoutes"));
app.use("/api/activity", require("./routes/activityRoutes"));
app.use("/api/export", require("./routes/exportRoutes"));

// ─── Serve Frontend ───────────────────────────────────────────────────────────
const frontendPath = path.join(__dirname, "../frontend");
app.use(express.static(frontendPath));

app.get("/", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
});

// ─── Health Check Endpoint ────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development"
    });
});

const PORT = process.env.PORT || 5000;

const errorHandler = require("./middleware/errorHandler");

// Global error handling middleware
app.use(errorHandler);

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📚 API Docs available at http://localhost:${PORT}/api-docs`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
    console.log("SIGTERM received. Performing graceful shutdown...");
    server.close(() => {
        console.log("Server closed.");
        process.exit(0);
    });
});

module.exports = app;