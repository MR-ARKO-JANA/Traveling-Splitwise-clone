/**
 * Test Setup — Creates an isolated test environment using mongodb-memory-server
 * Provides helper functions for creating test users, groups, and generating auth tokens
 */
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

let mongoServer;

// Set JWT_SECRET for tests
process.env.JWT_SECRET = "test-jwt-secret-for-unit-tests-only";
process.env.NODE_ENV = "test";

/**
 * Connect to in-memory MongoDB
 */
async function connectTestDB() {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
}

/**
 * Disconnect and stop in-memory MongoDB
 */
async function disconnectTestDB() {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    if (mongoServer) await mongoServer.stop();
}

/**
 * Clear all collections
 */
async function clearTestDB() {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
}

/**
 * Create a test user and return user + token
 */
async function createTestUser(overrides = {}) {
    const User = require("../models/User");
    const hashedPassword = await bcrypt.hash(overrides.password || "password123", 10);

    const user = await User.create({
        name: overrides.name || "Test User",
        email: overrides.email || `test-${Date.now()}@example.com`,
        password: hashedPassword,
        ...overrides,
        password: hashedPassword // ensure we always use the hashed version
    });

    const payload = { user: { id: user._id.toString() } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });

    return { user, token };
}

/**
 * Create a test group
 */
async function createTestGroup({ creatorId, name, members = [] }) {
    const Group = require("../models/Group");
    const group = await Group.create({
        name: name || "Test Group",
        description: "A test group",
        members,
        createdBy: creatorId
    });
    return group;
}

/**
 * Create a test expense
 */
async function createTestExpense({ paidBy, splitWith, groupId, amount = 100, description = "Test expense" }) {
    const Expense = require("../models/Expense");
    const expense = await Expense.create({
        description,
        amount,
        paidBy,
        splitWith,
        group: groupId,
        category: "food"
    });
    return expense;
}

module.exports = {
    connectTestDB,
    disconnectTestDB,
    clearTestDB,
    createTestUser,
    createTestGroup,
    createTestExpense
};
