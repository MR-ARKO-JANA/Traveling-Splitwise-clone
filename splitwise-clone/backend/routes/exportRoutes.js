const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const exportController = require('../controllers/exportController');

// ─── GET /csv/:groupId  — Download group expenses as CSV ──────────────────────
router.get('/csv/:groupId', auth, exportController.downloadGroupCSV);

// ─── GET /csv/user/all  — Download all user expenses as CSV ───────────────────
router.get('/csv/user/all', auth, exportController.downloadAllCSV);

// ─── GET /pdf/user/all  — Download all user expenses as PDF ───────────────────
router.get('/pdf/user/all', auth, exportController.downloadAllPDF);

module.exports = router;
