/**
 * Balance API Tests
 * Tests: summary, details, settlements (with pagination), settle
 */
const request = require("supertest");
const express = require("express");
const cookieParser = require("cookie-parser");
const { connectTestDB, disconnectTestDB, clearTestDB, createTestUser, createTestGroup, createTestExpense } = require("./setup");

let app;

beforeAll(async () => {
    await connectTestDB();

    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.set("io", null); // Mock socket.io
    app.use("/api/balance", require("../routes/balanceRoutes"));

    const errorHandler = require("../middleware/errorHandler");
    app.use(errorHandler);
});

afterEach(async () => {
    await clearTestDB();
});

afterAll(async () => {
    await disconnectTestDB();
});

describe("GET /api/balance/summary", () => {
    test("should return zero balances for new user", async () => {
        const { token } = await createTestUser({ email: "fresh@test.com" });

        const res = await request(app)
            .get("/api/balance/summary")
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.get).toBe("0.00");
        expect(res.body.pay).toBe("0.00");
        expect(res.body.total).toBe("0.00");
    });

    test("should calculate positive balance when others owe you", async () => {
        const { token, user: payer } = await createTestUser({ email: "payer2@test.com" });
        const { user: member } = await createTestUser({ email: "member2@test.com" });
        const group = await createTestGroup({
            creatorId: payer._id,
            name: "Balance Group",
            members: ["payer2@test.com", "member2@test.com"]
        });

        await createTestExpense({
            paidBy: payer._id,
            splitWith: [payer._id, member._id],
            groupId: group._id,
            amount: 200
        });

        const res = await request(app)
            .get("/api/balance/summary")
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(parseFloat(res.body.get)).toBe(100);
        expect(parseFloat(res.body.pay)).toBe(0);
        expect(parseFloat(res.body.total)).toBe(100);
    });

    test("should calculate negative balance when you owe others", async () => {
        const { user: payer } = await createTestUser({ email: "richguy@test.com" });
        const { token, user: member } = await createTestUser({ email: "owesguy@test.com" });
        const group = await createTestGroup({
            creatorId: payer._id,
            name: "Owe Group",
            members: ["richguy@test.com", "owesguy@test.com"]
        });

        await createTestExpense({
            paidBy: payer._id,
            splitWith: [payer._id, member._id],
            groupId: group._id,
            amount: 300
        });

        const res = await request(app)
            .get("/api/balance/summary")
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(parseFloat(res.body.pay)).toBe(150);
        expect(parseFloat(res.body.total)).toBe(-150);
    });

    test("should fail without auth", async () => {
        const res = await request(app).get("/api/balance/summary");
        expect(res.status).toBe(401);
    });
});

describe("GET /api/balance/details", () => {
    test("should return empty object for new user", async () => {
        const { token } = await createTestUser({ email: "nobal@test.com" });

        const res = await request(app)
            .get("/api/balance/details")
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(Object.keys(res.body)).toHaveLength(0);
    });

    test("should return balances per person", async () => {
        const { token, user: payer } = await createTestUser({ email: "deta@test.com" });
        const { user: member } = await createTestUser({ email: "detb@test.com" });
        const group = await createTestGroup({
            creatorId: payer._id,
            name: "Detail Group",
            members: ["deta@test.com", "detb@test.com"]
        });

        await createTestExpense({
            paidBy: payer._id,
            splitWith: [payer._id, member._id],
            groupId: group._id,
            amount: 400
        });

        const res = await request(app)
            .get("/api/balance/details")
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        const memberId = member._id.toString();
        expect(res.body[memberId]).toBeDefined();
        expect(res.body[memberId].balance).toBe(200);
        expect(res.body[memberId].name).toBe("Test User");
    });
});

describe("POST /api/balance/settle", () => {
    test("should record a settlement", async () => {
        const { token, user: from } = await createTestUser({ email: "settler@test.com" });
        const { user: to } = await createTestUser({ email: "payee@test.com" });

        const res = await request(app)
            .post("/api/balance/settle")
            .set("Authorization", `Bearer ${token}`)
            .send({
                withUserId: to._id.toString(),
                amount: 150,
                note: "Paid via UPI"
            });

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/settlement recorded/i);
        expect(res.body.settlement.amount).toBe(150);
    });

    test("should fail without withUserId", async () => {
        const { token } = await createTestUser();

        const res = await request(app)
            .post("/api/balance/settle")
            .set("Authorization", `Bearer ${token}`)
            .send({ amount: 100 });

        expect(res.status).toBe(400);
    });

    test("should fail without amount", async () => {
        const { token } = await createTestUser();
        const { user: other } = await createTestUser({ email: "noamt@test.com" });

        const res = await request(app)
            .post("/api/balance/settle")
            .set("Authorization", `Bearer ${token}`)
            .send({ withUserId: other._id.toString() });

        expect(res.status).toBe(400);
    });
});

describe("GET /api/balance/settlements", () => {
    test("should return paginated settlements", async () => {
        const { token, user: from } = await createTestUser({ email: "setlist@test.com" });
        const { user: to } = await createTestUser({ email: "setpayee@test.com" });

        // Create settlements
        const Settlement = require("../models/Settlement");
        for (let i = 0; i < 5; i++) {
            await Settlement.create({
                from: from._id,
                to: to._id,
                amount: 50 * (i + 1),
                note: `Settlement ${i}`,
                status: "completed",
                settledAt: new Date()
            });
        }

        const res = await request(app)
            .get("/api/balance/settlements?page=1&limit=3")
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(3);
        expect(res.body.pagination.total).toBe(5);
        expect(res.body.pagination.totalPages).toBe(2);
    });
});
