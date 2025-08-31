# New-feature API Documentation

**Generated on**: 2025-08-24  
**Version**: 1.0  
**Base URL**: `/api/new-feature`  

## Overview

The New-feature API provides endpoints for managing new-feature resources. All endpoints require authentication and implement Row Level Security (RLS) to ensure users can only access their own data.

## Authentication

All API endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

Tokens are obtained through the Supabase authentication system.

## Data Models



## Service Methods

### new-featureService



## REST API Endpoints


### GET /api/new-feature

Retrieve a paginated list of new-feature items for the authenticated user

**Authentication:** Bearer Token Required


**Parameters:**
- **limit** (number, optional): Maximum number of items to return (default: 50)
- **offset** (number, optional): Number of items to skip (default: 0)
- **order** (string, optional): Sort order: asc|desc (default: desc)




**Responses:**

- **200**: Success
  ```json
  { data: New-feature[], count: number, hasMore: boolean }
  ```
- **401**: Unauthorized - Invalid or missing token

- **500**: Internal Server Error



### POST /api/new-feature

Create a new new-feature item for the authenticated user

**Authentication:** Bearer Token Required




**Request Body:**
```json
{
  "name": "Sample new-feature",
  "description": "Optional description"
}
```

**Schema:** `CreateNew-featureData`


**Responses:**

- **201**: Created successfully
  ```json
  { data: New-feature }
  ```
- **400**: Bad Request - Invalid data

- **401**: Unauthorized

- **422**: Validation Error



### GET /api/new-feature/{id}

Retrieve a single new-feature item by ID

**Authentication:** Bearer Token Required + Ownership


**Parameters:**
- **id** (string, required): Unique identifier of the item




**Responses:**

- **200**: Success
  ```json
  { data: New-feature }
  ```
- **401**: Unauthorized

- **403**: Forbidden - Not the owner

- **404**: Not Found



### PUT /api/new-feature/{id}

Update an existing new-feature item

**Authentication:** Bearer Token Required + Ownership


**Parameters:**
- **id** (string, required): Unique identifier of the item



**Request Body:**
```json
{
  "name": "Updated name"
}
```

**Schema:** `UpdateNew-featureData`


**Responses:**

- **200**: Updated successfully
  ```json
  { data: New-feature }
  ```
- **400**: Bad Request

- **403**: Forbidden

- **404**: Not Found



### DELETE /api/new-feature/{id}

Permanently delete a new-feature item

**Authentication:** Bearer Token Required + Ownership


**Parameters:**
- **id** (string, required): Unique identifier of the item




**Responses:**

- **200**: Deleted successfully
  ```json
  { success: true }
  ```
- **403**: Forbidden

- **404**: Not Found



## Real-time Updates

### Channel: `new-feature_changes_{user_id}`


#### INSERT Event

Triggered when a new new-feature is created

**Payload:**
```json
{ eventType: 'INSERT', new: New-feature, old: null }
```


#### UPDATE Event

Triggered when a new-feature is updated

**Payload:**
```json
{ eventType: 'UPDATE', new: New-feature, old: New-feature }
```


#### DELETE Event

Triggered when a new-feature is deleted

**Payload:**
```json
{ eventType: 'DELETE', new: null, old: New-feature }
```


**Connection:** WebSocket connection to Supabase Realtime  
**Filters:** `user_id=eq.{authenticated_user_id}`

## Code Examples

### JavaScript/TypeScript

#### Creating a New-feature
```typescript
// Create a new new-feature
const newNew-feature = await new-featureService.create({
  name: "My New-feature",
  description: "Optional description"
});

console.log("Created:", newNew-feature);
```

#### Reading a New-feature
```typescript
// Get a specific new-feature
const new-feature = await new-featureService.read("uuid-here");

if (new-feature) {
  console.log("Found:", new-feature);
} else {
  console.log("New-feature not found");
}
```

#### Updating a New-feature
```typescript
// Update a new-feature
const updatedNew-feature = await new-featureService.update("uuid-here", {
  name: "Updated name"
});

console.log("Updated:", updatedNew-feature);
```

#### Deleting a New-feature
```typescript
// Delete a new-feature
await new-featureService.delete("uuid-here");
console.log("Deleted successfully");
```

#### Listing New-features
```typescript
// List all new-features
const new-features = await new-featureService.list();
console.log("Total:", new-features.length);
```

#### Real-time Subscription
```typescript
// Subscribe to real-time changes
const channel = new-featureService.subscribeToChanges(userId, (payload) => {
  switch(payload.eventType) {
    case 'INSERT':
      console.log('New new-feature:', payload.new);
      break;
    case 'UPDATE':
      console.log('Updated new-feature:', payload.new);
      break;
    case 'DELETE':
      console.log('Deleted new-feature:', payload.old);
      break;
  }
});

// Don't forget to unsubscribe
// channel.unsubscribe();
```

### React Hook Usage
```tsx
// Using the custom hook
import { useNew-feature } from '../hooks/useNew-feature';

function New-featureList() {
  const { data, loading, error, create, update, delete: remove } = useNew-feature();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const handleCreate = async () => {
    try {
      await create({ name: "New New-feature" });
    } catch (err) {
      console.error("Creation failed:", err);
    }
  };

  return (
    <div>
      <button onClick={handleCreate}>Create New-feature</button>
      
      {data.map(item => (
        <div key={item.id}>
          <span>{item.name}</span>
          <button onClick={() => update(item.id, { name: item.name + " (updated)" })}>
            Update
          </button>
          <button onClick={() => remove(item.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
```

### cURL Examples
```bash
# Create a new new-feature
curl -X POST "http://localhost:3000/api/new-feature" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test New-feature", "description": "Test description"}'

# Get all new-features
curl -X GET "http://localhost:3000/api/new-feature" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Update a new-feature
curl -X PUT "http://localhost:3000/api/new-feature/uuid-here" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated name"}'

# Delete a new-feature
curl -X DELETE "http://localhost:3000/api/new-feature/uuid-here" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Error Handling

All API endpoints follow consistent error response patterns:

### Client Errors (4xx)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Detailed error message",
    "details": {
      "field": "name",
      "issue": "required"
    }
  }
}
```

### Server Errors (5xx)
```json
{
  "error": {
    "code": "INTERNAL_ERROR", 
    "message": "An unexpected error occurred",
    "requestId": "uuid-here"
  }
}
```

## Rate Limiting

- **Rate Limit:** 100 requests per minute per user
- **Headers:** 
  - `X-RateLimit-Limit`: Maximum requests per window
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: Time when the current window resets

## Security

### Row Level Security (RLS)
All database operations are protected by RLS policies that ensure:
- Users can only access their own new-feature records
- Authentication is verified for every request
- Ownership is validated for update/delete operations

### Data Validation
- Input sanitization prevents XSS attacks
- Schema validation ensures data integrity
- Business rule validation enforces constraints

### Audit Logging
All mutations are logged with:
- User ID and timestamp
- Operation type (CREATE/UPDATE/DELETE)
- Changed fields and values
- IP address and user agent

## Support

For issues or questions regarding this API:
- Check the [troubleshooting guide](./troubleshooting.md)
- Review [common patterns](./patterns.md)
- Contact the development team

---

**Generated by SuperClaude Document Command**  
**Last Updated:** 2025-08-24T06:43:06.518Z
