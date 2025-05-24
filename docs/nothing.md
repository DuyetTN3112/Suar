ShadcnAdmin - Modern Enterprise Management System

<p align="center">
  <img src="public/images/logo.png" alt="ShadcnAdmin Logo" width="200"/>
</p>

Overview

ShadcnAdmin represents a versatile enterprise management platform developed with modern architecture and intuitive user interface. The project integrates cutting-edge technologies to deliver a seamless and efficient experience for end users.

Technologies Utilized

Backend
- AdonisJS v6
- Lucid ORM
- MySQL
- Redis
- VineJS
- I18n:(English, Vietnamese)
- Firebase

Frontend
- React 18
- Inertia.js: Framework connecting frontend and backend without requiring separate API
- Tailwind CSS
- Shadcn UI: Component system based on Radix UI and Tailwind
- Radix UI
- TanStack Table
- Recharts: Interactive data visualization library

DevOps & Tools
- Vite
- Docker & Docker Compose
- ESLint & Prettier: Tools ensuring code quality and consistency

Key Features

- User Management: Detailed permission system with multi-factor authentication
- Organization Management: Multi-level organizational structure and member management
- Task Management: Task management system with assignment and progress tracking
- Internal Communication: Real-time chat and notifications within organizations
- Multilingual Support: Support for multiple languages with easy extension
- Responsive Interface: Responsive design functioning across all screen dimensions
- Light/Dark Mode: Automatic adaptation to system mode or user preference

Authentication System

- Multi-method Authentication: Implementation of various authentication strategies
- Standard Email/Password: Traditional authentication with secure password hashing
- Social Login Integration: Authentication via Google and GitHub OAuth providers
- Upcoming Features: SMS verification and phone-based OTP authentication
- Security Measures: Implementation of rate limiting, CSRF protection, and session management
- Token-based Authentication: JWT implementation for API access
- Role-based Access Control: Granular permission system based on user roles

System Architecture

Overall Architecture
ShadcnAdmin is constructed according to a modern MVC+ pattern with enhancements for performance and maintainability:

- Model: Definition of data structures and basic business logic
- View: Utilization of React and Inertia for user interface rendering
- Controller: Processing of HTTP requests and data flow coordination
- Actions: Independent business logic units facilitating testing
- Services: Intermediary layers handling complex logic and external communications
- Validators: Reliable input data validation system

AdonisJS & Inertia Architecture

AdonisJS v6 (Backend)
AdonisJS v6 provides a solid foundation with numerous modern features:

- Clear Routing: Routing system with middleware and controllers
- Dependency Injection: Integrated DI system for application flexibility
- Health Checks: Application status monitoring
- Lucid ORM: Database interaction with Active Record pattern
- Actions Pattern: Organization of logic into small, reusable units
- Middleware System: Request/response pipeline processing
- Edge Templates: Powerful template system
- Integrated I18n: Simplified multilingual support

Inertia.js (Frontend)
Inertia.js provides a solution for connecting React with AdonisJS:

- SPA Experience: Single-page application without requiring separate REST API
- Server-driven: Server management of navigation and data
- SEO Optimization: Support for server-side rendering
- Integrated Security: Consistent authentication between client and server
- Simple Form Handling: Integration with server validation system

Design Patterns
- Repository Pattern: Separation of data handling from business logic
- Service Layer: Encapsulation of complex business logic
- Action Pattern: Fragmented business logic, easily testable
- Singleton: Applied to shared services
- Observer: Implementation of notification and event systems
- Strategy Pattern: Allowing algorithm changes when necessary
- Single Flight Pattern: Prevention of thundering herd/cache stampede issues

Database Design

Database Architecture
ShadcnAdmin employs a relational database meticulously designed to ensure performance and consistency:

- Logical Table Division: Database organized into related tables
- Integrity Constraints: Utilization of primary and foreign keys to ensure data consistency
- Soft Delete: Application of soft deletion to protect data and enable recovery when needed
- Data Type Optimization: Utilization of appropriate data types for each scenario
- Complex Data Storage: Utilization of JSON structures for unstructured data

Database Features
- Stored Procedures: Implementation of complex business logic at database layer
- Triggers: Automation of actions when data changes
- Views: Provision of comprehensive perspectives on system data
- Audit Logging: Recording of all significant changes for easy tracking and verification

Performance Optimization
- Strategic Indexing: Creation of indices for fields frequently used in searches
- Compound Indices: Optimization for complex queries
- Generated Columns: Pre-calculation of values to improve query performance
- Database Functions: Processing of complex logic at database tier
- Efficient Pagination: Optimal handling of large datasets
- Connection Pooling: Efficient connection management
- Transaction Management: Ensuring integrity in complex operations
- Single Flight Pattern: Prevention of thundering herd/cache stampede issues
- Request Collapsing: Combining similar requests to reduce backend load

Schema Management
- Migration System: System for managing schema changes
- Sample Data: Provision of initial data for development and testing
- Schema Versioning: Tracking and management of schema versions

Directory Structure
- `app/`: Backend source code
  - `actions/`: Independent business logic
  - `controllers/`: HTTP request processing
  - `models/`: Data structure definitions
  - `middleware/`: Request pipeline processing
  - `validators/`: Data validation
  - `services/`: Application services
- `inertia/`: Frontend code
  - `components/`: UI components
  - `hooks/`: React hooks
  - `pages/`: Application pages
  - `layouts/`: Layout templates
- `database/`: Migration and seeder
- `config/`: Application configuration
- `resources/`: Resources (languages, CSS, views)


Contributions
The project welcomes contributions from the community. Please refer to the contribution guidelines for further details.

License
The project is distributed under the [MIT License](LICENSE).

Contact

