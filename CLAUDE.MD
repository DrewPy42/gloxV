# Goldilox Comic Book Database

## Project Overview

Goldilox is a full-stack comic book collection management system built with Vue.js, Express.js, and MySQL. The application allows users to track and manage their comic book collections with a modern web interface. Originally built 20+ years ago in Microsoft Access, it has been modernized with a normalized database schema and modern web technologies.

## Technology Stack

### Frontend (Client)
- **Framework**: Vue 3.5.13 with TypeScript
- **Build Tool**: Vite 6.0.6
- **UI Framework**: Vuetify 3.10.6 + Bootstrap 5.3.3
- **State Management**: Pinia 2.3.1
- **Routing**: Vue Router 4.5.0
- **Form Validation**: VeeValidate 4.15.0 with Yup 1.6.1
- **HTTP Client**: Custom fetchWrapper (Axios available but not primary)
- **Icons**: FontAwesome 6.7.2
- **Additional Libraries**:
  - DOMPurify for XSS protection
  - UUID for unique identifiers
  - Pluralize for text formatting

### Backend (Server)
- **Runtime**: Node.js 18
- **Framework**: Express 4.18.0 with TypeScript
- **Database**: MySQL 9.4
- **Query Library**: mysql2 3.14.1 with parameterized queries
- **Security**: CORS 2.8.5, DOMPurify 3.2.3
- **Environment**: dotenv 16.4.7
- **Dev Tools**: nodemon 3.1.10, ts-node, TypeScript 5.8.3

### Development Environment
- **Containerization**: Docker with Docker Compose
- **Services**:
  - Client (port 5173)
  - Server (port 3000)
  - MySQL (port 3306)

## Project Structure

```
.
├── client/                    # Vue.js frontend application
│   ├── src/
│   │   ├── App.vue            # Root component
│   │   ├── main.ts            # Application entry point
│   │   ├── components/        # Vue components
│   │   │   ├── common/        # Reusable components (DataTable, Modal, FormField, etc.)
│   │   │   ├── pages/         # Page-level components
│   │   │   ├── forms/         # Form components
│   │   │   ├── dashboards/    # Dashboard components (legacy)
│   │   │   ├── menus/         # Navigation menus
│   │   │   ├── modals/        # Modal dialogs
│   │   │   └── objects/       # Small reusable objects
│   │   ├── composables/       # Vue Composition API composables
│   │   ├── core/              # Core functionality
│   │   │   ├── models/        # TypeScript interfaces
│   │   │   ├── stores/        # Pinia stores
│   │   │   └── functions/     # Utility functions
│   │   ├── plugins/           # Vue plugins (Vuetify)
│   │   ├── router/            # Vue Router configuration
│   │   └── styles/            # SCSS stylesheets
│   ├── public/
│   │   └── images/
│   │       ├── covers/        # Comic cover images
│   │       ├── logos/         # Publisher logos
│   │       └── characters/    # Character images
│   ├── Dockerfile
│   └── package.json
│
├── server/                    # Express.js backend application
│   ├── src/                   # TypeScript source
│   │   ├── server.ts          # Server entry point
│   │   ├── controllers/       # Database connection
│   │   │   └── db.ts          # MySQL connection pool
│   │   ├── routes/            # API route definitions
│   │   │   ├── series.ts
│   │   │   ├── volumes.ts
│   │   │   ├── issues.ts
│   │   │   ├── copies.ts
│   │   │   ├── covers.ts
│   │   │   ├── publisher.ts
│   │   │   ├── locations.ts
│   │   │   ├── storylines.ts
│   │   │   ├── tags.ts
│   │   │   ├── persons.ts
│   │   │   ├── credits.ts
│   │   │   ├── collectedEditions.ts
│   │   │   └── stats.ts
│   │   └── types/             # TypeScript type definitions
│   │       └── models.ts
│   ├── dist/                  # Compiled JavaScript output
│   ├── Dockerfile
│   ├── tsconfig.json
│   └── package.json
│
├── sql/                       # Database schemas and migration data
├── docker-compose.yml         # Docker orchestration
├── .env                       # Environment variables
└── README.md
```

## Database Schema (glox)

The application uses a normalized MySQL database with the following main entities:

### Core Tables
- **series** - Comic book series (e.g., "Amazing Spider-Man")
- **volume** - Volumes within a series (e.g., Vol. 1, Vol. 2)
- **issue** - Individual comic issues
- **copy** - Physical/digital copies owned (with condition, value, location)
- **cover** - Cover variants and images for issues

### Reference Tables
- **publisher** - Comic publishers with logos
- **comic_age** - Comic eras (Golden, Silver, Bronze, Modern, etc.)
- **condition_code** - Grading conditions (NM, VF, FN, etc.)
- **location** - Storage locations (cabinets, drawers, digital)

### Creator Tables
- **person** - Creators (writers, artists, etc.)
- **person_alias** - Alternate names/pen names
- **job_category** - Job categories (Writer, Artist, Editor)
- **job_title** - Specific job titles
- **issue_credit** - Links issues to creators

### Organization Tables
- **storyline** - Crossovers, events, story arcs
- **storyline_issue** - Links issues to storylines with reading order
- **series_link** - Links related series (continues_story, spin_off)
- **tag** / **taggable** - Flexible tagging system
- **collected_edition** - TPBs, hardcovers, omnibuses
- **value_history** - Historical value tracking

### Key Schema Features
- Soft deletes via `deleted_at` timestamp
- Audit fields: `created_at`, `updated_at`
- Stats computed on-the-fly via JOINs (not stored)
- Foreign key relationships with proper indexing

## API Endpoints

All endpoints use `/api` prefix. Stats are computed via JOINs, not stored.

### Series
- `GET /api/series` - List with computed stats (volume_count, issue_count, copy_count, total_cost, total_value)
- `GET /api/series?id=:id` - Single series
- `GET /api/series/:id/summary` - Detailed series with stats
- `GET /api/series/:id/links` - Related series
- `POST /api/series` - Create
- `PUT /api/series/:id` - Update
- `DELETE /api/series/:id` - Soft delete

### Volumes
- `GET /api/volumes` - List (supports `series_id` filter)
- `POST/PUT/DELETE` - CRUD operations

### Issues
- `GET /api/issues` - List (supports `series_id`, `volume_id` filters)
- `GET /api/issues/:id/copies` - Copies of an issue
- `GET /api/issues/:id/storylines` - Storylines containing issue
- `POST/PUT/DELETE` - CRUD operations

### Copies
- `GET /api/copies` - List with filters (issue_id, location_id, condition_id, format)
- `GET /api/copies/:id/value-history` - Value history
- `POST/PUT/DELETE` - CRUD operations

### Covers
- `GET /api/covers` - List (supports `issue_id`, `cover_type` filters)
- `POST/PUT/DELETE` - CRUD operations (auto-manages `is_primary`)

### Publishers
- `GET /api/publishers` - List with stats
- `GET /api/publishers?getall=true` - All publishers (no pagination)

### Locations
- `GET /api/locations` - List with stats
- `GET /api/locations/:id` - Location with contents
- `GET /api/locations/cabinet/:num` - Cabinet view

### Storylines
- `GET /api/storylines` - List with issue counts
- `GET /api/storylines/:id` - Storyline with issues and reading order
- `POST /api/storylines/:id/issues` - Add issue to storyline
- `DELETE /api/storylines/:id/issues/:issueId` - Remove issue

### Tags
- `GET /api/tags` - List with usage counts
- `GET /api/tags/categories` - Tag categories
- `POST /api/tags/:id/apply` - Apply tag to entity
- `DELETE /api/tags/:id/remove` - Remove tag
- `GET /api/tags/entity/:type/:id` - Tags for specific entity

### Credits
- `GET /api/credits` - List (supports `issue_id`, `person_id` filters)
- `GET /api/credits/job-titles` - All job titles
- `GET /api/credits/job-categories` - Job categories with counts

### Persons
- `GET /api/persons` - List creators
- `GET /api/persons/:id` - Person with aliases and credits
- `POST /api/persons/:id/aliases` - Add alias
- `GET /api/persons/:id/credits` - All credits for person

### Stats
- `GET /api/stats` - Collection overview
- `GET /api/stats?series_id=:id` - Series-specific stats
- `GET /api/stats/by-publisher` - Stats grouped by publisher
- `GET /api/stats/by-age` - Stats grouped by comic age
- `GET /api/stats/by-condition` - Stats grouped by condition
- `GET /api/stats/by-location` - Stats grouped by location
- `GET /api/stats/high-value` - Top valued items
- `GET /api/stats/recent` - Recently added items

### Collected Editions
- `GET /api/collected-editions` - List TPBs, HCs, etc.
- `POST /api/collected-editions/:id/issues` - Add issue
- `GET /api/collected-editions/:id/value-history` - Value history

## Frontend Architecture

### Reusable Components (`/components/common/`)
- **DataTable** - Generic table with sorting, pagination, search, selection, custom cell slots
- **Pagination** - Standalone pagination with page jump
- **Modal** - Generic modal dialog with customizable header/footer
- **FormField** - Generic form input (text, select, checkbox, radio, textarea, date)
- **Card** - Reusable card container
- **StatCard** - Stat display card for dashboards

### Composables (`/composables/`)
- **useFormatting** - Currency, percentage, date, number formatting
- **useModal** - Modal state management
- **usePagination** - Pagination logic
- **useSearch** - Debounced search
- **useSort** - Sort state and icons
- **useSelection** - Multi-select for tables
- **useImage** - Image URL helpers and existence checks
- **useConfirmation** - Confirmation dialogs
- **useToast** - Toast notifications

### Stores (`/core/stores/`)
Uses a factory pattern via `createBaseStore<T>()` for consistent CRUD operations:
- `useSeriesStore`, `useVolumeStore`, `useIssueStore`, `useCopyStore`
- `usePublisherStore`, `useLocationStore`, `useStorylineStore`
- `useCoverStore`, `useCollectedEditionStore`, `useTagStore`
- `usePersonStore`, `useCreditStore`, `useStatsStore`

Extended stores add entity-specific methods (e.g., `useSeriesStoreExtended` adds `fetchSeriesSummary`).

### Pages (`/components/pages/`)
- **HomePage** - Dashboard with collection overview, top publishers, high-value items
- **SeriesPage** - Series list with DataTable
- **StorylinePage** - Storylines with reading order
- **LocationPage** - Storage locations
- **PublisherPage** - Publishers list
- **StatsPage** - Detailed statistics

## Development Setup

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)

### Environment Variables
Create a `.env` file in the root directory:
```
MYSQL_ROOT_PASSWORD=your_root_password
MYSQL_DATABASE=glox
MYSQL_USER=your_username
MYSQL_PASSWORD=your_password
```

### Running with Docker
```bash
# Start all services
docker-compose up

# Stop all services
docker-compose down

# Rebuild containers
docker-compose up --build
```

### Local Development

#### Client
```bash
cd client
npm install
npm run dev        # Development server (port 5173)
npm run build      # Production build
npm run preview    # Preview production build
```

#### Server
```bash
cd server
npm install
npm run build      # Compile TypeScript
npm run dev        # Development with nodemon + ts-node
npm start          # Production (runs dist/server.js)
```

## Collection Statistics

Current collection (as of Dec 2024):
- **682 series** across 61 publishers
- **784 volumes**
- **6,732 issues**
- **7,492 copies**
- **Total cost**: $24,548
- **Total value**: $43,387 (76.7% gain)

Top publishers by value:
1. Marvel Comics - $18,324 (4,885 issues)
2. Top Cow - $1,389 (369 issues)
3. Image Comics - $873 (258 issues)

## Known Issues / TODO

- Volume list doesn't show issue count (needs API update like series)
- Reading order in storylines uses cover_date fallback when part_number missing
- Some orphaned publishers with zero series/issues from migration
- Collected editions not yet populated

## Security Considerations

- CORS configured for API access
- DOMPurify used on both client and server for XSS prevention
- Parameterized queries prevent SQL injection
- Environment variables for sensitive configuration
- Docker network isolation
- Soft deletes preserve data integrity

## Git Workflow

Current branch: `objective-antonelli`
Main branch: `main`

## Migration History

1. **Original**: Microsoft Access database (~2000)
2. **Goldilox v1-3**: Visual Basic Frontend with Access/SQLite Backend
3. **goldilox v4**: First MySQL migration with PHP backend
4. **gloxV**: Current normalized schema with TypeScript/Vue (Dec 2024)

Migration handled crossovers, locations, and data normalization across 7 phases.
