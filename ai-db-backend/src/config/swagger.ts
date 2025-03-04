// src/config/swagger.ts
import swaggerJSDoc from "swagger-jsdoc";
import { ENV } from "./env";

// ✅ Determine API base URL dynamically based on environment
const servers = [
  {
    url: `http://localhost:${ENV.PORT}`,
    description: "Local Development Server",
  },
];

// ✅ Add staging & production servers dynamically
if (process.env.NODE_ENV === "staging") {
  servers.push({
    url: "https://staging-api.easydata.com",
    description: "Staging Server",
  });
} else if (process.env.NODE_ENV === "production") {
  servers.push({
    url: "https://api.easydata.com",
    description: "Production Server",
  });
}

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
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/routes/v1/*.ts", "./src/controllers/v1/*.ts"], // ✅ API versioning
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
