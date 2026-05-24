# ─── Stage 1: Install dependencies ─────────────────────────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

# ─── Stage 2: Production image ────────────────────────────────────────────────
FROM node:22-alpine

# Security: run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy dependencies from build stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application code
COPY . .

# Create uploads directory with correct permissions
RUN mkdir -p backend/uploads/profiles && chown -R appuser:appgroup backend/uploads

# Switch to non-root user
USER appuser

# Expose the port
EXPOSE 5000

# Set environment
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Start the application
CMD ["node", "backend/server.js"]
