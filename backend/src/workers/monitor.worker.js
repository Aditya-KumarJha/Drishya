import { Worker } from "bullmq";
import axios from "axios";
import { connection } from "../config/redis.js";
import Log from "../modules/logs/log.model.js";
import { handleFailure, handleSuccess } from "../modules/incident/incident.processor.js";
import { emitMonitorStatus } from "../sockets/socket.js";
import Monitor from "../modules/monitor/monitor.model.js";

const isStatusExpected = (status, expectedStatusCodes = []) => {
  if (expectedStatusCodes.length) {
    return expectedStatusCodes.includes(status);
  }
  return status >= 200 && status < 400;
};

const toPlainHeaders = (headers) => {
  if (!headers) return {};
  if (headers instanceof Map) return Object.fromEntries(headers.entries());
  if (typeof headers.toObject === "function") return headers.toObject();
  return headers;
};

const stringifyResponseBody = (body) => {
  if (typeof body === "string") return body;
  if (body == null) return "";
  try {
    return JSON.stringify(body);
  } catch {
    return String(body);
  }
};

export const startBullWorker = () => {
  const worker = new Worker(
    "monitor-queue",
    async (job) => {
      const { monitorId } = job.data;
      const monitor = await Monitor.findById(monitorId);
      if (!monitor) {
        console.warn(`Monitor ${monitorId} not found, skipping check`);
        return;
      }

      const {
        url,
        method,
        timeoutMs,
        expectedStatusCodes,
        responseKeyword,
        body,
      } = monitor;

      let latency = 0;
      const start = Date.now();

      try {
        const res = await axios({
          url,
          method,
          timeout: timeoutMs || 10000,
          headers: toPlainHeaders(monitor.headers),
          data: body || undefined,
          validateStatus: () => true,
        });

        latency = Date.now() - start;
        const expectedStatus = isStatusExpected(res.status, expectedStatusCodes);
        const expectedBody = responseKeyword
          ? stringifyResponseBody(res.data).includes(responseKeyword)
          : true;
        const success = expectedStatus && expectedBody;
        const error = success
          ? ""
          : !expectedStatus
            ? `Unexpected status ${res.status}`
            : `Response keyword not found: ${responseKeyword}`;

        await Log.create({
          monitorId,
          status: res.status,
          responseTime: latency,
          success,
          error,
          checkedAt: new Date(),
        });

        await Monitor.findByIdAndUpdate(monitorId, {
          lastCheckedAt: new Date(),
          lastResponseTime: latency,
          lastStatus: success ? "UP" : "DOWN",
        });

        console.log(`${success ? "✅" : "❌"} ${url} (${latency}ms)`);

        emitMonitorStatus(monitorId, {
          success,
          status: res.status,
          latency,
          url,
          error,
        });

        if (success) {
          await handleSuccess(monitorId);
        } else {
          await handleFailure(monitorId);
        }

      } catch (err) {
        latency = Date.now() - start;

        const errorStatus = err.response?.status || 500;

        await Log.create({
          monitorId,
          status: errorStatus,
          responseTime: latency,
          success: false,
          error: err.message,
          checkedAt: new Date(),
        });

        await Monitor.findByIdAndUpdate(monitorId, {
          lastCheckedAt: new Date(),
          lastResponseTime: latency,
          lastStatus: "DOWN",
        });

        console.log(`❌ Failed: ${url} - ${err.message}`);

        emitMonitorStatus(monitorId, {
          success: false,
          status: errorStatus,
          latency,
          url,
          error: err.message,
        });

        await handleFailure(monitorId);
      }
    },
    {
      connection,
      concurrency: 5
    }
  );

  console.log("🟢 BullMQ Worker started...");
};
