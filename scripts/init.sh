#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    printf "${BLUE}[INFO]${NC} %s\n" "$1"
}

print_success() {
    printf "${GREEN}[SUCCESS]${NC} %s\n" "$1"
}

print_warning() {
    printf "${YELLOW}[WARNING]${NC} %s\n" "$1"
}

print_error() {
    printf "${RED}[ERROR]${NC} %s\n" "$1"
}

# Function to convert string to snake_case
to_snake_case() {
    echo "$1" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/_/g' | sed 's/__*/_/g' | sed 's/^_\|_$//g'
}

# Function to collect user input
collect_user_input() {
    echo ""
    printf "${BLUE}🔧 Project Configuration${NC}\n"
    echo "=========================="
    
    # Ask for site name
    while [ -z "$SITE_NAME" ]; do
        printf "Enter your site name: "
        read -r SITE_NAME
        if [ -z "$SITE_NAME" ]; then
            print_warning "Site name cannot be empty. Please try again."
        fi
    done
    
    # Ask for database name with default
    DEFAULT_DB_NAME=$(to_snake_case "$SITE_NAME")
    printf "Enter your database name (default: %s): " "$DEFAULT_DB_NAME"
    read -r DB_NAME
    if [ -z "$DB_NAME" ]; then
        DB_NAME="$DEFAULT_DB_NAME"
    fi
    
    # Ask for database user with default
    DEFAULT_DB_USER="developer"
    printf "Enter your database user (default: %s): " "$DEFAULT_DB_USER"
    read -r DB_USER
    if [ -z "$DB_USER" ]; then
        DB_USER="$DEFAULT_DB_USER"
    fi
    
    # Ask for database password with default
    DEFAULT_DB_PASSWORD="test"
    printf "Enter your database password (default: %s): " "$DEFAULT_DB_PASSWORD"
    read -r DB_PASSWORD
    if [ -z "$DB_PASSWORD" ]; then
        DB_PASSWORD="$DEFAULT_DB_PASSWORD"
    fi
    
    print_success "Site Name: $SITE_NAME"
    print_success "Database Name: $DB_NAME"
    print_success "Database User: $DB_USER"
    echo ""
}

# Function to replace placeholders in files
replace_placeholders() {
    print_status "Replacing placeholders in project files..."
    
    # Replace placeholders in docker-compose.yml
    if [ -f "docker-compose.yml" ]; then
        # Detect OS for sed command
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s/DB_NAME/$DB_NAME/g" docker-compose.yml
            sed -i '' "s/DB_USER/$DB_USER/g" docker-compose.yml
            sed -i '' "s/DB_PASSWORD/$DB_PASSWORD/g" docker-compose.yml
        else
            # Linux
            sed -i "s/DB_NAME/$DB_NAME/g" docker-compose.yml
            sed -i "s/DB_USER/$DB_USER/g" docker-compose.yml
            sed -i "s/DB_PASSWORD/$DB_PASSWORD/g" docker-compose.yml
        fi
        print_success "Updated docker-compose.yml"
    else
        print_warning "docker-compose.yml not found, skipping..."
    fi
    
    # Note: __root.tsx uses VITE_SITE_NAME from .env, so no replacement needed
    
    # Replace SITE_NAME in index.tsx
    if [ -f "apps/web/src/routes/index.tsx" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/Welcome to Basement/Welcome to $SITE_NAME/g" apps/web/src/routes/index.tsx
        else
            sed -i "s/Welcome to Basement/Welcome to $SITE_NAME/g" apps/web/src/routes/index.tsx
        fi
        print_success "Updated apps/web/src/routes/index.tsx"
    fi
    
    # Replace SITE_NAME in manifest.json
    if [ -f "apps/web/public/manifest.json" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/TanStack App/$SITE_NAME/g" apps/web/public/manifest.json
            sed -i '' "s/Create TanStack App Sample/$SITE_NAME/g" apps/web/public/manifest.json
        else
            sed -i "s/TanStack App/$SITE_NAME/g" apps/web/public/manifest.json
            sed -i "s/Create TanStack App Sample/$SITE_NAME/g" apps/web/public/manifest.json
        fi
        print_success "Updated apps/web/public/manifest.json"
    fi
    
    # Replace SITE_NAME in server.ts (API title)
    if [ -f "apps/api/src/server.ts" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/Basement API/$SITE_NAME API/g" apps/api/src/server.ts
        else
            sed -i "s/Basement API/$SITE_NAME API/g" apps/api/src/server.ts
        fi
        print_success "Updated apps/api/src/server.ts"
    fi
    
    print_success "All placeholders replaced successfully!"
}

# Check if required tools are installed
check_requirements() {
    print_status "Checking requirements..."
    
    if ! command -v bun &> /dev/null; then
        print_error "Bun is not installed. Please install Bun from https://bun.sh"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker from https://www.docker.com/"
        exit 1
    fi
    
    # Check for docker compose (can be either 'docker compose' or 'docker-compose')
    if ! docker compose version &> /dev/null && ! docker-compose version &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose"
        exit 1
    fi
    
    print_success "All requirements are met!"
}

# Create environment file
create_env_file() {
    print_status "Creating environment file..."
    
    if [ ! -f ".env" ]; then
        # Generate secure Better Auth secret
        BETTER_AUTH_SECRET=$(openssl rand -base64 32)
        
        cat > .env << EOF
# Database
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}

# API Configuration
API_URL=http://localhost:3001
WEB_URL=http://localhost:3000

# Authentication
BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}

# Frontend
VITE_API_URL=http://localhost:3001
VITE_SITE_NAME=${SITE_NAME}
EOF
        print_success "Created .env file with generated Better Auth secret"
    else
        print_warning ".env already exists, skipping..."
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    bun install
    print_success "Dependencies installed successfully!"
}

# Start Docker services
start_docker_services() {
    print_status "Starting Docker services..."
    
    # Use docker compose if available, otherwise docker-compose
    if docker compose version &> /dev/null; then
        docker compose up -d
    else
        docker-compose up -d
    fi
    
    print_success "Docker services started successfully!"
}

# Wait for database to be ready
wait_for_database() {
    print_status "Waiting for database to be ready..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker exec db pg_isready -U "$DB_USER" -d "$DB_NAME" &> /dev/null; then
            print_success "Database is ready!"
            return 0
        fi
        
        print_status "Waiting for database... (attempt $attempt/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "Database failed to start within expected time"
    return 1
}

# Initialize database
init_db() {
    print_status "Running database migrations..."
    bun run db:migrate
    print_success "Database migrations completed!"
}

# Run database seed
run_seed() {
    print_status "Seeding database..."
    bun run db:seed
    print_success "Database seed completed!"
}

# Main execution
main() {
    printf "${GREEN}🚀 Initializing Turborepo Fullstack Boilerplate${NC}\n"
    echo "=================================================="
    
    check_requirements
    collect_user_input
    replace_placeholders
    create_env_file
    install_dependencies
    start_docker_services
    wait_for_database
    init_db
    run_seed
    
    echo ""
    printf "${GREEN}🎉 Setup completed successfully!${NC}\n"
    echo ""
    echo "Next steps:"
    printf "1. Start the development server: ${BLUE}bun run dev${NC}\n"
    printf "2. Open your browser to: ${BLUE}http://localhost:3000${NC}\n"
    printf "3. API server running at: ${BLUE}http://localhost:3001${NC}\n"
    printf "4. API documentation: ${BLUE}http://localhost:3001/documentation${NC}\n"
    echo ""
    echo "Happy coding! 🚀"
}

# Run main function
main "$@"

