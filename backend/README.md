# MODA Backend API

Express.js backend with SQLite database for persistent data storage.

## Quick Start

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Initialize database
npm run db:init

# Seed with sample data (optional)
npm run db:seed

# Start server
npm start

# Or for development with auto-reload
npm run dev
```

## API Endpoints

### Health Check
- `GET /api/health` - Server and database status

### Projects
- `GET /api/projects` - List all projects (with modules)
- `GET /api/projects/:id` - Get single project
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Soft delete project
- `POST /api/projects/:id/restore` - Restore deleted project

### Modules
- `GET /api/modules` - List all modules
- `GET /api/modules/:id` - Get single module
- `POST /api/modules` - Create module
- `PUT /api/modules/:id` - Update module
- `PUT /api/modules/:id/progress` - Update stage progress
- `DELETE /api/modules/:id` - Delete module

### Employees
- `GET /api/employees` - List all employees
- `GET /api/employees/:id` - Get single employee
- `POST /api/employees` - Create employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Soft delete employee
- `POST /api/employees/:id/restore` - Restore deleted employee

### Transport
- `GET /api/transport` - List transport modules
- `GET /api/transport/:id` - Get transport module
- `POST /api/transport` - Create transport entry
- `PUT /api/transport/:id` - Update transport status
- `GET /api/transport/yards/list` - List yards
- `POST /api/transport/yards` - Create yard
- `GET /api/transport/companies/list` - List transport companies
- `POST /api/transport/companies` - Create transport company

### Sync (Migration)
- `POST /api/sync/import` - Import data from localStorage
- `GET /api/sync/export` - Export all data
- `GET /api/sync/stats` - Database statistics

## Database

SQLite database stored at `backend/db/moda.db`

### Tables
- `projects` - Project records
- `modules` - Module records (linked to projects)
- `module_difficulties` - Module difficulty flags
- `module_stage_progress` - Production stage progress
- `employees` - Employee records
- `departments` - Department definitions
- `users` - User authentication (future)
- `transport_modules` - Yard/shipping tracking
- `yards` - Yard locations
- `transport_companies` - Transport company records
- `engineering_issues` - RFI tracking
- `issue_history` - Issue audit trail

## Migration from localStorage

1. Start the backend server
2. Open MODA dashboard in browser
3. Open browser console
4. Run: `await MODA_API.sync.importFromLocalStorage()`

This will copy all your localStorage data to the database.

## Configuration

- **Port**: 3001 (default) or `PORT` environment variable
- **CORS**: Configured for localhost:8000 and localhost:5173
- **Database**: WAL mode enabled for better concurrent performance
