const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const expenseController = require("../controllers/expenseController");
const validate = require("../middleware/validate");
const schemas = require("../validations/expenseValidation");

/**
 * @swagger
 * tags:
 *   name: Expenses
 *   description: Expense management and tracking
 */

/**
 * @swagger
 * /api/expenses:
 *   post:
 *     summary: Create a new expense
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [description, amount, groupId]
 *             properties:
 *               description:
 *                 type: string
 *                 example: "Dinner at restaurant"
 *               amount:
 *                 type: number
 *                 example: 1500
 *               groupId:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [food, transport, accommodation, entertainment, utilities, shopping, health, education, other]
 *               splitType:
 *                 type: string
 *                 enum: [equal, exact, percentage, shares]
 *     responses:
 *       201:
 *         description: Expense created
 *       400:
 *         description: Validation error
 *       404:
 *         description: Group not found
 */
router.post("/", auth, validate(schemas.createExpense), expenseController.createExpense);

/**
 * @swagger
 * /api/expenses/history/user:
 *   get:
 *     summary: Get expense history for authenticated user
 *     tags: [Expenses]
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
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Paginated expense history
 */
router.get("/history/user", auth, expenseController.getUserExpenseHistory);

/**
 * @swagger
 * /api/expenses/{groupId}:
 *   get:
 *     summary: Get all expenses for a group
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
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
 *         description: Paginated list of group expenses
 */
router.get("/:groupId", auth, expenseController.getGroupExpenses);

/**
 * @swagger
 * /api/expenses/{id}:
 *   delete:
 *     summary: Delete an expense
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Expense deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Expense not found
 */
router.delete("/:id", auth, expenseController.deleteExpense);

/**
 * @swagger
 * /api/expenses/{id}:
 *   put:
 *     summary: Update an expense
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *               amount:
 *                 type: number
 *               category:
 *                 type: string
 *     responses:
 *       200:
 *         description: Expense updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Expense not found
 */
router.put("/:id", auth, validate(schemas.updateExpense), expenseController.updateExpense);

module.exports = router;