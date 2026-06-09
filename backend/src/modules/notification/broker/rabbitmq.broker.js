import amqplib from "amqplib";
import { logger } from "../logger.utils.js";

const rabbitState = {
  channel: null,
  connection: null,
};

let connectPromise = null;

const PREFETCH = Number(process.env.RABBITMQ_PREFETCH || 10);
const MAX_RETRIES = Number(process.env.RABBITMQ_MAX_RETRIES || 5);
const RETRY_BASE_DELAY_MS = Number(process.env.RABBITMQ_RETRY_BASE_DELAY_MS || 5000);
const DLQ_SUFFIX = ".dlq";
const RETRY_SUFFIX = ".retry";

const getDeadLetterQueueName = (queueName) => `${queueName}${DLQ_SUFFIX}`;
const getRetryQueueName = (queueName) => `${queueName}${RETRY_SUFFIX}`;

const buildRetryDelay = (retryCount) => RETRY_BASE_DELAY_MS * Math.max(retryCount, 1);

const assertQueueTopology = async (queueName) => {
  const deadLetterQueue = getDeadLetterQueueName(queueName);
  const retryQueue = getRetryQueueName(queueName);

  await rabbitState.channel.assertQueue(deadLetterQueue, {
    durable: true,
  });

  await rabbitState.channel.assertQueue(queueName, {
    durable: true,
  });

  await rabbitState.channel.assertQueue(retryQueue, {
    durable: true,
    deadLetterExchange: "",
    deadLetterRoutingKey: queueName,
  });

  return {
    deadLetterQueue,
    retryQueue,
  };
};

async function connect() {
  if (rabbitState.connection) return rabbitState.connection;
  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    try {
      rabbitState.connection = await amqplib.connect(process.env.RABBITMQ_URL);
      logger.info("Connected to RabbitMQ (email queue)");
      rabbitState.connection.on("close", () => {
        rabbitState.channel = null;
        rabbitState.connection = null;
      });
      rabbitState.connection.on("error", (error) => {
        logger.error("RabbitMQ connection error (email queue):", error);
      });
      rabbitState.channel = await rabbitState.connection.createChannel();
      await rabbitState.channel.prefetch(PREFETCH);
      return rabbitState.connection;
    } catch (error) {
      rabbitState.channel = null;
      rabbitState.connection = null;
      logger.error("Error connecting to RabbitMQ:", error);
      throw error;
    } finally {
      connectPromise = null;
    }
  })();

  return connectPromise;
}

async function publishToQueue(queueName, data = {}) {
  if (!rabbitState.channel || !rabbitState.connection) {
    await connect();
  }

  if (!rabbitState.channel) {
    throw new Error("RabbitMQ channel unavailable for publish");
  }

  await assertQueueTopology(queueName);

  rabbitState.channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)), {
    persistent: true,
    contentType: "application/json",
  });
  logger.info(`Message sent to queue ${queueName}`);
  return true;
}

async function subscribeToQueue(queueName, callback) {
  if (!rabbitState.channel || !rabbitState.connection) {
    await connect();
  }

  if (!rabbitState.channel) {
    throw new Error("RabbitMQ channel unavailable for subscribe");
  }

  const { deadLetterQueue, retryQueue } = await assertQueueTopology(queueName);

  rabbitState.channel.consume(queueName, async (msg) => {
    if (msg !== null) {
      try {
        const data = JSON.parse(msg.content.toString());
        await callback(data);
        rabbitState.channel.ack(msg);
      } catch (error) {
        logger.error("Queue message processing failed:", error);
        const retryCount = Number(msg.properties.headers?.["x-retry-count"] || 0);
        const nextRetryCount = retryCount + 1;
        const retryHeaders = {
          ...(msg.properties.headers || {}),
          "x-retry-count": nextRetryCount,
          "x-original-queue": queueName,
        };

        if (nextRetryCount <= MAX_RETRIES) {
          rabbitState.channel.sendToQueue(retryQueue, msg.content, {
            persistent: true,
            contentType: msg.properties.contentType || "application/json",
            expiration: String(buildRetryDelay(nextRetryCount)),
            headers: retryHeaders,
          });
          logger.warn(
            `Message requeued for retry ${nextRetryCount}/${MAX_RETRIES} on ${queueName}`
          );
        } else {
          rabbitState.channel.sendToQueue(deadLetterQueue, msg.content, {
            persistent: true,
            contentType: msg.properties.contentType || "application/json",
            headers: {
              ...retryHeaders,
              "x-final-error": error.message,
            },
          });
          logger.error(`Message moved to DLQ ${deadLetterQueue}`);
        }

        rabbitState.channel.ack(msg);
      }
    }
  });

  return true;
}

async function close() {
  try {
    if (rabbitState.channel) {
      await rabbitState.channel.close();
    }
    if (rabbitState.connection) {
      await rabbitState.connection.close();
    }
  } finally {
    rabbitState.channel = null;
    rabbitState.connection = null;
    connectPromise = null;
  }
}

const isConnected = () => Boolean(rabbitState.connection && rabbitState.channel);

export { connect, publishToQueue, subscribeToQueue, close, isConnected };
