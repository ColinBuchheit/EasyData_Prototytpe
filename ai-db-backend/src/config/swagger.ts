// src/config/swagger.ts
import swaggerJSDoc from "swagger-jsdoc";
import { ENV } from "./env";
import glob from "glob";
import { createContextLogger } from "./logger";

const swaggerLogger = createContextLogger("Swagger");
const NODE_ENV = ENV.NODE_ENV || "development";

// Dynamically configure API servers based on environment
const servers = [
  {
    url: `http://localhost:${ENV.PORT}`,
    description: "Local Development Server",
  },
];

// Add appropriate servers based on environment
if (NODE_ENV === "staging" && ENV.STAGING_API_URL) {
  servers.push({ url: ENV.STAGING_API_URL, description: "Staging Server" });
} else if (NODE_ENV === "production" && ENV.PROD_API_URL) {
  servers.push({ url: ENV.PROD_API_URL, description: "Production Server" });
}

// Automatically detect route files for documentation
const apiPaths = [
  ...glob.sync("./src/modules/*/routes.ts"),
  ...glob.sync("./src/modules/*/routes.js"),
  ...glob.sync("./src/modules/*/controllers/*.ts"),
  ...glob.sync("./src/modules/*/controllers/*.js")
];

// Validate API Paths Before Setting Up Swagger
if (apiPaths.length === 0) {
  swaggerLogger.warn("No API route files found. Swagger may not work correctly.");
}

// Improved Swagger Options
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "EasyData API",
      version: "1.0.0",
      description: "AI-powered database query and visualization API",
      contact: {
        name: "API Support",
        email: "support@easydata.com"
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT"
      }
    },
    servers,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Database', description: 'Database connection management' },
      { name: 'Query', description: 'Database query execution' },
      { name: 'Analytics', description: 'Usage and performance analytics' },
      { name: 'User', description: 'User management' }
    ]
  },
  apis: apiPaths
};

// Generate Swagger specification
const swaggerSpec = swaggerJSDoc(swaggerOptions);

export default swaggerSpec;