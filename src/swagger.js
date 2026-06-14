const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Pet Tracker API',
    version: '1.0.0',
    description: 'REST API for tracking pets, meals, exercise, and health documents.',
  },
  servers: [{ url: '/api', description: 'Local server' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from /api/auth/login or /api/auth/register',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Something went wrong' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          distanceUnit: { type: 'string', enum: ['km', 'miles'] },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      Pet: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          species: { type: 'string', enum: ['dog', 'cat', 'other'] },
          breed: { type: 'string', nullable: true },
          weight: { type: 'number', nullable: true },
          weightUnit: { type: 'string', enum: ['kg', 'lbs'] },
          birthDate: { type: 'string', format: 'date', nullable: true },
          photo: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      MealLog: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          petId: { type: 'string', format: 'uuid' },
          foodType: { type: 'string' },
          amount: { type: 'number' },
          unit: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
          cost: { type: 'number', nullable: true },
          notes: { type: 'string', nullable: true },
        },
      },
      MealReminder: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          petId: { type: 'string', format: 'uuid' },
          time: { type: 'string', example: '08:00' },
          days: {
            type: 'array',
            items: { type: 'string', enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
          },
          enabled: { type: 'boolean' },
          label: { type: 'string', nullable: true },
        },
      },
      MealBudget: {
        type: 'object',
        properties: {
          petId: { type: 'string', format: 'uuid' },
          monthlyBudget: { type: 'number' },
          currency: { type: 'string', example: '$' },
        },
      },
      ExerciseSession: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          petId: { type: 'string', format: 'uuid' },
          date: { type: 'string', format: 'date' },
          steps: { type: 'integer', nullable: true },
          distanceKm: { type: 'number', nullable: true },
          durationMinutes: { type: 'integer', nullable: true },
          notes: { type: 'string', nullable: true },
        },
      },
      ExerciseReminder: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          petId: { type: 'string', format: 'uuid' },
          time: { type: 'string', example: '07:30' },
          days: {
            type: 'array',
            items: { type: 'string', enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
          },
          enabled: { type: 'boolean' },
          label: { type: 'string', nullable: true },
        },
      },
      HealthDocument: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          petId: { type: 'string', format: 'uuid' },
          category: { type: 'string', enum: ['vet_record', 'prescription', 'billing', 'other'] },
          name: { type: 'string' },
          date: { type: 'string', format: 'date' },
          fileUrl: { type: 'string', nullable: true },
          fileType: { type: 'string', nullable: true },
          fileName: { type: 'string', nullable: true },
          notes: { type: 'string', nullable: true },
          amount: { type: 'number', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
    parameters: {
      petIdQuery: {
        name: 'petId',
        in: 'query',
        required: true,
        schema: { type: 'string', format: 'uuid' },
        description: 'Pet ID to filter by',
      },
    },
    responses: {
      Unauthorized: {
        description: 'Missing or invalid JWT token',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      NotFound: {
        description: 'Resource not found',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      BadRequest: {
        description: 'Missing or invalid request body',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
    },
  },
  paths: {
    // ─── Health ────────────────────────────────────────────────────────────────
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Server health check',
        responses: {
          200: {
            description: 'Server is running',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { status: { type: 'string', example: 'ok' } } },
              },
            },
          },
        },
      },
    },

    // ─── Auth ─────────────────────────────────────────────────────────────────
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'name'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 6 },
                  name: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'User created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          409: {
            description: 'Email already in use',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in with email and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get the authenticated user',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Current user',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      patch: {
        tags: ['Auth'],
        summary: 'Update name or distance unit preference',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  distanceUnit: { type: 'string', enum: ['km', 'miles'] },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Updated user',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // ─── Pets ─────────────────────────────────────────────────────────────────
    '/pets': {
      get: {
        tags: ['Pets'],
        summary: 'List all pets for the authenticated user',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Array of pets',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Pet' } },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Pets'],
        summary: 'Create a new pet',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'species'],
                properties: {
                  name: { type: 'string' },
                  species: { type: 'string', enum: ['dog', 'cat', 'other'] },
                  breed: { type: 'string' },
                  weight: { type: 'number' },
                  weightUnit: { type: 'string', enum: ['kg', 'lbs'], default: 'kg' },
                  birthDate: { type: 'string', format: 'date' },
                  photo: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Pet created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Pet' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/pets/{petId}': {
      parameters: [
        { name: 'petId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      get: {
        tags: ['Pets'],
        summary: 'Get a single pet',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Pet found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Pet' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Pets'],
        summary: 'Update a pet',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  species: { type: 'string', enum: ['dog', 'cat', 'other'] },
                  breed: { type: 'string', nullable: true },
                  weight: { type: 'number', nullable: true },
                  weightUnit: { type: 'string', enum: ['kg', 'lbs'] },
                  birthDate: { type: 'string', format: 'date', nullable: true },
                  photo: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Pet updated',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Pet' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Pets'],
        summary: 'Delete a pet (cascades to all related data)',
        security: [{ bearerAuth: [] }],
        responses: {
          204: { description: 'Pet deleted' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ─── Meal Logs ────────────────────────────────────────────────────────────
    '/meals': {
      get: {
        tags: ['Meals'],
        summary: 'List meal logs for a pet',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/petIdQuery' }],
        responses: {
          200: {
            description: 'Array of meal logs',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/MealLog' } },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      post: {
        tags: ['Meals'],
        summary: 'Log a meal',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['petId', 'foodType', 'amount', 'unit'],
                properties: {
                  petId: { type: 'string', format: 'uuid' },
                  foodType: { type: 'string' },
                  amount: { type: 'number' },
                  unit: { type: 'string' },
                  timestamp: { type: 'string', format: 'date-time' },
                  cost: { type: 'number' },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Meal log created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/MealLog' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/meals/{id}': {
      delete: {
        tags: ['Meals'],
        summary: 'Delete a meal log',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          204: { description: 'Meal log deleted' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ─── Meal Reminders ───────────────────────────────────────────────────────
    '/meals/reminders': {
      get: {
        tags: ['Meals'],
        summary: 'List meal reminders for a pet',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/petIdQuery' }],
        responses: {
          200: {
            description: 'Array of meal reminders',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/MealReminder' } },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      post: {
        tags: ['Meals'],
        summary: 'Create a meal reminder',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['petId', 'time', 'days'],
                properties: {
                  petId: { type: 'string', format: 'uuid' },
                  time: { type: 'string', example: '08:00' },
                  days: {
                    type: 'array',
                    items: { type: 'string', enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
                  },
                  enabled: { type: 'boolean', default: true },
                  label: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Reminder created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/MealReminder' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/meals/reminders/{id}': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      put: {
        tags: ['Meals'],
        summary: 'Update a meal reminder',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  time: { type: 'string', example: '08:00' },
                  days: {
                    type: 'array',
                    items: { type: 'string', enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
                  },
                  enabled: { type: 'boolean' },
                  label: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Reminder updated',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/MealReminder' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Meals'],
        summary: 'Delete a meal reminder',
        security: [{ bearerAuth: [] }],
        responses: {
          204: { description: 'Reminder deleted' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ─── Meal Budget ──────────────────────────────────────────────────────────
    '/meals/budget': {
      get: {
        tags: ['Meals'],
        summary: 'Get the monthly budget for a pet',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/petIdQuery' }],
        responses: {
          200: {
            description: 'Budget or null if not set',
            content: {
              'application/json': {
                schema: { oneOf: [{ $ref: '#/components/schemas/MealBudget' }, { type: 'object', nullable: true }] },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Meals'],
        summary: 'Create or update the monthly budget for a pet',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['petId', 'monthlyBudget'],
                properties: {
                  petId: { type: 'string', format: 'uuid' },
                  monthlyBudget: { type: 'number' },
                  currency: { type: 'string', default: '$' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Budget saved',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/MealBudget' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ─── Exercise Sessions ────────────────────────────────────────────────────
    '/exercise': {
      get: {
        tags: ['Exercise'],
        summary: 'List exercise sessions for a pet',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/petIdQuery' }],
        responses: {
          200: {
            description: 'Array of exercise sessions',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/ExerciseSession' } },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      post: {
        tags: ['Exercise'],
        summary: 'Log an exercise session',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['petId', 'date'],
                properties: {
                  petId: { type: 'string', format: 'uuid' },
                  date: { type: 'string', format: 'date' },
                  steps: { type: 'integer' },
                  distanceKm: { type: 'number' },
                  durationMinutes: { type: 'integer' },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Session created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ExerciseSession' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/exercise/{id}': {
      delete: {
        tags: ['Exercise'],
        summary: 'Delete an exercise session',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          204: { description: 'Session deleted' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ─── Exercise Reminders ───────────────────────────────────────────────────
    '/exercise/reminders': {
      get: {
        tags: ['Exercise'],
        summary: 'List exercise reminders for a pet',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/petIdQuery' }],
        responses: {
          200: {
            description: 'Array of exercise reminders',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/ExerciseReminder' } },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      post: {
        tags: ['Exercise'],
        summary: 'Create an exercise reminder',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['petId', 'time', 'days'],
                properties: {
                  petId: { type: 'string', format: 'uuid' },
                  time: { type: 'string', example: '07:30' },
                  days: {
                    type: 'array',
                    items: { type: 'string', enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
                  },
                  enabled: { type: 'boolean', default: true },
                  label: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Reminder created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ExerciseReminder' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/exercise/reminders/{id}': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      put: {
        tags: ['Exercise'],
        summary: 'Update an exercise reminder',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  time: { type: 'string', example: '07:30' },
                  days: {
                    type: 'array',
                    items: { type: 'string', enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
                  },
                  enabled: { type: 'boolean' },
                  label: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Reminder updated',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ExerciseReminder' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Exercise'],
        summary: 'Delete an exercise reminder',
        security: [{ bearerAuth: [] }],
        responses: {
          204: { description: 'Reminder deleted' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ─── Health Documents ─────────────────────────────────────────────────────
    '/health-docs': {
      get: {
        tags: ['Health Documents'],
        summary: 'List health documents for a pet',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/petIdQuery' }],
        responses: {
          200: {
            description: 'Array of health documents',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/HealthDocument' } },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      post: {
        tags: ['Health Documents'],
        summary: 'Upload a health document',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['petId', 'category', 'name', 'date'],
                properties: {
                  petId: { type: 'string', format: 'uuid' },
                  category: { type: 'string', enum: ['vet_record', 'prescription', 'billing', 'other'] },
                  name: { type: 'string' },
                  date: { type: 'string', format: 'date' },
                  notes: { type: 'string' },
                  amount: { type: 'number' },
                  file: { type: 'string', format: 'binary', description: 'JPEG, PNG, GIF, WebP, or PDF — max 10 MB' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Document created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthDocument' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
          415: {
            description: 'Unsupported file type',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/health-docs/{id}': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      put: {
        tags: ['Health Documents'],
        summary: 'Update a health document (optionally replace the file)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  category: { type: 'string', enum: ['vet_record', 'prescription', 'billing', 'other'] },
                  name: { type: 'string' },
                  date: { type: 'string', format: 'date' },
                  notes: { type: 'string', nullable: true },
                  amount: { type: 'number', nullable: true },
                  file: { type: 'string', format: 'binary', description: 'Replaces the existing file if provided' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Document updated',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthDocument' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
          415: {
            description: 'Unsupported file type',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
      delete: {
        tags: ['Health Documents'],
        summary: 'Delete a health document and its associated file',
        security: [{ bearerAuth: [] }],
        responses: {
          204: { description: 'Document deleted' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
  },
};

module.exports = swaggerDocument;
