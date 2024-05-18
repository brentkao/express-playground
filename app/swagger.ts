import { Express } from "express";
import swaggerUiExpress from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Server API",
      version: "1.0.0",
      description: "Express-Playground server.",
      // routePath: "/api/stock", //#swagger.path=/#/api/stock
    },
  },
  // apis: ["./app/controller/auth.ts"],
  apis: ["**/*.ts"],
};

const SwaggerSpecs = swaggerJsdoc(options);

export default (app: Express) => {
  app.use(
    "/api/docs",
    swaggerUiExpress.serve,
    swaggerUiExpress.setup(SwaggerSpecs)
  );
};
