# ShadcnAdmin

## Overview

ShadcnAdmin is a full-stack web application built with AdonisJS and React, providing a foundation for building feature-rich administration panels. It incorporates CQRS principles, Redis caching, and role-based access control for enhanced performance, maintainability, and security.

## Features and Functionality

*   **User Authentication:** Secure user registration, login, logout, forgot password, and social authentication (Google, GitHub).
*   **Organizations:** Manage organizations, including creation, membership management, and role-based access control.
*   **Projects:** Organize tasks within projects, with role-based permissions for adding/removing members and updating project details.
*   **Tasks:** Manage tasks with various attributes like status, priority, labels, assignees, and due dates. Support for soft deletes and version history.
*   **Conversations:** Real-time messaging functionality with group conversations, presence status, and message recall.
*   **Settings:** Customizable user settings such as themes, notification preferences, and display options.
*   **Notifications:** System notifications for important events, such as user assignments, project updates, and member invitations.
*   **Health Checks:** System health monitoring using health checks and stored procedures.

## Technology Stack

*   **Backend:**
    *   AdonisJS (v6): A full-stack web framework for Node.js
    *   Lucid: ORM for database interactions
    *   Redis: In-memory data store for caching and rate limiting
    *   VineJS: Validation library
    *   Edge: Templating engine
    *   Mail: Email sending service
    *   Ally: OAuth provider integration
    *   Limiter: Rate limiting service
    *   Lock: Mutex locking
    *   I18n: Internationalization support
    *   Transmit: Websocket integration
    *   Vite: Asset bundler
*   **Frontend:**
    *   React: UI library
    *   Inertia.js: Modern client-side routing
    *   Shadcn/ui: Reusable UI components
    *   Lucide React: Icon library
    *   Axios: HTTP client
    *   usehooks-ts: React utility hooks
    *   Sonner: Toast notifications
    *   input-otp: OTP Input Component

## Prerequisites

*   Node.js (>=18)
*   npm or yarn
*   MySQL database
*   Redis server
*   Environment variables: see `.env.example` for required variables

## Installation Instructions

1.  Clone the repository:

    ```bash
    git clone https://github.com/DuyetTN3112/ShadcnAdmin.git
    cd ShadcnAdmin
    ```

2.  Install dependencies:

    ```bash
    npm install
    ```

3.  Configure environment variables:

    *   Copy `.env.example` to `.env` and update with your database, Redis, and mail server settings.

4.  Run database migrations:

    ```bash
    node ace migration:run
    ```

5.  Seed the database with initial data:

    ```bash
    node ace db:seed
    ```

6.  Start the development server:

    ```bash
    npm run dev
    ```

## Usage Guide

### Development Mode

*   Access the application in your browser at `http://localhost:3333`.

### Production Mode

1.  Build the assets:

    ```bash
    npm run build
    ```

2.  Start the production server:

    ```bash
    node server.js
    ```

### Available Commands

*   `node ace serve`: Starts the AdonisJS HTTP server with file watching.
*   `node ace migration:run`: Runs pending database migrations.
*   `node ace db:seed`: Seeds the database with initial data.

### Key Files

*   `adonisrc.ts`: Main configuration file for AdonisJS.
*   `start/routes.ts`: Defines the application routes.
*   `app/controllers`: Contains route handlers and application logic.
*   `app/models`: Defines database models.
*   `database/migrations`: Contains database migration files.
*   `inertia/app/app.tsx`: Entry point for the React frontend.
*   `config`: Configuration directory.

## API Documentation

The API follows a RESTful design pattern with the following endpoints.

*   **Authentication:**
    *   `POST /login`: Authenticates a user and creates a session.
    *   `POST /logout`: Logs out the current user.
    *   `POST /register`: Registers a new user.
    *   `POST /forgot-password`: Requests a password reset email.
    *   `POST /forgot-password/reset`: Resets the user password with a valid token.
*   **Users:**
    *   `GET /api/users/pending-approval`: Retrieves a list of users awaiting approval (Superadmin only).
    *   `PUT /api/users/:id/approve`: Approves a pending user (Superadmin only).
    *   `POST /api/users/add`: Adds a user to organization from superadmin account
*   **Tasks:**
    *   `GET /api/tasks/:id/audit-logs`: Retrieves audit logs for a specific task.
    *    `PUT /api/tasks/:id/status`: Updates the status of a specific task.
*   **Conversations:**
    *   `POST /api/conversations/:id/messages`: Sends a new message to a specific conversation.

## Contributing Guidelines

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix.
3.  Implement your changes and add tests.
4.  Ensure all tests pass.
5.  Submit a pull request with a clear description of your changes.

## License Information

No license has been specified for this project.

## Contact/Support Information

[DuyetTN3112](https://github.com/DuyetTN3112)
