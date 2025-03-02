// src/config/swagger.ts
import swaggerJSDoc from "swagger-jsdoc";
import { ENV } from "./env";

const options = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "EasyData API",
      version: "1.0.0",
      description: "API documentation for the EasyData backend",
    },
    servers: [
      {
        url: `http://localhost:${ENV.PORT}`, // ✅ Dynamically use the environment port
        description: "Local server",
      },
    ],
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
  apis: ["./src/routes/*.ts", "./src/controllers/*.ts"],
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
