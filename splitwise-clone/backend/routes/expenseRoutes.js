const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const expenseController = require("../controllers/expenseController");
const validate = require("../middleware/validate");
const schemas = require("../validations/expenseValidation");

router.post("/", auth, validate(schemas.createExpense), expenseController.createExpense);
router.get("/history/user", auth, expenseController.getUserExpenseHistory);
router.get("/:groupId", auth, expenseController.getGroupExpenses);
router.delete("/:id", auth, expenseController.deleteExpense);
router.put("/:id", auth, validate(schemas.updateExpense), expenseController.updateExpense);

module.exports = router;