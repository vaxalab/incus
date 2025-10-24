# Incus Development Setup

This project uses Docker Compose to provide a complete development environment with hot reloading for both frontend and backend services, plus a PostgreSQL database.

## Services

- **Frontend**: Next.js application running on port 3000
- **Backend**: NestJS API running on port 3001
- **Database**: PostgreSQL 16 running on port 5432

## Prerequisites

- Docker and Docker Compose installed on your system
- No need to install Node.js locally (runs in containers)

## Quick Start

1. Clone the repository and navigate to the project root
2. Start all services with hot reloading:

```bash
docker-compose up --build
```

3. Access the applications:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - PostgreSQL: localhost:5432

## Database Connection Details

- **Host**: localhost (from host machine) or `postgres` (from other containers)
- **Port**: 5432
- **Database**: incus_dev
- **Username**: incus_user
- **Password**: incus_password
- **Connection URL**: `postgresql://incus_user:incus_password@postgres:5432/incus_dev`

## Development Workflow

### Hot Reloading

Both frontend and backend have hot reloading enabled:

- Changes to frontend files automatically refresh the browser
- Changes to backend files automatically restart the NestJS server

### Common Commands

```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# Rebuild and start (after Dockerfile changes)
docker-compose up --build

# Stop all services
docker-compose down

# Stop and remove volumes (clears database)
docker-compose down -v

# View logs
docker-compose logs

# View logs for specific service
docker-compose logs frontend
docker-compose logs backend
docker-compose logs postgres

# Execute commands in running containers
docker-compose exec backend npm install new-package
docker-compose exec frontend npm install new-package
```

### Working with Dependencies

When you add new npm packages, you have two options:

1. **Install from outside the container** (recommended):

```bash
# For backend
cd backend && npm install new-package
# For frontend
cd frontend && npm install new-package
```

2. **Install inside the container**:

```bash
docker-compose exec backend npm install new-package
docker-compose exec frontend npm install new-package
```

After installing new packages, restart the containers:

```bash
docker-compose restart backend frontend
```

## File Structure

```
├── docker-compose.yml          # Main compose file
├── backend/
│   ├── Dockerfile.dev          # Backend development container
│   ├── .dockerignore          # Backend build context exclusions
│   └── ...                    # NestJS source code
├── frontend/
│   ├── Dockerfile.dev          # Frontend development container
│   ├── .dockerignore          # Frontend build context exclusions
│   └── ...                    # Next.js source code
└── README.md                  # This file
```

## Troubleshooting

### Port Conflicts

If ports 3000, 3001, or 5432 are already in use, modify the port mappings in `docker-compose.yml`:

```yaml
ports:
  - "3001:3001" # Change first number to different port
```

### Permission Issues (Linux/WSL)

If you encounter permission issues, try:

```bash
sudo chown -R $(id -u):$(id -g) .
```

### Hot Reloading Not Working

1. Ensure your code is properly mounted as volumes in docker-compose.yml
2. For Next.js, polling is enabled with `WATCHPACK_POLLING=true`
3. Try restarting the specific service: `docker-compose restart frontend`

### Database Connection Issues

1. Ensure PostgreSQL container is running: `docker-compose ps`
2. Check logs: `docker-compose logs postgres`
3. Verify connection string matches the environment variables

## Production Build

For production deployment, create separate Dockerfiles without development dependencies and hot reloading:

```bash
# Example production build commands
docker build -f backend/Dockerfile.prod -t incus-backend:prod ./backend
docker build -f frontend/Dockerfile.prod -t incus-frontend:prod ./frontend
```

## Environment Variables

The setup includes default development environment variables. For production or different environments, create a `.env` file in the project root or modify the environment sections in docker-compose.yml.
