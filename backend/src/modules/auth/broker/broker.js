import amqplib from 'amqplib';
import { logger } from '../utils/logger.js';

const rabbitState = {
  channel: null,
  connection: null,
};

async function connect() {
  if (rabbitState.connection) return rabbitState.connection;

  try {
    rabbitState.connection = await amqplib.connect(process.env.RABBITMQ_URL);
    logger.info('Connected to RabbitMQ (auth service)');
    rabbitState.connection.on('close', () => {
      rabbitState.channel = null;
      rabbitState.connection = null;
    });
    rabbitState.connection.on('error', (error) => {
      logger.error('RabbitMQ connection error (auth service):', error);
    });
    rabbitState.channel = await rabbitState.connection.createChannel();
    return rabbitState.connection;
  } catch (error) {
    logger.error('Error connecting to RabbitMQ:', error);
    throw error;
  }
}

async function publishToQueue(queueName, data = {}) {
  if (!rabbitState.channel || !rabbitState.connection) {
    await connect();
  }

  if (!rabbitState.channel) {
    throw new Error('RabbitMQ channel unavailable for publish');
  }

  await rabbitState.channel.assertQueue(queueName, {
    durable: true,
  });

  rabbitState.channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)), {
    persistent: true,
    contentType: 'application/json',
  });
  logger.info(`Message sent to queue ${queueName}`);
  return true;
}

async function subscribeToQueue(queueName, callback) {
  if (!rabbitState.channel || !rabbitState.connection) {
    await connect();
  }

  if (!rabbitState.channel) {
    throw new Error('RabbitMQ channel unavailable for subscribe');
  }

  await rabbitState.channel.assertQueue(queueName, {
    durable: true,
  });

  rabbitState.channel.consume(queueName, async (msg) => {
    if (msg !== null) {
      const data = JSON.parse(msg.content.toString());
      await callback(data);
      rabbitState.channel.ack(msg);
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
  }
}

const isConnected = () => Boolean(rabbitState.connection && rabbitState.channel);

export { connect, publishToQueue, subscribeToQueue, close, isConnected };

export default {
  connect,
  publishToQueue,
  subscribeToQueue,
  close,
  isConnected,
};
