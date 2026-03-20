const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Limuru Cottage Hospital Queue API',
      version: '1.0.0',
      description: 'Hospital Queue Management System API',
      contact: {
        name: 'API Support',
        email: 'support@limuruhospital.co.ke'
      }
    },
    servers: [
      {
        url: '/api',
        description: 'API Server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
            message: { type: 'string' }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'doctor', 'nurse', 'receptionist', 'patient', 'kiosk'] },
            department_id: { type: 'string', format: 'uuid' },
            is_active: { type: 'boolean' }
          }
        },
        Patient: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            phone: { type: 'string' },
            email: { type: 'string' },
            date_of_birth: { type: 'string', format: 'date' },
            gender: { type: 'string' }
          }
        },
        QueueEntry: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            ticket_number: { type: 'string' },
            patient_id: { type: 'string', format: 'uuid' },
            department_id: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['waiting', 'called', 'in_progress', 'completed', 'no_show', 'cancelled'] },
            priority: { type: 'boolean' },
            position: { type: 'integer' },
            wait_time: { type: 'integer' },
            created_at: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }],
    paths: {
      '/auth/login': {
        post: {
          tags: ['Authentication'],
          summary: 'Login user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    email: { type: 'string' },
                    password: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Login successful' },
            '401': { description: 'Invalid credentials' }
          }
        }
      },
      '/auth/me': {
        get: {
          tags: ['Authentication'],
          summary: 'Get current user',
          responses: {
            '200': { description: 'User data' }
          }
        }
      },
      '/departments': {
        get: {
          tags: ['Departments'],
          summary: 'List all departments',
          responses: {
            '200': { description: 'List of departments' }
          }
        }
      },
      '/queue': {
        get: {
          tags: ['Queue'],
          summary: 'List queue entries',
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string' } },
            { name: 'department_id', in: 'query', schema: { type: 'string' } }
          ],
          responses: {
            '200': { description: 'Queue entries' }
          }
        },
        post: {
          tags: ['Queue'],
          summary: 'Add patient to queue',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    patient_id: { type: 'string' },
                    department_id: { type: 'string' },
                    priority: { type: 'boolean' }
                  }
                }
              }
            }
          },
          responses: {
            '201': { description: 'Entry created' }
          }
        }
      },
      '/queue/stats': {
        get: {
          tags: ['Queue'],
          summary: 'Get queue statistics',
          responses: {
            '200': { description: 'Queue statistics' }
          }
        }
      },
      '/patients': {
        get: {
          tags: ['Patients'],
          summary: 'List patients',
          parameters: [
            { name: 'search', in: 'query', schema: { type: 'string' } }
          ],
          responses: {
            '200': { description: 'List of patients' }
          }
        },
        post: {
          tags: ['Patients'],
          summary: 'Register new patient',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Patient' }
              }
            }
          },
          responses: {
            '201': { description: 'Patient created' }
          }
        }
      },
      '/users': {
        get: {
          tags: ['Users'],
          summary: 'List users (admin only)',
          responses: {
            '200': { description: 'List of users' },
            '403': { description: 'Forbidden' }
          }
        }
      },
      '/doctor-notes': {
        get: {
          tags: ['Clinical Notes'],
          summary: 'Get recent notes',
          responses: {
            '200': { description: 'Clinical notes' }
          }
        },
        post: {
          tags: ['Clinical Notes'],
          summary: 'Create clinical note',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    patient_id: { type: 'string' },
                    subjective: { type: 'string' },
                    objective: { type: 'string' },
                    assessment: { type: 'string' },
                    plan: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            '201': { description: 'Note created' }
          }
        }
      },
      '/analytics/overview': {
        get: {
          tags: ['Analytics'],
          summary: 'Get analytics overview',
          responses: {
            '200': { description: 'Analytics data' }
          }
        }
      },
      '/notifications/sms': {
        post: {
          tags: ['Notifications'],
          summary: 'Send SMS',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    phone: { type: 'string' },
                    message: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'SMS sent' }
          }
        }
      }
    }
  },
  apis: []
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = { swaggerSpec };
