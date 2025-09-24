import express from "express";
import pino from "pino";

const logger = pino({ name: "key-transparency" });
const app = express();

const SERVICE_NAME = "key-transparency";
const PORT = Number(process.env.PORT || 3003);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: SERVICE_NAME, timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  logger.info({ port: PORT }, `${SERVICE_NAME} service listening`);
});
