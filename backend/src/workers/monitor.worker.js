import { Worker } from "bullmq";
import axios from "axios";
import dns from "dns/promises";
import tls from "tls";
import { connection } from "../config/redis.js";
import { withBullmqOptions } from "../config/bullmq.js";
import Log from "../modules/logs/log.model.js";
import { handleFailure, handleSuccess } from "../modules/incident/incident.processor.js";
import { emitMonitorStatus } from "../sockets/socket.js";
import Monitor from "../modules/monitor/monitor.model.js";
import { chargeMonitorCheck } from "../modules/billing/billing.service.js";

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

const getHostname = (url) => new URL(url).hostname;

const checkSslCertificate = (url, timeoutMs = 10000) => new Promise((resolve) => {
  const startedAt = Date.now();
  const hostname = getHostname(url);
  const socket = tls.connect({
    host: hostname,
    port: 443,
    servername: hostname,
    timeout: timeoutMs,
  }, () => {
    const certificate = socket.getPeerCertificate();
    const expiresAt = certificate?.valid_to ? new Date(certificate.valid_to) : null;
    const daysRemaining = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / 86400000) : null;
    const success = Boolean(expiresAt && daysRemaining >= 0 && socket.authorized);
    socket.end();
    resolve({
      checkType: "SSL",
      status: success ? 200 : 495,
      success,
      responseTime: Date.now() - startedAt,
      error: success ? "" : socket.authorizationError || "SSL certificate invalid or expired",
      meta: { expiresAt, daysRemaining, authorized: socket.authorized },
    });
  });

  socket.on("timeout", () => {
    socket.destroy();
    resolve({
      checkType: "SSL",
      status: 408,
      success: false,
      responseTime: Date.now() - startedAt,
      error: "SSL check timed out",
      meta: {},
    });
  });

  socket.on("error", (error) => {
    resolve({
      checkType: "SSL",
      status: 495,
      success: false,
      responseTime: Date.now() - startedAt,
      error: error.message,
      meta: {},
    });
  });
});

const checkDnsResolution = async (url) => {
  const startedAt = Date.now();
  try {
    const hostname = getHostname(url);
    const records = await dns.lookup(hostname, { all: true, verbatim: true });
    return {
      checkType: "DNS",
      status: records.length ? 200 : 502,
      success: records.length > 0,
      responseTime: Date.now() - startedAt,
      error: records.length ? "" : "DNS returned no addresses",
      meta: { addresses: records.map((record) => record.address) },
    };
  } catch (error) {
    return {
      checkType: "DNS",
      status: 502,
      success: false,
      responseTime: Date.now() - startedAt,
      error: error.message,
      meta: {},
    };
  }
};

const checkHttpEndpoint = async (monitor) => {
  const {
    url,
    method,
    timeoutMs,
    expectedStatusCodes,
    responseKeyword,
    body,
  } = monitor;
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

    const latency = Date.now() - start;
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

    return {
      checkType: "HTTP",
      status: res.status,
      responseTime: latency,
      success,
      error,
      meta: {},
    };
  } catch (err) {
    return {
      checkType: "HTTP",
      status: err.response?.status || 500,
      responseTime: Date.now() - start,
      success: false,
      error: err.message,
      meta: {},
    };
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

      const charge = await chargeMonitorCheck({ monitor });
      if (!charge.charged) {
        console.warn(`Credits exhausted for monitor ${monitorId}; active monitors paused`);
        emitMonitorStatus(monitorId, {
          success: false,
          status: 402,
          latency: 0,
          url: monitor.url,
          error: "Credits exhausted. Monitor paused.",
        });
        return;
      }

      const checkTypes = monitor.checkTypes?.length ? monitor.checkTypes : ["HTTP"];
      const results = [];

      if (checkTypes.includes("HTTP")) {
        results.push(await checkHttpEndpoint(monitor));
      }

      if (checkTypes.includes("SSL") && monitor.url.startsWith("https://")) {
        results.push(await checkSslCertificate(monitor.url, monitor.timeoutMs));
      }

      if (checkTypes.includes("DNS")) {
        results.push(await checkDnsResolution(monitor.url));
      }

      const checkedAt = new Date();
      await Log.insertMany(results.map((result) => ({
        monitorId,
        checkType: result.checkType,
        region: monitor.regions?.[0] || "primary",
        status: result.status,
        responseTime: result.responseTime,
        success: result.success,
        error: result.error,
        checkedAt,
        meta: result.meta,
      })));

      const primaryResult = results.find((result) => result.checkType === "HTTP") || results[0];
      const success = results.every((result) => result.success);
      const update = {
        lastCheckedAt: checkedAt,
        lastResponseTime: primaryResult?.responseTime || 0,
        lastStatus: success ? "UP" : "DOWN",
      };
      const sslResult = results.find((result) => result.checkType === "SSL");
      const dnsResult = results.find((result) => result.checkType === "DNS");
      if (sslResult?.meta) {
        update.sslExpiresAt = sslResult.meta.expiresAt || null;
        update.sslDaysRemaining = sslResult.meta.daysRemaining ?? null;
      }
      if (dnsResult?.meta?.addresses) {
        update.dnsResolvedAddresses = dnsResult.meta.addresses;
      }

      await Monitor.findByIdAndUpdate(monitorId, update);

      console.log(`${success ? "✅" : "❌"} ${monitor.url} (${primaryResult?.responseTime || 0}ms)`);

      emitMonitorStatus(monitorId, {
        success,
        status: primaryResult?.status || 500,
        latency: primaryResult?.responseTime || 0,
        url: monitor.url,
        error: results.find((result) => !result.success)?.error || "",
        checks: results,
      });

      if (success) {
        await handleSuccess(monitorId);
      } else {
        await handleFailure(monitorId);
      }
    },
    withBullmqOptions({
      connection,
      concurrency: 5
    })
  );

  console.log("🟢 BullMQ Worker started...");
  return worker;
};
