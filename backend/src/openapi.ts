import { OpenAPIV3 } from 'openapi-types';

export const openapiSpec: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: {
    title: 'Restaurant Reservation API',
    version: '1.0.0',
    description:
      'API for reservations and waitlist. Suitable for web and iOS clients.',
  },
  servers: [{ url: 'http://localhost:3001' }],
  tags: [
    { name: 'Reservations', description: 'Reservation operations' },
    { name: 'Waitlist', description: 'Waitlist operations' },
  ],
  paths: {
    '/api/reservations': {
      post: {
        tags: ['Reservations'],
        summary: 'Create reservation',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  guestName: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  phone: { type: 'string' },
                  date: { type: 'string', format: 'date' },
                  time: { type: 'string', example: '19:00' },
                  partySize: { type: 'integer', minimum: 1 },
                  notes: { type: 'string' },
                  source: {
                    type: 'string',
                    enum: ['WEB', 'IN_HOUSE', 'PHONE'],
                  },
                },
                required: [
                  'guestName',
                  'email',
                  'phone',
                  'date',
                  'time',
                  'partySize',
                ],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Reservation created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      enum: ['confirmed', 'pending', 'waitlisted'],
                    },
                    reservation: { $ref: '#/components/schemas/Reservation' },
                    waitlistEntry: { $ref: '#/components/schemas/WaitlistEntry' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
      get: {
        tags: ['Reservations'],
        summary: 'List reservations',
        parameters: [
          {
            name: 'date',
            in: 'query',
            schema: { type: 'string', format: 'date' },
          },
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'CANCELLED'] },
          },
        ],
        responses: {
          '200': {
            description: 'List of reservations',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    reservations: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Reservation' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/reservations/{id}': {
      get: {
        tags: ['Reservations'],
        summary: 'Get reservation by ID',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Reservation',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { reservation: { $ref: '#/components/schemas/Reservation' } },
                },
              },
            },
          },
          '404': { description: 'Not found' },
        },
      },
      patch: {
        tags: ['Reservations'],
        summary: 'Update reservation',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    enum: ['PENDING', 'CONFIRMED', 'CANCELLED'],
                  },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated reservation',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { reservation: { $ref: '#/components/schemas/Reservation' } },
                },
              },
            },
          },
        },
      },
    },
    '/api/reservations/{id}/cancel': {
      post: {
        tags: ['Reservations'],
        summary: 'Cancel reservation (internal)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Cancelled reservation',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    reservation: { $ref: '#/components/schemas/Reservation' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/reservations/cancel/{cancelToken}': {
      get: {
        tags: ['Reservations'],
        summary: 'Cancel reservation (guest token)',
        parameters: [
          {
            name: 'cancelToken',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Cancelled reservation',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    reservation: { $ref: '#/components/schemas/Reservation' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          '404': { description: 'Not found' },
        },
      },
    },
    '/api/waitlist': {
      post: {
        tags: ['Waitlist'],
        summary: 'Create waitlist entry',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  guestName: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  phone: { type: 'string' },
                  date: { type: 'string', format: 'date' },
                  time: { type: 'string', example: '19:00' },
                  partySize: { type: 'integer', minimum: 1 },
                },
                required: ['guestName', 'date', 'time', 'partySize'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Waitlist entry created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    waitlistEntry: { $ref: '#/components/schemas/WaitlistEntry' },
                  },
                },
              },
            },
          },
        },
      },
      get: {
        tags: ['Waitlist'],
        summary: 'List waitlist entries',
        parameters: [
          { name: 'date', in: 'query', schema: { type: 'string', format: 'date' } },
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['WAITING', 'PROMOTED', 'EXPIRED'] },
          },
        ],
        responses: {
          '200': {
            description: 'Waitlist entries',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    waitlistEntries: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/WaitlistEntry' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/waitlist/{id}': {
      patch: {
        tags: ['Waitlist'],
        summary: 'Update waitlist entry',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    enum: ['WAITING', 'PROMOTED', 'EXPIRED'],
                  },
                  linkedReservationId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated waitlist entry',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    waitlistEntry: { $ref: '#/components/schemas/WaitlistEntry' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Reservation: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          guestName: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          date: { type: 'string', format: 'date-time' },
          time: { type: 'string' },
          partySize: { type: 'integer' },
          status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'CANCELLED'] },
          source: { type: 'string', enum: ['WEB', 'IN_HOUSE', 'PHONE'] },
          notes: { type: 'string' },
          cancelToken: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      WaitlistEntry: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          guestName: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          date: { type: 'string', format: 'date-time' },
          time: { type: 'string' },
          partySize: { type: 'integer' },
          status: { type: 'string', enum: ['WAITING', 'PROMOTED', 'EXPIRED'] },
          linkedReservationId: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          promotedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
};
