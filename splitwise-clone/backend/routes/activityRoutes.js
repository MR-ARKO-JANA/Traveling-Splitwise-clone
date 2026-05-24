const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const activityController = require('../controllers/activityController');

// ─── GET /  — Recent activity feed for the logged-in user ─────────────────────
router.get('/', auth, activityController.getUserFeed);

// ─── GET /group/:groupId  — Activity within a specific group ──────────────────
router.get('/group/:groupId', auth, activityController.getGroupFeed);

module.exports = router;
