# Backend Architecture - Quick Reference

## 🎯 Core Concept

**Smart Website Monitoring System** jo websites ko monitor karta hai, failures detect karta hai, AI se analyze karta hai, aur intelligent email alerts bhejta hai.

---

## 🔄 Complete Flow (Step by Step)

### 1️⃣ User Creates Monitor
```
User → Frontend → POST /monitors → Backend → MongoDB
```
**Data Saved:**
```json
{
  "url": "https://example.com",
  "method": "GET",
  "interval": 60000,  // 60 seconds
  "active": true,
  "userId": "user123"
}
```

---

### 2️⃣ Scheduler Picks Up Monitor
**File:** `monitor.scheduler.js`
**Runs:** Every 5 seconds

```javascript
// Pseudo-code
every 5 seconds:
  monitors = getActiveMonitors()
  for each monitor:
    if (time_elapsed >= monitor.interval):
      add_job_to_queue(monitor)
```

---

### 3️⃣ BullMQ Queue Receives Job
**File:** `monitor.queue.js`
**Queue Name:** `monitor-queue`

```javascript
monitorQueue.add('check-url', {
  monitorId: "abc123",
  url: "https://example.com",
  method: "GET"
}, {
  attempts: 3,  // Retry 3 times
  backoff: { type: 'exponential', delay: 2000 }
});
```

---

### 4️⃣ Worker Executes HTTP Check
**File:** `monitor.worker.js`
**Concurrency:** 5 parallel jobs

```javascript
// Pseudo-code
receive_job():
  start_time = now()
  try:
    response = axios.get(url, timeout=5000)
    latency = now() - start_time
    save_log(success=true, latency, status=200)
    handleSuccess(monitorId)
  catch error:
    save_log(success=false, latency=0, status=500)
    handleFailure(monitorId)
```

**Log Saved to MongoDB:**
```json
{
  "monitorId": "abc123",
  "status": 200,
  "responseTime": 245,
  "success": true,
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

### 5️⃣ Incident Detection (After 3 Failures)
**File:** `incident.processor.js`

```javascript
// In-memory failure counter
failureMap = { "abc123": 3 }

if (failCount >= 3):
  incident = createIncident({
    monitorId: "abc123",
    failCount: 3,
    message: "Monitor failed 3 times"
  })
  
  // Trigger AI analysis
  processIncident(incident)
  
  // Send alert
  triggerAlert(incident)
```

**Incident Saved:**
```json
{
  "monitorId": "abc123",
  "status": "OPEN",
  "message": "Monitor failed 3 times",
  "failCount": 3,
  "startedAt": "2024-01-15T10:30:00Z"
}
```

---

### 6️⃣ AI Analysis (Google Gemini)
**File:** `incident.processor.ai.js`

**Step 1: Build Prompt**
```javascript
// Get context
monitor = getMonitor(monitorId)
logs = getRecentLogs(monitorId, limit=10)

prompt = `
You are an uptime monitoring AI.

URL: ${monitor.url}
Method: ${monitor.method}

Recent Logs:
${logs.map(l => `Status: ${l.status}, Latency: ${l.responseTime}ms`).join('\n')}

Incident: Monitor failed 3 times

Analyze and respond in JSON:
{
  "status": "CRITICAL/WARNING/INFO",
  "reason": "Root cause analysis",
  "suggestion": "Fix recommendations"
}
`
```

**Step 2: Call Gemini API**
```javascript
response = axios.post(
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
  { contents: [{ parts: [{ text: prompt }] }] },
  { headers: { 'x-goog-api-key': GEMINI_API_KEY } }
)
```

**Step 3: Parse Response**
```javascript
aiResponse = {
  "status": "CRITICAL",
  "reason": "Server returning 503 errors consistently",
  "suggestion": [
    "Check if server is running",
    "Verify database connections",
    "Review server logs"
  ]
}
```

**Step 4: Save AI Insight**
```json
{
  "monitorId": "abc123",
  "incidentId": "incident123",
  "status": "CRITICAL",
  "reason": "Server returning 503 errors consistently",
  "suggestion": [
    "Check if server is running",
    "Verify database connections",
    "Review server logs"
  ],
  "createdAt": "2024-01-15T10:30:05Z"
}
```

---

### 7️⃣ Email Alert (with AI Insights)
**File:** `alert.service.js` + `email.service.js`

**Email Content:**
```
Subject: 🚨 Website Down (CRITICAL)

Body:
🚨 WEBSITE ALERT

🔗 Monitor ID: abc123
❌ Failures: 3

🧠 AI ANALYSIS
Status: CRITICAL

Reason:
Server returning 503 errors consistently

Suggestions:
1. Check if server is running
2. Verify database connections
3. Review server logs
```

**Sent via Gmail (Nodemailer):**
```javascript
nodemailer.sendMail({
  from: ALERT_EMAIL,
  to: recipient,
  subject: "🚨 Website Down (CRITICAL)",
  text: emailBody
})
```

**Alert Record Saved:**
```json
{
  "monitorId": "abc123",
  "incidentId": "incident123",
  "type": "EMAIL",
  "status": "SENT",
  "message": "Email body...",
  "ai": {
    "status": "CRITICAL",
    "reason": "...",
    "suggestion": ["..."]
  },
  "createdAt": "2024-01-15T10:30:10Z"
}
```

---

### 8️⃣ Incident Resolution (On Success)
**File:** `incident.processor.js`

```javascript
handleSuccess(monitorId):
  if (failureMap[monitorId] >= 3):
    // Had incident, now resolved
    resolveIncident(monitorId)
  
  // Reset counter
  failureMap[monitorId] = 0
```

**Incident Updated:**
```json
{
  "status": "RESOLVED",
  "resolvedAt": "2024-01-15T11:00:00Z"
}
```

---

## 📊 Data Flow Diagram

```
┌─────────────┐
│   User      │
│  (Frontend) │
└──────┬──────┘
       │ POST /monitors
       ▼
┌─────────────────────────────────────────┐
│         Express.js Server               │
│  ┌────────────────────────────────┐    │
│  │  Monitor Controller            │    │
│  │  - Create monitor              │    │
│  │  - Save to MongoDB             │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│         MongoDB                         │
│  Collection: monitors                   │
│  { url, method, interval, active }      │
└─────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│    Monitor Scheduler (Every 5s)         │
│  - Fetch active monitors                │
│  - Check if interval elapsed            │
│  - Add job to queue                     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         Redis (BullMQ Queue)            │
│  Queue: monitor-queue                   │
│  Job: { monitorId, url, method }        │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│    BullMQ Worker (5 concurrent)         │
│  - Execute HTTP request                 │
│  - Measure latency                      │
│  - Save log to MongoDB                  │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴───────┐
       │               │
    SUCCESS         FAILURE
       │               │
       ▼               ▼
┌─────────────┐  ┌─────────────────────────┐
│ handleSuccess│  │ handleFailure           │
│ - Reset count│  │ - Increment counter     │
│ - Resolve    │  │ - If count >= 3:        │
│   incident   │  │   * Create incident     │
└─────────────┘  │   * Trigger AI          │
                 │   * Send alert          │
                 └──────────┬──────────────┘
                            │
                            ▼
                 ┌─────────────────────────┐
                 │  AI Processor           │
                 │  - Build prompt         │
                 │  - Call Gemini API      │
                 │  - Parse response       │
                 │  - Save AI insight      │
                 └──────────┬──────────────┘
                            │
                            ▼
                 ┌─────────────────────────┐
                 │  Alert Service          │
                 │  - Format email         │
                 │  - Include AI insights  │
                 │  - Send via Gmail       │
                 │  - Save alert record    │
                 └─────────────────────────┘
```

---

## 🗄 Database Collections

### 1. **users**
```javascript
{
  _id: ObjectId,
  name: "John Doe",
  email: "john@example.com",
  password: "$2a$10$...",  // bcrypt hash
  role: "user",
  refreshToken: "jwt_token...",
  createdAt: Date,
  updatedAt: Date
}
```

### 2. **monitors**
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  url: "https://example.com",
  method: "GET",
  interval: 60000,  // ms
  active: true,
  createdAt: Date,
  updatedAt: Date
}
```
**Index:** `{ active: 1 }`

### 3. **logs** (TTL: 7 days)
```javascript
{
  _id: ObjectId,
  monitorId: ObjectId,
  status: 200,
  responseTime: 245,  // ms
  success: true,
  createdAt: Date
}
```
**Indexes:**
- `{ monitorId: 1, createdAt: -1 }`
- `{ createdAt: 1 }` (TTL: 7 days)

### 4. **incidents**
```javascript
{
  _id: ObjectId,
  monitorId: ObjectId,
  status: "OPEN",  // or "RESOLVED"
  message: "Monitor failed 3 times",
  failCount: 3,
  startedAt: Date,
  resolvedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### 5. **aiinsights**
```javascript
{
  _id: ObjectId,
  monitorId: ObjectId,
  incidentId: ObjectId,
  status: "CRITICAL",
  reason: "Server returning 503 errors",
  suggestion: [
    "Check if server is running",
    "Verify database connections"
  ],
  createdAt: Date,
  updatedAt: Date
}
```

### 6. **alerts**
```javascript
{
  _id: ObjectId,
  monitorId: ObjectId,
  incidentId: ObjectId,
  type: "EMAIL",
  status: "SENT",
  message: "Email body...",
  ai: {
    status: "CRITICAL",
    reason: "...",
    suggestion: ["..."]
  },
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔑 Key Technologies & Why

| Technology | Purpose | Why This? |
|------------|---------|-----------|
| **Express.js** | Web framework | Fast, minimal, widely used |
| **MongoDB** | Database | Flexible schema, good for logs |
| **Mongoose** | ODM | Schema validation, middleware |
| **Redis** | Queue storage | Fast, persistent, reliable |
| **BullMQ** | Job queue | Retry logic, concurrency, monitoring |
| **JWT** | Authentication | Stateless, secure, scalable |
| **bcrypt** | Password hashing | Industry standard, secure |
| **Axios** | HTTP client | Promise-based, timeout support |
| **Nodemailer** | Email service | Gmail integration, easy setup |
| **Google Gemini** | AI analysis | Free tier, fast, accurate |
| **cookie-parser** | Cookie handling | HTTP-only cookies for security |
| **CORS** | Cross-origin | Frontend-backend communication |

---

## ⚡ Performance Features

### 1. **MongoDB Indexes**
- Fast queries on `active` monitors
- Efficient log aggregation with compound index
- Auto-delete old logs with TTL index

### 2. **BullMQ Concurrency**
- 5 parallel workers
- Non-blocking job processing
- Automatic retries with exponential backoff

### 3. **Redis Caching**
- Fast job queue
- Persistent storage
- Connection pooling

### 4. **DNS Optimization**
```javascript
dns.setServers(["1.1.1.1", "8.8.8.8"])  // Cloudflare, Google
```

### 5. **Log TTL (Time To Live)**
- Auto-delete logs after 7 days
- Prevents database bloat
- Maintains performance

---

## 🔒 Security Features

### 1. **HTTP-only Cookies**
```javascript
res.cookie("accessToken", token, {
  httpOnly: true,      // Prevents XSS
  secure: true,        // HTTPS only
  sameSite: "none",    // Cross-origin support
  maxAge: 3600000      // 1 hour
});
```

### 2. **Password Hashing**
```javascript
const hashedPassword = await bcrypt.hash(password, 10);
```

### 3. **JWT Expiration**
- Access token: 1 hour
- Refresh token: 7 days

### 4. **CORS Whitelist**
```javascript
const allowedOrigins = process.env.FRONTEND_URL.split(',');
```

### 5. **User-specific Data**
```javascript
// Only fetch user's own monitors
const monitors = await Monitor.find({ userId: req.user.userId });
```

---

## 🚀 Deployment Checklist

- [ ] MongoDB Atlas cluster created
- [ ] Upstash Redis database created
- [ ] Gmail App Password generated
- [ ] Gemini API key obtained
- [ ] Environment variables configured on Render
- [ ] Frontend URL added to CORS whitelist
- [ ] DNS servers configured
- [ ] Health check endpoint working (`GET /`)

---

## 📝 Quick Commands

```bash
# Install dependencies
npm install

# Start development server
npm start

# Test health endpoint
curl http://localhost:3000/

# Create monitor (with auth)
curl -X POST http://localhost:3000/monitors \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=YOUR_TOKEN" \
  -d '{"url":"https://example.com","method":"GET","interval":60000}'

# Get analytics
curl http://localhost:3000/logs/analytics/MONITOR_ID \
  -H "Cookie: accessToken=YOUR_TOKEN"
```

---

**Complete backend architecture documented! 🎉**
