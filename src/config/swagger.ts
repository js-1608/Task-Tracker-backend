// src/config/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Team Task Tracker API',
      version: '1.0.0',
      description:
        'REST API for managing tasks within a team. Features JWT auth with refresh token rotation, RBAC (ADMIN/MANAGER/MEMBER), enforced status transitions, Redis caching, and full Docker deployment.',
      contact: { name: 'API Support' },
    },
    servers: [{ url: '/', description: 'API base path' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        RegisterInput: {
          type: 'object',
          required: ['orgName', 'name', 'email', 'password'],
          properties: {
            orgName: { type: 'string', example: 'Acme Corp' },
            name: { type: 'string', example: 'Jane Doe' },
            email: { type: 'string', format: 'email', example: 'jane@acme.com' },
            password: {
              type: 'string',
              minLength: 8,
              example: 'Secure123',
              description: 'Min 8 chars, 1 uppercase, 1 number',
            },
          },
        },
        LoginInput: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'admin@demo.com' },
            password: { type: 'string', example: 'Admin123' },
          },
        },
        RefreshInput: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            status: { type: 'integer', example: 400 },
            code: { type: 'string', example: 'VALIDATION_ERROR' },
            message: { type: 'string', example: 'due_date must be a future date' },
          },
        },
        Task: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            description: { type: 'string', nullable: true },
            priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
            status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'] },
            dueDate: { type: 'string', format: 'date-time', nullable: true },
            assignee: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' },
              },
            },
            project: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
              },
            },
          },
        },
        CreateTaskInput: {
          type: 'object',
          required: ['title', 'projectId'],
          properties: {
            title: { type: 'string', example: 'Design UI mockup' },
            description: { type: 'string', example: 'Create wireframes for the new dashboard' },
            priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
            assigneeId: { type: 'string', example: '6659f13110e53a3e61c56ab8' },
            projectId: { type: 'string', example: '6659f13110e53a3e61c56ab9' },
            dueDate: { type: 'string', format: 'date-time', example: '2027-06-01T00:00:00.000Z' },
          },
        },
        UpdateTaskInput: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
            assigneeId: { type: 'string', nullable: true },
            dueDate: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        UpdateStatusInput: {
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'] },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Users', description: 'User management (ADMIN only)' },
      { name: 'Projects', description: 'Project management' },
      { name: 'Tasks', description: 'Task management with RBAC and status machine' },
      { name: 'Analytics', description: 'Org-level analytics (ADMIN/MANAGER)' },
    ],
  },
  apis: [
    path.join(__dirname, '../modules/**/*.controller.ts').replace(/\\/g, '/'),
    path.join(__dirname, '../modules/**/*.routes.ts').replace(/\\/g, '/'),
    path.join(__dirname, '../modules/**/*.controller.js').replace(/\\/g, '/'),
    path.join(__dirname, '../modules/**/*.routes.js').replace(/\\/g, '/'),
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
