/**
 * Express Application Setup
 * 
 * This file configures Express with all middleware in the correct order.
 * It does NOT start the server — that's server.js's job.
 * 
 * WHY separate app.js from server.js?
 * So we can import `app` in tests (Supertest) without actually
 * starting a listening server or connecting to databases.
 * 
 * Middleware order matters:
 * 1. Security headers (helmet) — first, so every response gets them
 * 2. CORS — before any route handlers
 * 3. Body parsing — before routes that read req.body
 * 4. Sanitization — after parsing, before handlers
 * 5. Request logging — after parsing, so we can log body size
 * 6. Routes
 * 7. 404 handler — after routes, catches unmatched paths
 * 8. Error handler — last, catches everything thrown above
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const hpp = require('hpp');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');

const { env } = require('./config/env');
const { logger } = require('./config/logger');
const { errorHandler } = require('./middleware/errorHandler');
const { notFound } = require('./middleware/notFound');
const apiRouter = require('./routes/index');

const app = express();

// ─── 1. Security Headers ───────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Needed for Tailwind
        imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: env.NODE_ENV === 'production' ? [] : null,
      },
    },
  })
);

// ─── 2. CORS ───────────────────────────────────────────────────────────
const allowedOrigins = env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true, // Required for httpOnly cookie refresh tokens
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── 3. HTTP Parameter Pollution Protection ────────────────────────────
app.use(hpp());

// ─── 4. Body Parsing ───────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' })); // Prevent large payload attacks
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── 5. Cookie Parser ─────────────────────────────────────────────────
app.use(cookieParser());

// ─── 6. Response Compression ──────────────────────────────────────────
app.use(compression());

// ─── 7. NoSQL Injection Sanitization ──────────────────────────────────
app.use(mongoSanitize());

// ─── 8. HTTP Request Logging ──────────────────────────────────────────
if (env.NODE_ENV !== 'test') {
  app.use(
    morgan('short', {
      stream: logger.stream,
    })
  );
}

// ─── 9. Trust proxy (if behind Nginx/load balancer) ───────────────────
if (env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// ─── 10. API Routes ──────────────────────────────────────────────────
app.use('/api/v1', apiRouter);

// ─── 11. 404 Handler ─────────────────────────────────────────────────
app.use(notFound);

// ─── 12. Centralized Error Handler ───────────────────────────────────
app.use(errorHandler);

module.exports = app;
