# CLAUDE.md

日本語で応答してください

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build (standalone output)
npm run lint         # ESLint check
```

No test framework is configured.

### Docker

```bash
docker build --build-arg NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="key" -t medical-form .
docker run -p 3000:3000 --env-file .env.local medical-form
```

### Terraform (terraform/ directory)

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars  # Fill in values
terraform init && terraform plan && terraform apply
```

## Architecture

Medical information collection form (被害者請求ヒアリングシート) for traffic accident victims. Next.js 15 App Router with Google services integration and Anthropic Claude for AI validation/search.

### 7-Step Form Flow

0. **BasicInfoForm** — Personal & accident details with AI field validation
1-3. **FacilitySearchSection** — Search/select 整形外科 (max 3), 整骨院 (max 4), 薬局 (max 3)
4. **ConfirmationView** — Review all data + embedded YouTube instruction video
5. **AppointmentScheduler** — Staff calendar availability & booking
6. **CompleteView** — Success with ICS download & Google Calendar link

### State Management

`src/lib/form-context.tsx` — React Context + useReducer. All form state flows through `FormProvider` → `useFormContext()` hook. Step navigation controlled by `currentStep` (0-6).

### API Routes (`src/app/api/`)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/submit` | POST | Copy Sheets template to Drive folder, write basicInfo + facilities |
| `/api/calendar/availability` | GET | Generate 1h slots (10:00-17:00, 14 days, skip holidays) per staff |
| `/api/calendar/book` | POST | Create calendar event + Google Chat webhook notification |
| `/api/search` | POST | Claude Haiku refines query → Google Places API (10km radius) |
| `/api/geocode` | POST | Google Geocoding: Japanese address → lat/lng |
| `/api/validate-field` | POST | Claude validates accidentLocation & accidentDescription |

### Key Integration Pattern

All Google API routes authenticate via JWT with a shared service account (`GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`). Private key parsing handles both `\n` literal and actual newlines.

### Submission Flow

AppointmentScheduler triggers a two-step process: `/api/submit` (Sheets+Drive) → `/api/calendar/book` (calendar event). Calendar booking only happens after successful spreadsheet creation.

### Styling

Google Forms-inspired theme with purple accent (`#673ab7`). Custom Tailwind CSS 4 variables defined in `globals.css`. Components use Card/SectionCard/FieldCard pattern.

## Environment Variables

**Required:** `GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_DRIVE_PARENT_FOLDER_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_CALENDAR_STAFF` (JSON: `[{name, calendarId, priority}]`)

**Optional:** `GOOGLE_CHAT_WEBHOOK_URL`

## Language

All UI text and user-facing strings are in Japanese. Code comments are mixed Japanese/English.
