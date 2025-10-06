# API Documentation

## Base URL

```
http://localhost:3001/api
```

## Authentication

Currently, authentication is not enforced in the MVP. JWT authentication will be added in Phase 2.

## Common Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message",
  "timestamp": "2025-10-06T11:30:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2025-10-06T11:30:00.000Z"
}
```

## Endpoints

### Health Check

#### GET /health
Check API health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-06T11:30:00.000Z",
  "services": {
    "api": "running",
    "mongodb": "connected",
    "redis": "connected"
  },
  "uptime": 12345.67
}
```

---

### Meeting Requests

#### GET /requests
List all meeting requests with pagination and filters.

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20, max: 100)
- `status` (string: pending | qualified | rejected | scheduled | completed | cancelled)
- `meetingType` (string)
- `companyTier` (string)
- `sortBy` (string, default: submittedAt)
- `sortOrder` (string: asc | desc, default: desc)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "req_0001",
      "companyName": "TechCorp Industries",
      "contactName": "John Doe",
      "contactEmail": "john@techcorp.com",
      "meetingType": "strategic",
      "status": "pending",
      "importanceScore": 85,
      "submittedAt": "2025-10-01T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 120,
    "totalPages": 6
  }
}
```

#### GET /requests/:id
Get a single meeting request by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "req_0001",
    "companyName": "TechCorp Industries",
    "companyTier": "tier_1",
    "contactName": "John Doe",
    "contactEmail": "john@techcorp.com",
    "meetingType": "strategic",
    "requestedTopics": ["AI Strategy", "Quantum Computing"],
    "status": "qualified",
    "importanceScore": 85,
    "qualificationReason": "High strategic value company",
    "submittedAt": "2025-10-01T10:00:00.000Z"
  }
}
```

#### POST /requests
Create a new meeting request.

**Request Body:**
```json
{
  "companyName": "New Company Inc",
  "contactName": "Jane Smith",
  "contactEmail": "jane@newcompany.com",
  "contactPhone": "+1234567890",
  "meetingType": "sales",
  "requestedTopics": ["Product Demo", "Pricing"],
  "preferredDates": ["2025-11-15", "2025-11-16"],
  "urgency": "high"
}
```

#### PUT /requests/:id
Update a meeting request.

#### DELETE /requests/:id
Delete a meeting request.

#### POST /requests/bulk
Bulk create meeting requests.

**Request Body:**
```json
[
  { "companyName": "...", "contactEmail": "...", ... },
  { "companyName": "...", "contactEmail": "...", ... }
]
```

---

### Hosts

#### GET /hosts
List all hosts with pagination.

**Query Parameters:**
- `page` (number)
- `limit` (number)
- `isActive` (boolean)
- `department` (string)

#### GET /hosts/:id
Get a single host by ID.

#### POST /hosts
Create a new host.

**Request Body:**
```json
{
  "name": "Dr. Sarah Johnson",
  "email": "sarah@company.com",
  "role": "VP of Engineering",
  "department": "Engineering",
  "expertise": ["AI", "Cloud Architecture"],
  "maxMeetingsPerDay": 6,
  "preferredMeetingTypes": ["technical", "strategic"],
  "availability": [
    {
      "date": "2025-11-15",
      "timeSlots": [
        { "date": "2025-11-15", "startTime": "09:00", "endTime": "10:00" },
        { "date": "2025-11-15", "startTime": "14:00", "endTime": "15:00" }
      ]
    }
  ]
}
```

#### PUT /hosts/:id
Update a host.

#### DELETE /hosts/:id
Delete a host.

#### POST /hosts/bulk
Bulk create hosts.

---

### Qualification

#### POST /qualification/qualify/:id
Qualify a single meeting request.

**Response:**
```json
{
  "success": true,
  "data": {
    "request": { ... },
    "qualification": {
      "requestId": "req_0001",
      "isQualified": true,
      "importanceScore": 85,
      "reason": "High strategic value, relevant topics",
      "confidence": 0.92,
      "fraudScore": 0.05,
      "isDuplicate": false,
      "processingTimeMs": 1250
    }
  }
}
```

#### POST /qualification/qualify-batch
Qualify multiple requests in batch.

**Request Body:**
```json
{
  "requestIds": ["req_0001", "req_0002", "req_0003"]
}
```

#### GET /qualification/stats
Get qualification statistics.

---

### Scheduling

#### POST /schedule/optimize
Run the scheduler optimization algorithm.

**Request Body:**
```json
{
  "requestIds": ["req_0001", "req_0002"],
  "constraints": {
    "eventStartDate": "2025-11-15",
    "eventEndDate": "2025-11-19",
    "workingHoursStart": "09:00",
    "workingHoursEnd": "18:00",
    "meetingDurationMinutes": 30,
    "maxMeetingsPerDay": 8,
    "bufferMinutes": 15
  },
  "algorithm": "hybrid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "assignments": [
      {
        "requestId": "req_0001",
        "hostId": "host_001",
        "timeSlot": {
          "date": "2025-11-15",
          "startTime": "09:00",
          "endTime": "09:30",
          "hostId": "host_001"
        },
        "score": 95,
        "explanation": "Assigned to Dr. Johnson (Score: 95). Host expertise matches. Preferred date available."
      }
    ],
    "unscheduled": [],
    "metrics": {
      "totalRequests": 2,
      "scheduledCount": 2,
      "unscheduledCount": 0,
      "totalImportanceScore": 170,
      "averageHostUtilization": 0.65,
      "constraintViolations": 0
    },
    "algorithm": "hybrid",
    "computationTimeMs": 2500
  }
}
```

#### POST /schedule/assign
Manually assign a meeting to a host and time slot.

**Request Body:**
```json
{
  "requestId": "req_0001",
  "hostId": "host_001",
  "timeSlot": {
    "date": "2025-11-15",
    "startTime": "09:00",
    "endTime": "09:30"
  },
  "location": "Conference Room A",
  "meetingLink": "https://meet.example.com/abc123"
}
```

#### GET /schedule
Get all scheduled meetings.

**Query Parameters:**
- `date` (string: YYYY-MM-DD)
- `hostId` (string)
- `status` (string: confirmed | tentative | cancelled)

#### GET /schedule/:id
Get a single scheduled meeting.

#### PUT /schedule/:id
Update a scheduled meeting.

#### DELETE /schedule/:id
Cancel a scheduled meeting.

---

### Workflow

#### POST /workflow/materials/:meetingId
Generate materials for a meeting.

**Request Body:**
```json
{
  "includeCompanyResearch": true,
  "includeAgenda": true,
  "includePresentation": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "meetingId": "meeting_001",
    "briefingDocument": "# Meeting Briefing\n...",
    "agenda": [
      "Introductions (5 min)",
      "Company overview (10 min)",
      "Discussion (20 min)"
    ],
    "companyResearch": "Research content...",
    "status": "completed",
    "generatedAt": "2025-10-06T11:30:00.000Z"
  }
}
```

#### POST /workflow/follow-up/:meetingId
Send follow-up email after a meeting.

**Request Body:**
```json
{
  "meetingNotes": "Great discussion about...",
  "actionItems": [
    "Share technical documentation",
    "Schedule follow-up call"
  ],
  "nextSteps": [
    "Review proposal",
    "Internal discussion"
  ]
}
```

#### POST /workflow/export
Export schedule to Excel.

**Request Body:**
```json
{
  "date": "2025-11-15",
  "hostId": "host_001"
}
```

**Response:** Binary Excel file download

#### GET /workflow/status/:meetingId
Get workflow status for a meeting.

**Response:**
```json
{
  "success": true,
  "data": {
    "meetingId": "meeting_001",
    "materialsGenerated": true,
    "followUpSent": false,
    "status": "confirmed"
  }
}
```

---

## WebSocket Events

Connect to WebSocket server at `ws://localhost:3001`

### Events from Server

#### schedule:update
Emitted when a meeting is assigned, updated, or cancelled.

```json
{
  "type": "assignment",
  "data": {
    "id": "meeting_001",
    "requestId": "req_0001",
    "hostId": "host_001",
    "timeSlot": { ... }
  }
}
```

#### qualification:complete
Emitted when a qualification request completes.

```json
{
  "requestId": "req_0001",
  "result": {
    "isQualified": true,
    "importanceScore": 85,
    "reason": "..."
  }
}
```

### Events from Client

#### subscribe
Subscribe to a specific room for updates.

```json
{
  "room": "schedule"
}
```

#### unsubscribe
Unsubscribe from a room.

---

## Rate Limiting

- **Default**: 100 requests per 15 minutes
- **Scheduler**: 10 requests per 15 minutes
- **GenAI**: 20 requests per 15 minutes

Rate limit info is included in response headers:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

---

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Invalid request data |
| `NOT_FOUND` | Resource not found |
| `AUTHENTICATION_ERROR` | Authentication required |
| `AUTHORIZATION_ERROR` | Insufficient permissions |
| `DUPLICATE_ERROR` | Resource already exists |
| `SCHEDULER_ERROR` | Scheduling optimization failed |
| `GENAI_ERROR` | GenAI service error |
| `WORKFLOW_ERROR` | Workflow execution failed |
| `INTERNAL_ERROR` | Internal server error |
| `RATE_LIMIT_EXCEEDED` | Too many requests |

---

## Examples

### Complete Workflow Example

```bash
# 1. Create a meeting request
curl -X POST http://localhost:3001/api/requests \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Example Corp",
    "contactEmail": "contact@example.com",
    "meetingType": "strategic",
    "requestedTopics": ["AI Strategy"]
  }'

# 2. Qualify the request
curl -X POST http://localhost:3001/api/qualification/qualify/req_0001

# 3. Run scheduler optimization
curl -X POST http://localhost:3001/api/schedule/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "requestIds": ["req_0001"],
    "constraints": { ... }
  }'

# 4. Generate materials
curl -X POST http://localhost:3001/api/workflow/materials/meeting_001 \
  -H "Content-Type: application/json" \
  -d '{ "includeAgenda": true }'

# 5. Send follow-up
curl -X POST http://localhost:3001/api/workflow/follow-up/meeting_001 \
  -H "Content-Type: application/json" \
  -d '{ "actionItems": ["Follow up next week"] }'
```

---

For more examples and integration guides, see the [Integration Documentation](./INTEGRATIONS.md).
