# Goldilox Comic Book Database

## Project Overview

Goldilox is a full-stack comic book collection management system built with Vue.js, Express.js, and MySQL. The application allows users to track and manage their comic book collections with a modern web interface.

## Technology Stack

### Frontend (Client)
- **Framework**: Vue 3.5.13 with TypeScript
- **Build Tool**: Vite 6.0.6
- **UI Framework**: Vuetify 3.10.6 + Bootstrap 5.3.3
- **State Management**: Pinia 2.3.1
- **Routing**: Vue Router 4.5.0
- **Form Validation**: VeeValidate 4.15.0 with Yup 1.6.1
- **HTTP Client**: Axios 1.7.9
- **Icons**: FontAwesome 6.7.2
- **Additional Libraries**:
  - DOMPurify for XSS protection
  - UUID for unique identifiers
  - Pluralize for text formatting

### Backend (Server)
- **Runtime**: Node.js 18
- **Framework**: Express 4.18.0
- **Database**: MySQL 8.0
- **ORM/Query**: mysql2 3.14.1
- **Security**: CORS 2.8.5, DOMPurify 3.2.3
- **Environment**: dotenv 16.4.7
- **Dev Tools**: nodemon 3.1.10, TypeScript 5.8.3

### Development Environment
- **Containerization**: Docker with Docker Compose
- **Services**:
  - Client (port 5173)
  - Server (port 3000)
  - MySQL (port 3306)

## Project Structure

```
.
├── client/              # Vue.js frontend application
│   ├── src/
│   │   ├── App.vue     # Root component
│   │   ├── main.ts     # Application entry point
│   │   ├── components/ # Reusable Vue components
│   │   ├── core/       # Core functionality
│   │   ├── plugins/    # Vue plugins
│   │   ├── router/     # Vue Router configuration
│   │   └── styles/     # CSS/SCSS stylesheets
│   ├── Dockerfile
│   └── package.json
│
├── server/             # Express.js backend application
│   ├── server.js       # Server entry point
│   ├── controllers/    # Request handlers
│   ├── routes/         # API route definitions
│   ├── Dockerfile
│   └── package.json
│
├── sql/                # Database schemas and sample data
├── docker-compose.yml  # Docker orchestration
├── .env                # Environment variables
└── README.md
```

## Development Setup

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)

### Environment Variables
Create a `.env` file in the root directory with:
```
MYSQL_ROOT_PASSWORD=your_root_password
MYSQL_DATABASE=your_database_name
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
npm run dev        # Development server
npm run build      # Production build
npm run preview    # Preview production build
```

#### Server
```bash
cd server
npm install
npm run dev        # Development with nodemon
npm start          # Production server
```

## API Endpoints

The backend server runs on port 3000 and provides RESTful API endpoints for managing comic book data. Route definitions are located in `server/routes/`.

## Database

- **Type**: MySQL 8.0
- **Port**: 3306
- **Sample Data**: Located in `sql/` directory based on the developer's personal collection
- **Schema**: Database schema files available in `sql/` directory

## Key Features

- Comic book collection management
- Series tracking with pagination
- Art viewer for comic covers
- Issue management with cover icons
- Modal-based UI interactions
- Form validation
- XSS protection with DOMPurify
- Responsive design with Bootstrap and Vuetify

## Development Notes

### Recent Work
- Series forms and dashboard improvements
- Pagination added to series dashboard
- Modal behavior fixes
- Art viewer implementation
- Cover icon display for issues

### Code Quality
- ESLint configured for both client and server
- Prettier for code formatting
- TypeScript support in both frontend and backend
- Type definitions for all major dependencies

### Security Considerations
- CORS configured for API access
- DOMPurify used on both client and server for XSS prevention
- Environment variables for sensitive configuration
- Docker network isolation

## Build and Deployment

### Production Build
```bash
# Build client
cd client && npm run build

# The built files will be in client/dist/
```

### Docker Deployment
The application is fully containerized and can be deployed using the provided `docker-compose.yml` configuration.

## Git Workflow

Current branch: `objective-antonelli`
Main branch: `main`

## Troubleshooting

### Container Issues
- Ensure Docker is running
- Check if ports 3000, 3306, and 5173 are available
- Review logs: `docker-compose logs [service-name]`

### Database Connection
- Verify environment variables in `.env`
- Check MySQL container health: `docker-compose ps`
- Ensure MySQL is ready before server starts (healthcheck configured)

### File Changes Not Reflecting
- CHOKIDAR_USEPOLLING is enabled for Docker file watching
- node_modules are isolated per container (not shared with host)

## Contributing

When making changes:
1. Create a feature branch
2. Test locally with Docker or local development
3. Ensure code passes ESLint checks
4. Create a pull request to `main` branch
