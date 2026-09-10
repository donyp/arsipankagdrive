# WhatsApp Invoice Notifications - Implementation Guide

## Overview

**NEW WhatsApp notification system for individual invoice uploads** (in addition to existing bulk Excel system).

**Message Format:**
```
*UPDATE INVOICE ZONA (Zona Name)*

- [PPN] [Konsumen] - Rp 2.930.223
- [PPH] [Ciledug] - Rp 1.500.000

_@adminanka_
```

---

## Components Created

### 1. Backend Handler
**File:** `backend/whatsapp-invoice-notifications.js`
- `generateInvoiceMessage()` - Format single invoice line
- `generateZonaInvoiceMessage()` - Combine invoices into zone message
- `createInvoiceNotifications()` - Create and save notifications
- `getPendingInvoiceNotifications()` - Fetch unsent messages
- `markInvoiceAsSent()` / `markInvoiceBatchAsSent()` - Mark as sent

### 2. Database Table
**File:** `sql/add_whatsapp_invoice_notifications.sql`

Table: `whatsapp_invoice_notifications`
- Stores per-invoice messages
- `invoice_details` (JSONB) - Details: [{tipe, konsumen, nominal}, ...]
- `notification_type` - 'invoice_upload' vs 'excel_upload'
- Grouped by zona, batch_id, created_at

### 3. API Endpoints
**Added to:** `backend/server.js`

- `POST /api/whatsapp/generate-invoice-messages` - Generate messages
- `GET /api/whatsapp/pending-invoice-messages` - Get pending  
- `POST /api/whatsapp/mark-invoice-sent` - Mark single as sent
- `POST /api/whatsapp/mark-invoice-batch-sent` - Mark batch as sent

---

## Setup Instructions

### Step 1: Create Database Table

**In Supabase SQL Editor, run:**

```sql
CREATE TABLE IF NOT EXISTS whatsapp_invoice_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zona_id INTEGER NOT NULL REFERENCES zonas(id),
    moderator_id UUID NOT NULL REFERENCES auth.users(id),
    invoice_count INTEGER NOT NULL,
    invoice_details JSONB DEFAULT '[]',
    message TEXT NOT NULL,
    notification_type TEXT DEFAULT 'invoice_upload',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    batch_id UUID,
    
    CONSTRAINT chk_invoice_count CHECK (invoice_count > 0),
    CONSTRAINT chk_notification_type CHECK (notification_type IN ('invoice_upload', 'excel_upload'))
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_inv_zona_id ON whatsapp_invoice_notifications(zona_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_inv_moderator_id ON whatsapp_invoice_notifications(moderator_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_inv_batch_id ON whatsapp_invoice_notifications(batch_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_inv_sent_at ON whatsapp_invoice_notifications(sent_at) WHERE sent_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_whatsapp_inv_type ON whatsapp_invoice_notifications(notification_type);
```

### Step 2: Deploy Code

Already deployed to production. Just need database table (Step 1).

### Step 3: Integration with Upload Pages

For each upload page that handles individual invoices, add after successful upload:

```javascript
// After upload success
const invoices = [
    { zona_id: 1, tipe: 'PPN', konsumen: 'PT ABC', nominal: 2930223 },
    { zona_id: 1, tipe: 'PPH', konsumen: 'PT XYZ', nominal: 1500000 }
];

const batchId = 'batch_' + Date.now();

// Call API
const response = await fetch('/api/whatsapp/generate-invoice-messages', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ invoices, batchId })
});

const result = await response.json();
if (result.success) {
    // Display notifications (similar to Excel system)
    displayInvoiceNotifications(result.notifications);
}
```

---

## Message Generation Examples

### Input:
```json
{
    "invoices": [
        { "zona_id": 1, "tipe": "PPN", "konsumen": "CILEDUG", "nominal": 2930223 },
        { "zona_id": 1, "tipe": "PPH", "konsumen": "PT ABC", "nominal": 1500000 },
        { "zona_id": 2, "tipe": "PPN", "konsumen": "JAKARTA", "nominal": 5000000 }
    ]
}
```

### Output Messages:

**Zona 1 (Bekasi):**
```
*UPDATE INVOICE ZONA (Bekasi)*

- [PPN] CILEDUG - Rp 2.930.223
- [PPH] PT ABC - Rp 1.500.000

_@adminanka_
```

**Zona 2 (Jakarta):**
```
*UPDATE INVOICE ZONA (Jakarta)*

- [PPN] JAKARTA - Rp 5.000.000

_@adminanka_
```

---

## Database Structure

### Column Details:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| zona_id | INTEGER | Foreign key to zonas table |
| moderator_id | UUID | Moderator who uploaded |
| invoice_count | INTEGER | Number of invoices |
| invoice_details | JSONB | `[{tipe, konsumen, nominal}, ...]` |
| message | TEXT | Pre-formatted WhatsApp message |
| notification_type | TEXT | 'invoice_upload' or 'excel_upload' |
| created_at | TIMESTAMP | When message was created |
| sent_at | TIMESTAMP | When moderator marked as sent (NULL if pending) |
| batch_id | UUID | Groups related uploads |

### Query Examples:

```sql
-- Get pending invoice messages
SELECT zona_id, invoice_count, message, created_at
FROM whatsapp_invoice_notifications
WHERE sent_at IS NULL
  AND notification_type = 'invoice_upload'
ORDER BY created_at DESC;

-- Get messages by moderator
SELECT * FROM whatsapp_invoice_notifications
WHERE moderator_id = 'user-uuid'
ORDER BY created_at DESC;

-- Get messages by batch
SELECT * FROM whatsapp_invoice_notifications
WHERE batch_id = 'batch-id'
ORDER BY zona_id;
```

---

## API Request/Response Examples

### Generate Invoice Messages

**Request:**
```bash
POST /api/whatsapp/generate-invoice-messages
Authorization: Bearer {token}
Content-Type: application/json

{
    "invoices": [
        {
            "zona_id": 1,
            "tipe": "PPN",
            "konsumen": "CILEDUG",
            "nominal": 2930223
        }
    ],
    "batchId": "batch_1694246400"
}
```

**Response:**
```json
{
    "success": true,
    "message": "Generated 1 WhatsApp messages for 1 zonas",
    "notifications": {
        "Bekasi": {
            "zona_id": 1,
            "zona_name": "Bekasi",
            "invoice_count": 1,
            "message": "*UPDATE INVOICE ZONA (Bekasi)*\n\n- [PPN] CILEDUG - Rp 2.930.223\n\n_@adminanka_",
            "invoices": [...]
        }
    }
}
```

### Mark Batch as Sent

**Request:**
```bash
POST /api/whatsapp/mark-invoice-batch-sent
Authorization: Bearer {token}
Content-Type: application/json

{
    "batchId": "batch_1694246400"
}
```

**Response:**
```json
{
    "success": true,
    "message": "Marked 1 invoice notifications as sent"
}
```

---

## Frontend Integration Template

For any invoice upload page, add this to the success handler:

```javascript
// After file upload success
async function handleInvoiceUploadSuccess(uploadedInvoices) {
    try {
        const batchId = 'batch_' + Date.now();
        
        // Call WhatsApp API
        const response = await fetch('/api/whatsapp/generate-invoice-messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({
                invoices: uploadedInvoices, // [{zona_id, tipe, konsumen, nominal}, ...]
                batchId: batchId
            })
        });

        const result = await response.json();

        if (result.success) {
            // Show success message
            Toast.success(`✅ ${Object.keys(result.notifications).length} zona ready untuk WhatsApp!`);
            
            // Display messages to user
            displayInvoiceNotifications(result.notifications, batchId);
        } else {
            console.error('WhatsApp generation failed:', result.error);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Display function
function displayInvoiceNotifications(notifications, batchId) {
    // Show panel with messages
    // Each zone gets copy button
    // Mark all as sent button when done
}
```

---

## Troubleshooting

### Issue: Database table error

**Solution:** Run the SQL creation query from Step 1

### Issue: API returns 400 "Invalid invoices array"

**Solution:** Ensure invoices array has:
- zona_id (number)
- tipe (string, e.g., "PPN", "PPH")
- konsumen (string)
- nominal (number)

### Issue: Messages don't format correctly

**Solution:** Check:
- Nominal values are numbers (not strings)
- Tipe is capitalized (PPN, PPH)
- Konsumen name is not null

---

## Testing

### Manual Test:

1. Create test invoice data:
   ```json
   {
       "zona_id": 1,
       "tipe": "PPN",
       "konsumen": "TEST",
       "nominal": 1000000
   }
   ```

2. Call API:
   ```bash
   curl -X POST http://localhost:3000/api/whatsapp/generate-invoice-messages \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "invoices": [...],
       "batchId": "test_batch"
     }'
   ```

3. Verify in database:
   ```sql
   SELECT * FROM whatsapp_invoice_notifications 
   WHERE batch_id = 'test_batch';
   ```

---

## Next: Frontend Implementation

This backend is ready. Next step is to integrate with individual invoice upload pages (upload-invoice-pdf.html, upload-bukti-bayar.html, etc.).

Each page needs to:
1. Collect invoice data (zona_id, tipe, konsumen, nominal)
2. Call `/api/whatsapp/generate-invoice-messages` after upload
3. Display notifications panel with copy/send buttons
4. Call `/api/whatsapp/mark-invoice-batch-sent` when done

