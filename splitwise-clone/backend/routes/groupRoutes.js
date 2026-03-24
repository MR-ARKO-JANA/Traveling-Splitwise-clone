const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const groupController = require("../controllers/groupController");
const validate = require("../middleware/validate");
const schemas = require("../validations/groupValidation");

router.get("/", auth, groupController.getGroups);
router.post("/", auth, validate(schemas.createGroup), groupController.createGroup);
router.post("/add-member", auth, validate(schemas.addMember), groupController.addMember);
router.delete("/:id", auth, groupController.deleteGroup);

module.exports = router;