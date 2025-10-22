# Event Scheduling System

This repository contains a simple event scheduling system implemented in Fastify framework. The system allows users to create, view, and manage events with specific dates and times.

## Features (In Progress)

- [x] CRUD operations for events
- [x] User authentication and authorization
- [x] API documentation with Swagger

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- pnpm package manager

### Development Setup

1. Clone the repository:
   ```bash
   git clone <repository-ur>
   ```
2. Navigate to the project directory:

   ```bash
    cd event-scheduling-system
   ```

3. Install dependencies using pnpm:

   ```bash
   pnpm install
   ```

4. Start the development server:
   ```bash
   pnpm dev
   ```

## Deployment with Docker

1. Create a `.env.docker` file in the root directory and configure the necessary environment variables (you can find an example in `.env.example`).

2. Build and run the Docker containers using Docker Compose:

   ```bash
   docker compose up -d --build
   ```

3. To view the logs of the application, use:
   ```bash
   docker compose logs -f app
   ```
