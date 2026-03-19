const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const expenseController = require("../controllers/expenseController");

router.post("/", auth, expenseController.createExpense);
router.get("/:groupId", auth, expenseController.getGroupExpenses);
router.delete("/:id", auth, expenseController.deleteExpense);
router.put("/:id", auth, expenseController.updateExpense);

module.exports = router;