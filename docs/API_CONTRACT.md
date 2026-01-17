# API Contract Documentation

## Edge Functions

### Guest Chatbot

**Endpoint**: `POST /functions/v1/chatbot`

**Request**:
```typescript
{
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  chatbotSettings?: {
    persona: string;
    greeting_message: string;
    // ... other settings
  };
  conversationContext?: {
    guest_name: string | null;
    preferred_room: string | null;
    check_in_date: string | null;
    check_out_date: string | null;
    guest_count: number | null;
  };
}
```

**Response**: Server-Sent Events (SSE) stream
```
data: {\"content\": \"Halo! \"}
data: {\"content\": \"Selamat datang...\"}
data: [DONE]
```

---

### Admin Chatbot

**Endpoint**: `POST /functions/v1/admin-chatbot`

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Request**:
```typescript
{
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  sessionId?: string;
}
```

**Response**: Server-Sent Events (SSE) stream with tool calls
```
data: {\"content\": \"Checking bookings...\"}
data: {\"tool_call\": {\"name\": \"get_bookings\", \"result\": [...]}}
data: {\"content\": \"Ada 5 booking hari ini.\"}
data: [DONE]
```

**Available Tools**:
- `get_bookings` - Query bookings with filters
- `create_booking` - Create new booking
- `update_booking` - Modify existing booking
- `get_room_availability` - Check room availability
- `get_booking_stats` - Revenue/occupancy statistics
- `send_notification` - Send WhatsApp message

---

### Chatbot Tools

**Endpoint**: `POST /functions/v1/chatbot-tools`

**Request**:
```typescript
{
  tool: string;
  params: Record<string, any>;
}
```

**Tools**:

#### `check_availability`
```typescript
// Request
{ tool: \"check_availability\", params: { room_id: \"uuid\", check_in: \"2024-01-15\", check_out: \"2024-01-17\" }}
// Response
{ available: true, price_per_night: 500000, total_price: 1000000 }
```

#### `get_all_rooms`
```typescript
// Response
[{ id: \"uuid\", name: \"Deluxe Room\", price: 500000, features: [...] }]
```

#### `create_booking_draft`
```typescript
// Request
{ tool: \"create_booking_draft\", params: { room_id: \"uuid\", guest_name: \"John\", ... }}
// Response
{ success: true, booking_code: \"PMH-ABC123\" }
```

---

### Generate Invoice

**Endpoint**: `POST /functions/v1/generate-invoice`

**Request**:
```typescript
{
  bookingId: string;
}
```

**Response**:
```typescript
{
  success: true;
  invoice_url: string;
  whatsapp_message: string;
}
```

---

### Check Room Availability

**Endpoint**: `POST /functions/v1/check-room-availability`

**Request**:
```typescript
{
  room_id: string;
  check_in: string; // YYYY-MM-DD
  check_out: string; // YYYY-MM-DD
}
```

**Response**:
```typescript
{
  available: boolean;
  conflicting_bookings?: Array<{
    booking_code: string;
    check_in: string;
    check_out: string;
  }>;
}
```

---

### Notify New Booking

**Endpoint**: `POST /functions/v1/notify-new-booking`

**Request**:
```typescript
{
  booking_id: string;
}
```

**Response**:
```typescript
{
  success: true;
  whatsapp_sent: boolean;
}
```

---

## Database Tables (Key Tables)

### bookings
```sql
id: uuid
booking_code: text (unique)
room_id: uuid (FK → rooms)
check_in: date
check_out: date
guest_name: text
guest_email: text
guest_phone: text
num_guests: integer
total_price: numeric
total_nights: integer
status: text
payment_status: text
created_at: timestamp
```

### rooms
```sql
id: uuid
name: text
description: text
price: numeric
max_guests: integer
features: text[]
available: boolean
images: text[]
```

### hotel_settings
```sql
id: uuid
hotel_name: text
address: text
phone_primary: text
email_primary: text
check_in_time: text
check_out_time: text
-- ... many more settings
```

## Error Responses

All endpoints return errors in this format:
```typescript
{
  error: string;
  code?: string;
  details?: any;
}
```

Common HTTP status codes:
- `400` - Bad request (invalid params)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not found
- `500` - Internal server error
