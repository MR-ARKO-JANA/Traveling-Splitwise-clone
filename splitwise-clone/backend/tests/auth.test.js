/**
 * Auth API Tests
 * Tests: signup, login, forgot-password, verify-otp, reset-password
 */
const request = require("supertest");
const { connectTestDB, disconnectTestDB, clearTestDB, createTestUser } = require("./setup");

// We need to create a minimal express app for testing
const express = require("express");
const cookieParser = require("cookie-parser");

let app;

beforeAll(async () => {
    await connectTestDB();

    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use("/api/auth", require("../routes/authRoutes"));

    const errorHandler = require("../middleware/errorHandler");
    app.use(errorHandler);
});

afterEach(async () => {
    await clearTestDB();
});

afterAll(async () => {
    await disconnectTestDB();
});

describe("POST /api/auth/signup", () => {
    test("should register a new user successfully", async () => {
        const res = await request(app)
            .post("/api/auth/signup")
            .send({
                name: "John Doe",
                email: "john@example.com",
                password: "password123"
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.user).toBeDefined();
        expect(res.body.user.name).toBe("John Doe");
        expect(res.body.user.email).toBe("john@example.com");
        expect(res.body.user.password).toBeUndefined(); // Should not expose password
    });

    test("should fail if user already exists", async () => {
        await createTestUser({ email: "duplicate@example.com" });

        const res = await request(app)
            .post("/api/auth/signup")
            .send({
                name: "Another User",
                email: "duplicate@example.com",
                password: "password123"
            });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/already exists/i);
    });

    test("should fail with missing name", async () => {
        const res = await request(app)
            .post("/api/auth/signup")
            .send({
                email: "noname@example.com",
                password: "password123"
            });

        expect(res.status).toBe(400);
    });

    test("should fail with invalid email format", async () => {
        const res = await request(app)
            .post("/api/auth/signup")
            .send({
                name: "Bad Email",
                email: "not-an-email",
                password: "password123"
            });

        expect(res.status).toBe(400);
    });

    test("should fail with short password", async () => {
        const res = await request(app)
            .post("/api/auth/signup")
            .send({
                name: "Short Pass",
                email: "short@example.com",
                password: "12345"
            });

        expect(res.status).toBe(400);
    });

    test("should set httpOnly cookie", async () => {
        const res = await request(app)
            .post("/api/auth/signup")
            .send({
                name: "Cookie User",
                email: "cookie@example.com",
                password: "password123"
            });

        expect(res.status).toBe(200);
        expect(res.headers["set-cookie"]).toBeDefined();
        const cookie = res.headers["set-cookie"][0];
        expect(cookie).toMatch(/token=/);
        expect(cookie).toMatch(/HttpOnly/i);
    });
});

describe("POST /api/auth/login", () => {
    test("should login with valid credentials", async () => {
        await createTestUser({
            email: "login@example.com",
            password: "password123"
        });

        const res = await request(app)
            .post("/api/auth/login")
            .send({
                email: "login@example.com",
                password: "password123"
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.token).toBeDefined();
    });

    test("should fail with wrong password", async () => {
        await createTestUser({
            email: "wrongpass@example.com",
            password: "password123"
        });

        const res = await request(app)
            .post("/api/auth/login")
            .send({
                email: "wrongpass@example.com",
                password: "wrongpassword"
            });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/invalid/i);
    });

    test("should fail with non-existent email", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({
                email: "nobody@example.com",
                password: "password123"
            });

        expect(res.status).toBe(400);
    });

    test("should fail with missing fields", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({
                email: "no-pass@example.com"
            });

        expect(res.status).toBe(400);
    });
});

describe("POST /api/auth/forgot-password", () => {
    test("should send OTP even for non-existent email (security)", async () => {
        const res = await request(app)
            .post("/api/auth/forgot-password")
            .send({ email: "nonexistent@example.com" });

        // Should still return 200 to not leak user existence
        expect(res.status).toBe(200);
        expect(res.body.message).toBeDefined();
    });

    test("should generate a token for existing user", async () => {
        await createTestUser({ email: "reset@example.com" });

        const res = await request(app)
            .post("/api/auth/forgot-password")
            .send({ email: "reset@example.com" });

        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
    });

    test("should fail without email", async () => {
        const res = await request(app)
            .post("/api/auth/forgot-password")
            .send({});

        expect(res.status).toBe(400);
    });
});

describe("Auth Route - GET /api/auth/test", () => {
    test("should return a test response", async () => {
        const res = await request(app).get("/api/auth/test");

        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Auth routes working");
    });
});
