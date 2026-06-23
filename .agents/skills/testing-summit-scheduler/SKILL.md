---
name: testing-summit-scheduler
description: Test Summit Scheduler end-to-end. Use when verifying UI, auth, RBAC, scheduling, or portal changes.
---

# Testing Summit Scheduler

## Prerequisites

### Devin Secrets Needed
- `SUPABASE_DB_URL` - Supabase project URL (e.g. ${SUPABASE_DB_URL})
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin operations (creating test users)
- `SUPABASE_ACCESS_TOKEN` - Supabase management API token (for fetching anon key)

### Environment Setup
```bash
# Get the anon key from Supabase API
curl -s "https://api.supabase.com/v1/projects/<PROJECT_ID>/api-keys" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" | jq '.[0].api_key'

# Create .env file
echo "VITE_SUPABASE_URL=$SUPABASE_DB_URL" > .env
echo "VITE_SUPABASE_ANON_KEY=<anon_key_from_above>" >> .env

# Install and start dev server
npm install
npm run dev -- --host
```

## Creating Test Users

The app requires users in both Supabase Auth AND the `ss_users` table.

```bash
# 1. Create auth user
USER_ID=$(curl -s -X POST "$SUPABASE_DB_URL/auth/v1/admin/users" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "TestPass123!", "email_confirm": true}' \
  | jq -r '.id')

# 2. Insert into ss_users with role
curl -s -X POST "$SUPABASE_DB_URL/rest/v1/ss_users" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"id\": \"$USER_ID\", \"name\": \"Test User\", \"email\": \"test@example.com\", \"role\": \"manager\", \"active\": true}"
```

Roles: `manager`, `scheduler`, `technician`

## Test Accounts (if previously created)
- Manager: `manager@summitscheduler.test` / `TestManager123!`
- Technician: `tech1@summitscheduler.test` / `TestTech123!`

Note: These accounts might not exist if the Supabase project was reset. Recreate them using the steps above.

## What to Test

### Login Flow
- Navigate to localhost:5173 -> redirects to /login
- Empty form submission shows Zod validation errors
- Invalid credentials show red error banner "Invalid login credentials"
- Valid credentials redirect to role-appropriate dashboard

### Manager Portal (/manager/*)
- Dashboard: 4 stat cards, technician utilization list, upcoming bookings
- Dispatch Board: drag-and-drop appointment reassignment (needs appointments)
- Calendar: FullCalendar with month/week/day/list views
- Technicians: CRUD table with active toggle
- Schedulers: CRUD table
- Customers: customer records list
- Reports: 6 metric sections including capacity donut chart
- Settings: Business hours (08:00-17:00), working days (Mon-Fri), default duration (60)

### Scheduler Portal (/scheduler/*)
- Dashboard: appointment stats
- Create Booking: 3-step flow (form -> slot selection -> confirmation)
  - Geocodes address via Nominatim
  - Finds best slots via scheduling engine
  - Shows ranked slots with 1-5 star ratings
- Calendar: FullCalendar view
- Customers: customer records

### Technician Portal (/technician/*)
- Dashboard: personal stats (today/week/completed/utilization)
- Calendar: personal FullCalendar view
- Route Map: Leaflet map with OpenStreetMap tiles
- Availability: add unavailable blocks (date/time/reason dialog)

### RBAC
- Manager accessing /technician/* -> redirected to /manager/dashboard
- Technician accessing /manager/* -> redirected to /technician/dashboard
- Sidebar shows only role-appropriate navigation links
- Sign out clears session and redirects to /login

## Tech Notes
- shadcn/ui uses base-nova style (@base-ui/react) - uses `render` prop instead of `asChild`
- All database tables prefixed with `ss_` (ss_users, ss_appointments, etc.)
- FullCalendar 6 for calendar views
- Leaflet for maps with OpenStreetMap tiles
- Zustand for state management
- React Hook Form + Zod for form validation

## Common Issues
- If login fails silently, check that the user exists in BOTH Supabase Auth AND ss_users table
- The first invalid credentials attempt might not show the error banner immediately due to network latency; retry to see it
- Calendar and map components might take a moment to load tiles on first render
- The scheduling engine requires at least one active technician in ss_users to return slots
