const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const groupController = require('../controllers/groupController');
const validate = require('../middleware/validate');
const schemas = require('../validations/groupValidation');

/**
 * @swagger
 * tags:
 *   name: Groups
 *   description: Group management for expense sharing
 */

/**
 * @swagger
 * /api/groups:
 *   get:
 *     summary: Get all groups for the authenticated user
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of groups per page
 *     responses:
 *       200:
 *         description: List of groups with pagination
 *       401:
 *         description: Not authenticated
 */
router.get('/', auth, groupController.getGroups);

/**
 * @swagger
 * /api/groups:
 *   post:
 *     summary: Create a new group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Trip to Goa"
 *               description:
 *                 type: string
 *                 example: "Beach vacation expenses"
 *               emails:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: email
 *     responses:
 *       201:
 *         description: Group created successfully
 *       400:
 *         description: Validation error
 */
router.post('/', auth, validate(schemas.createGroup), groupController.createGroup);

/**
 * @swagger
 * /api/groups/add-member:
 *   post:
 *     summary: Add a member to a group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [groupId, email]
 *             properties:
 *               groupId:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Member added successfully
 *       400:
 *         description: User already in group
 *       404:
 *         description: Group not found
 */
router.post('/add-member', auth, validate(schemas.addMember), groupController.addMember);

/**
 * @swagger
 * /api/groups/{id}:
 *   delete:
 *     summary: Delete a group and its expenses
 *     tags: [Groups]
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
 *         description: Group and expenses deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Group not found
 */
router.delete('/:id', auth, groupController.deleteGroup);

module.exports = router;
