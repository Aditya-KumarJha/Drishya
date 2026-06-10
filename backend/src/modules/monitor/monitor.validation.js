import dns from 'dns/promises';
import net from 'net';

const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD']);
const MIN_INTERVAL_MS = 30_000;
const MAX_INTERVAL_MS = 86_400_000;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 30_000;
const MAX_HEADERS = 20;
const MAX_HEADER_LENGTH = 500;
const MAX_BODY_LENGTH = 10_000;
const MAX_NOTIFICATION_EMAILS = 10;

const isPrivateIPv4 = (ip) => {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return true;
  const [a, b] = parts;

  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
};

const isPrivateIPv6 = (ip) => {
  const normalized = ip.toLowerCase();
  return (
    normalized === '::1' ||
    normalized === '::' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe80:')
  );
};

const isPrivateAddress = (address) => {
  const type = net.isIP(address);
  if (type === 4) return isPrivateIPv4(address);
  if (type === 6) return isPrivateIPv6(address);
  return true;
};

const normalizeUrl = async (value) => {
  if (!value || typeof value !== 'string') {
    throw new Error('URL is required');
  }

  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new Error('URL must be a valid absolute URL');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http and https URLs are allowed');
  }

  const hostname = parsed.hostname;
  if (['localhost', 'metadata.google.internal'].includes(hostname.toLowerCase())) {
    throw new Error('Private or internal hostnames are not allowed');
  }

  if (net.isIP(hostname) && isPrivateAddress(hostname)) {
    throw new Error('Private or internal IP addresses are not allowed');
  }

  const records = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!records.length || records.some((record) => isPrivateAddress(record.address))) {
    throw new Error('URL resolves to a private or internal address');
  }

  return parsed.toString();
};

const normalizeHeaders = (value = {}) => {
  if (value == null || value === '') return {};
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Headers must be an object');
  }

  const entries = Object.entries(value);
  if (entries.length > MAX_HEADERS) {
    throw new Error(`Headers cannot exceed ${MAX_HEADERS} entries`);
  }

  return entries.reduce((headers, [key, rawValue]) => {
    const name = String(key).trim();
    const nextValue = String(rawValue ?? '').trim();
    if (!name || /[\r\n:]/.test(name)) {
      throw new Error('Header names must be valid');
    }
    if (nextValue.length > MAX_HEADER_LENGTH) {
      throw new Error(`Header values cannot exceed ${MAX_HEADER_LENGTH} characters`);
    }
    headers[name] = nextValue;
    return headers;
  }, {});
};

const normalizeExpectedStatusCodes = (value) => {
  if (value == null || value === '') return [];
  const list = Array.isArray(value) ? value : String(value).split(',');
  const codes = [...new Set(list.map((item) => Number(item)).filter(Number.isFinite))];
  if (codes.some((code) => code < 100 || code > 599)) {
    throw new Error('Expected status codes must be between 100 and 599');
  }
  return codes;
};

const normalizeEmails = (value) => {
  if (value == null || value === '') return [];
  const list = Array.isArray(value) ? value : String(value).split(',');
  const emails = [...new Set(list.map((item) => String(item).trim().toLowerCase()).filter(Boolean))];
  if (emails.length > MAX_NOTIFICATION_EMAILS) {
    throw new Error(`Notification emails cannot exceed ${MAX_NOTIFICATION_EMAILS}`);
  }
  const invalid = emails.find((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
  if (invalid) {
    throw new Error(`Invalid notification email: ${invalid}`);
  }
  return emails;
};

const clampNumber = (value, fallback, min, max, label) => {
  const number = value == null || value === '' ? fallback : Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new Error(`${label} must be between ${min} and ${max}`);
  }
  return Math.round(number);
};

export const normalizeMonitorInput = async (input = {}, { partial = false } = {}) => {
  const data = {};

  if (!partial || input.url !== undefined) data.url = await normalizeUrl(input.url);
  if (!partial || input.method !== undefined) {
    const method = String(input.method || 'GET').trim().toUpperCase();
    if (!ALLOWED_METHODS.has(method)) {
      throw new Error(`Method must be one of: ${[...ALLOWED_METHODS].join(', ')}`);
    }
    data.method = method;
  }
  if (!partial || input.interval !== undefined) {
    data.interval = clampNumber(input.interval, 60_000, MIN_INTERVAL_MS, MAX_INTERVAL_MS, 'Interval');
  }
  if (!partial || input.timeoutMs !== undefined) {
    data.timeoutMs = clampNumber(input.timeoutMs, 10_000, MIN_TIMEOUT_MS, MAX_TIMEOUT_MS, 'Timeout');
  }
  if (!partial || input.expectedStatusCodes !== undefined) {
    data.expectedStatusCodes = normalizeExpectedStatusCodes(input.expectedStatusCodes);
  }
  if (!partial || input.headers !== undefined) data.headers = normalizeHeaders(input.headers);
  if (!partial || input.body !== undefined) {
    const body = input.body == null
      ? ''
      : typeof input.body === 'string'
        ? input.body
        : JSON.stringify(input.body);
    if (body.length > MAX_BODY_LENGTH) {
      throw new Error(`Body cannot exceed ${MAX_BODY_LENGTH} characters`);
    }
    data.body = body;
  }
  if (!partial || input.responseKeyword !== undefined) {
    data.responseKeyword = input.responseKeyword == null ? '' : String(input.responseKeyword).trim();
  }
  if (!partial || input.notificationEmails !== undefined) {
    data.notificationEmails = normalizeEmails(input.notificationEmails);
  }
  if (!partial || input.publicStatusEnabled !== undefined) {
    data.publicStatusEnabled = input.publicStatusEnabled !== false;
  }
  if (!partial || input.active !== undefined) data.active = input.active !== false;

  return data;
};
