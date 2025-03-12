// src/config/swagger.ts
import swaggerJSDoc from "swagger-jsdoc";
import { ENV } from "./env";
import glob from "glob";

const NODE_ENV = process.env.NODE_ENV || "development";

// ✅ Dynamically configure API servers based on environment variables
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

// ✅ Properly scan for API files using `glob.sync()`
const apiPaths = glob.sync("./src/routes/v1/*.ts").concat(glob.sync("./src/controllers/v1/*.ts"));

const options = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "EasyData API",
      version: "1.0.0",
      description: "API documentation for the EasyData backend",
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
    },
    security: [{ bearerAuth: [] }], // ✅ Fixed security structure
  },
  apis: apiPaths.length > 0 ? apiPaths : ["./src/routes/fallback.ts"], // ✅ Fallback route to prevent errors
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;