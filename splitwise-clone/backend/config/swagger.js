const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Splitwise Clone API',
      version: '1.0.0',
      description:
        'A full-stack expense sharing application API built with Node.js, Express, and MongoDB. Split bills with friends and track who owes what.',
      contact: {
        name: 'Arko Jana',
        email: 'arkojana45@gmail.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '60d5ecb4b5c9e01f7c8b4567' },
            name: { type: 'string', example: 'John Doe' },
            email: { type: 'string', format: 'email', example: 'john@example.com' },
            profileImage: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Group: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string', example: 'Trip to Goa' },
            description: { type: 'string', example: 'Beach vacation expenses' },
            members: {
              type: 'array',
              items: { type: 'string', format: 'email' },
            },
            createdBy: { type: 'string' },
          },
        },
        Expense: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            description: { type: 'string', example: 'Dinner at restaurant' },
            amount: { type: 'number', example: 1500 },
            currency: { type: 'string', example: 'INR' },
            paidBy: { type: 'string' },
            splitWith: {
              type: 'array',
              items: { type: 'string' },
            },
            group: { type: 'string' },
            splitType: {
              type: 'string',
              enum: ['equal', 'exact', 'percentage', 'shares'],
            },
            category: {
              type: 'string',
              enum: [
                'food',
                'transport',
                'accommodation',
                'entertainment',
                'utilities',
                'shopping',
                'health',
                'education',
                'other',
              ],
            },
            notes: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Settlement: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            from: { type: 'string' },
            to: { type: 'string' },
            amount: { type: 'number', example: 500 },
            note: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'completed', 'cancelled'] },
            settledAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            data: { type: 'array', items: {} },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer', example: 1 },
                limit: { type: 'integer', example: 20 },
                total: { type: 'integer', example: 50 },
                totalPages: { type: 'integer', example: 3 },
              },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  },
  apis: ['./backend/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
