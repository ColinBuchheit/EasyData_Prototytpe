// src/config/swagger.ts
import swaggerJSDoc from "swagger-jsdoc";
import { ENV } from "./env";
import fs from "fs";

// ✅ Ensure NODE_ENV is always defined
const NODE_ENV = process.env.NODE_ENV || "development";

// ✅ Dynamically configure API servers based on environment
const servers = [
  {
    url: `http://localhost:${ENV.PORT}`,
    description: "Local Development Server",
  },
];

if (NODE_ENV === "staging") {
  servers.push({
    url: "https://staging-api.easydata.com",
    description: "Staging Server",
  });
} else if (NODE_ENV === "production") {
  servers.push({
    url: "https://api.easydata.com",
    description: "Production Server",
  });
}

// ✅ Validate `apis` paths before using them
const apiPaths = ["./src/routes/v1/*.ts", "./src/controllers/v1/*.ts"].filter((path) =>
  fs.existsSync(path)
);

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
    security: [
      {
        bearerAuth: [], // 🔹 Required auth endpoints
      },
      {
        bearerAuth: ["optional"], // 🔹 Allows optional authentication (for public routes)
      },
    ],
  },
  apis: apiPaths.length > 0 ? apiPaths : [], // ✅ Prevent Swagger from breaking on missing files
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
