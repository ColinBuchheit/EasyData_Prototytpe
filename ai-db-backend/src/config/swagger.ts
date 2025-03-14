// src/config/swagger.ts
import swaggerJSDoc from "swagger-jsdoc";
import { ENV } from "./env";
import glob from "glob";

const NODE_ENV = process.env.NODE_ENV || "development";

// ✅ Dynamically configure API servers based on environment
const servers = [
  {
    url: `http://localhost:${ENV.PORT}`,
    description: "Local Development Server",
  },
];

if (NODE_ENV === "staging" && ENV.STAGING_API_URL) {
  servers.push({ url: ENV.STAGING_API_URL, description: "Staging Server" });
} else if (NODE_ENV === "production" && ENV.PROD_API_URL) {
  servers.push({ url: ENV.PROD_API_URL, description: "Production Server" });
}

// ✅ Automatically detect file extensions for dev & production
const apiPaths = glob.sync("./src/routes/v1/*.{ts,js}").concat(glob.sync("./src/controllers/v1/*.{ts,js}"));

// ✅ Validate API Paths Before Setting Up Swagger
if (apiPaths.length === 0) {
  console.warn("⚠️ No API route files found. Swagger may not work correctly.");
}

// ✅ Improved Swagger Options
const options = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "EasyData API",
      version: "1.0.0",
      description: "API documentation for the EasyData backend",
      contact: {
        name: "EasyData Support",
        url: "https://easydata.com/support",
        email: "support@easydata.com",
      },
    },
    servers,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            error: { type: "string", description: "Error message" },
            statusCode: { type: "integer", description: "HTTP status code" },
          },
          example: {
            error: "Unauthorized access",
            statusCode: 401,
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: apiPaths,
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
