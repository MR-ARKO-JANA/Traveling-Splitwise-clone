/**
 * Expense API Tests
 * Tests: create, get (paginated), update, delete, user history
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
    app.use("/api/expenses", require("../routes/expenseRoutes"));

    const errorHandler = require("../middleware/errorHandler");
    app.use(errorHandler);
});

afterEach(async () => {
    await clearTestDB();
});

afterAll(async () => {
    await disconnectTestDB();
});

describe("POST /api/expenses", () => {
    test("should create an expense", async () => {
        const { token, user } = await createTestUser({ email: "payer@test.com" });
        const member = await createTestUser({ email: "member@test.com" });
        const group = await createTestGroup({
            creatorId: user._id,
            name: "Expense Group",
            members: ["payer@test.com", "member@test.com"]
        });

        const res = await request(app)
            .post("/api/expenses")
            .set("Authorization", `Bearer ${token}`)
            .send({
                description: "Dinner",
                amount: 500,
                groupId: group._id.toString(),
                category: "food"
            });

        expect(res.status).toBe(201);
        expect(res.body.description).toBe("Dinner");
        expect(res.body.amount).toBe(500);
        expect(res.body.category).toBe("food");
    });

    test("should fail without description", async () => {
        const { token, user } = await createTestUser({ email: "nodesc@test.com" });
        const group = await createTestGroup({
            creatorId: user._id,
            name: "No Desc Group",
            members: ["nodesc@test.com"]
        });

        const res = await request(app)
            .post("/api/expenses")
            .set("Authorization", `Bearer ${token}`)
            .send({
                amount: 500,
                groupId: group._id.toString()
            });

        expect(res.status).toBe(400);
    });

    test("should fail with negative amount", async () => {
        const { token, user } = await createTestUser({ email: "neg@test.com" });
        const group = await createTestGroup({
            creatorId: user._id,
            name: "Neg Amount Group",
            members: ["neg@test.com"]
        });

        const res = await request(app)
            .post("/api/expenses")
            .set("Authorization", `Bearer ${token}`)
            .send({
                description: "Negative",
                amount: -100,
                groupId: group._id.toString()
            });

        expect(res.status).toBe(400);
    });

    test("should fail for non-existent group", async () => {
        const { token } = await createTestUser();
        const mongoose = require("mongoose");

        const res = await request(app)
            .post("/api/expenses")
            .set("Authorization", `Bearer ${token}`)
            .send({
                description: "Bad Group",
                amount: 100,
                groupId: new mongoose.Types.ObjectId().toString()
            });

        expect(res.status).toBe(404);
    });

    test("should fail without auth", async () => {
        const res = await request(app)
            .post("/api/expenses")
            .send({
                description: "No Auth",
                amount: 100,
                groupId: "fakeid"
            });

        expect(res.status).toBe(401);
    });
});

describe("GET /api/expenses/:groupId", () => {
    test("should return paginated expenses for a group", async () => {
        const { token, user } = await createTestUser({ email: "getexp@test.com" });
        const group = await createTestGroup({
            creatorId: user._id,
            name: "Get Expenses Group",
            members: ["getexp@test.com"]
        });

        // Create 5 expenses
        for (let i = 0; i < 5; i++) {
            await createTestExpense({
                paidBy: user._id,
                splitWith: [user._id],
                groupId: group._id,
                amount: 100 * (i + 1),
                description: `Expense ${i}`
            });
        }

        const res = await request(app)
            .get(`/api/expenses/${group._id}?page=1&limit=3`)
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(3);
        expect(res.body.pagination.total).toBe(5);
        expect(res.body.pagination.totalPages).toBe(2);
    });

    test("should return empty for group with no expenses", async () => {
        const { token, user } = await createTestUser({ email: "empty@test.com" });
        const group = await createTestGroup({
            creatorId: user._id,
            name: "Empty Group",
            members: ["empty@test.com"]
        });

        const res = await request(app)
            .get(`/api/expenses/${group._id}`)
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(0);
        expect(res.body.pagination.total).toBe(0);
    });
});

describe("PUT /api/expenses/:id", () => {
    test("should update own expense", async () => {
        const { token, user } = await createTestUser({ email: "update@test.com" });
        const group = await createTestGroup({
            creatorId: user._id,
            name: "Update Group",
            members: ["update@test.com"]
        });
        const expense = await createTestExpense({
            paidBy: user._id,
            splitWith: [user._id],
            groupId: group._id
        });

        const res = await request(app)
            .put(`/api/expenses/${expense._id}`)
            .set("Authorization", `Bearer ${token}`)
            .send({
                description: "Updated Description",
                amount: 999
            });

        expect(res.status).toBe(200);
        expect(res.body.description).toBe("Updated Description");
        expect(res.body.amount).toBe(999);
    });

    test("should not update someone else's expense", async () => {
        const { user: owner } = await createTestUser({ email: "expowner@test.com" });
        const { token: otherToken } = await createTestUser({ email: "expother@test.com" });
        const group = await createTestGroup({
            creatorId: owner._id,
            name: "Other Group",
            members: ["expowner@test.com", "expother@test.com"]
        });
        const expense = await createTestExpense({
            paidBy: owner._id,
            splitWith: [owner._id],
            groupId: group._id
        });

        const res = await request(app)
            .put(`/api/expenses/${expense._id}`)
            .set("Authorization", `Bearer ${otherToken}`)
            .send({ description: "Hacked" });

        expect(res.status).toBe(401);
    });
});

describe("DELETE /api/expenses/:id", () => {
    test("should delete own expense", async () => {
        const { token, user } = await createTestUser({ email: "delexp@test.com" });
        const group = await createTestGroup({
            creatorId: user._id,
            name: "Delete Expense Group",
            members: ["delexp@test.com"]
        });
        const expense = await createTestExpense({
            paidBy: user._id,
            splitWith: [user._id],
            groupId: group._id
        });

        const res = await request(app)
            .delete(`/api/expenses/${expense._id}`)
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/removed/i);
    });

    test("should return 404 for non-existent expense", async () => {
        const { token } = await createTestUser();
        const mongoose = require("mongoose");

        const res = await request(app)
            .delete(`/api/expenses/${new mongoose.Types.ObjectId()}`)
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(404);
    });
});

describe("GET /api/expenses/history/user", () => {
    test("should return paginated user expense history", async () => {
        const { token, user } = await createTestUser({ email: "history@test.com" });
        const group = await createTestGroup({
            creatorId: user._id,
            name: "History Group",
            members: ["history@test.com"]
        });

        for (let i = 0; i < 4; i++) {
            await createTestExpense({
                paidBy: user._id,
                splitWith: [user._id],
                groupId: group._id,
                description: `History ${i}`
            });
        }

        const res = await request(app)
            .get("/api/expenses/history/user?page=1&limit=2")
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(2);
        expect(res.body.pagination.total).toBe(4);
    });
});
