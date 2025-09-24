import express from "express";
import pino from "pino";

const logger = pino({ name: "api-gateway" });
const app = express();

const SERVICE_NAME = "api-gateway";
const PORT = Number(process.env.PORT || 3000);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: SERVICE_NAME, timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  logger.info({ port: PORT }, `${SERVICE_NAME} service listening`);
});
