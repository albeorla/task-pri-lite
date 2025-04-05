# API Documentation

## Endpoints

```http
POST /api/v1/tasks
Content-Type: application/json

{
  "title": "Review docs",
  "priority": 2
}
```

## Error Codes
| Code | Meaning | Resolution |
|------|---------|------------|
| 429   | Rate limited | Retry after 60s | 