import express from "express";
import pino from "pino";

const logger = pino({ name: "delivery" });
const app = express();

const SERVICE_NAME = "delivery";
const PORT = Number(process.env.PORT || 3006);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: SERVICE_NAME, timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  logger.info({ port: PORT }, `${SERVICE_NAME} service listening`);
});
