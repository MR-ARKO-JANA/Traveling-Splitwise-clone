const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const balanceController = require("../controllers/balanceController");

/**
 * @swagger
 * tags:
 *   name: Balance
 *   description: Balance tracking and settlements
 */

/**
 * @swagger
 * /api/balance/summary:
 *   get:
 *     summary: Get balance summary for authenticated user
 *     tags: [Balance]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Balance summary with amounts to get, pay, and total
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 get:
 *                   type: string
 *                   example: "500.00"
 *                 pay:
 *                   type: string
 *                   example: "200.00"
 *                 total:
 *                   type: string
 *                   example: "300.00"
 */
router.get("/summary", auth, balanceController.getSummary);

/**
 * @swagger
 * /api/balance/details:
 *   get:
 *     summary: Get detailed balance breakdown per person
 *     tags: [Balance]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Detailed balances with each person
 */
router.get("/details", auth, balanceController.getDetails);

/**
 * @swagger
 * /api/balance/settle:
 *   post:
 *     summary: Record a settlement
 *     tags: [Balance]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [withUserId, amount]
 *             properties:
 *               withUserId:
 *                 type: string
 *                 description: ID of the other user
 *               amount:
 *                 type: number
 *                 example: 500
 *               note:
 *                 type: string
 *                 example: "Paid via UPI"
 *     responses:
 *       200:
 *         description: Settlement recorded
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: User not found
 */
router.post("/settle", auth, balanceController.settle);

/**
 * @swagger
 * /api/balance/settlements:
 *   get:
 *     summary: Get all settlements for authenticated user
 *     tags: [Balance]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Paginated list of settlements
 */
router.get("/settlements", auth, balanceController.getSettlements);

module.exports = router;