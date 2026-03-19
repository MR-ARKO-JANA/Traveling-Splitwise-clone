const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const balanceController = require("../controllers/balanceController");

router.get("/summary", auth, balanceController.getSummary);
router.get("/details", auth, balanceController.getDetails);
router.post("/settle", auth, balanceController.settle);
router.get("/settlements", auth, balanceController.getSettlements);

module.exports = router;