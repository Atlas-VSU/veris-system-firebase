# VERIS Systems
 
## USSC Instance
 
This is the VERIS deployment originally developed exclusively for the University Student Supreme Council (USSC) under the brand names USSC Connect and Surepay. VERIS is a commercial student attendance and organization management system developed by the **Veris Dev Team under FC-SSC**, initially built for tracking participation in intramurals, faction events, and other academic activities, with optional financial management for membership fees, fines, and clearance available as an expanded tier. This platform provides organizations a way to record, monitor, and analyze student attendance and financial data in real time.
 
## What is VERIS?
 
VERIS is a modern web-based application that allows organizations to efficiently manage attendance for university events, intramurals, and faction activities — with the option to also manage membership fees, fines, and clearance through the Plus tier. The system eliminates the need for paper-based attendance and financial tracking by providing digital tools for event creation, attendance recording, data analysis, and, in Plus, financial management.
 
Built with responsiveness in mind, VERIS works seamlessly across desktop and mobile devices, making it accessible for organizers on the go.
 
This release introduces several major additions:
 
- **One Stop Shop Enrollment (OSSE):** A new self-registration flow built for USSC's Station, letting incoming freshmen register themselves directly into the system rather than requiring manual entry by organizers.
- **Self-Registration for Upperclassmen:** The self-registration flow now also covers upperclassmen who were not yet registered in the system, closing a gap left by the original freshman-only rollout.
- **Update Student Record:** A companion feature that lets students and organizers correct or update existing student records, keeping the database accurate as enrollment and personal details change over time.
- **Multi-Semester Support:** Users can now navigate across different semester periods and view a student's clearance status and fines historically, rather than only for the current term.
- **Multi-Account per Organization:** Organizations can now maintain multiple user accounts, making it possible to track actions and transactions by individual officer rather than a single shared login.
OSSE, self-registration, and Update Student Record are available across **all tiers**, including Basic.
 
## Deployment
 
A live demo of the system is available at [https://coral-ussc.vercel.app/]
 
## Version 1.2.1
 
The latest release introduces significant UI/UX improvements, enhanced responsiveness, and better user experience across all devices. Key improvements include:
 
- Responsive member card designs with both regular and compact views
- Improved bulk import functionality with better mobile support
- Enhanced authentication flow and navigation
- Fixed layout issues in forms and dialogs
- Self-registration (OSSE) for freshmen and upperclassmen
- Update Student Record for maintaining accurate student data
- Multi-semester navigation for clearance and fines
- Multi-account support per organization
- Comprehensive documentation updates

## Pricing & Tiers
 
VERIS Systems is offered commercially by the Veris Dev Team (FC-SSC) under two subscription tiers, priced per student per year.
 
### Basic — Attendance Management

**₱2 / student / year** · Minimum 100 students · ₱200/yr floor
 
- ✓ Secure login
- ✓ Dashboard with real-time attendance trends
- ✓ Create & manage unlimited events
- ✓ Real-time attendee tracking & timestamps
- ✓ Quick check-in via student ID or name
- ✓ Member directory with bulk import
- ✓ Unlimited members & events
- ✓ Self-registration for freshmen and upperclassmen (OSSE)
- ✓ Update Student Record
- ✓ Multi-semester navigation
- ✓ Multi-account per organization

### Plus — Basic + Financial Management *(Most Popular)*

**₱3 / student / year** · Minimum 75 students · ₱225/yr floor
 
Everything in Basic, plus:
 
- ✓ Membership fees (semester, event, custom)
- ✓ Define fine types & standard amounts
- ✓ Assign fines manually to students
- ✓ GCash payment verification workflow
- ✓ Officer-side clearance management
- ✓ Basic financial summaries & reports

### Key Features
 
1. **Authentication**
   - Secure user login and registration system
   - Role-based access control with organization-specific permissions
   - Password recovery functionality
   - Optimized navigation for authenticated and non-authenticated users
   - Multi-account support per organization, so individual officer actions can be tracked separately
   - (Note: External authentication providers like Google Sign-in will be added in future versions)
2. **Dashboard**
   - At-a-glance attendance statistics and metrics
   - Interactive graphs displaying attendance trends
   - Quick access to recently created events
   - Recently added members/students list
   - Responsive design for all screen sizes
3. **Event Management**
   - Create, update, and archive events
   - Configure event details: name, date, time-in/time-out ranges
   - Designate events as major or minor
   - Add descriptive notes and event information
   - Mobile-friendly event creation and management
   - (Calendar view of upcoming and past events will be added in the future)
4. **Attendee Tracking**
   - Comprehensive attendee lists for each event
   - Timestamp recording for check-in/check-out
   - Attendance status visualization
   - Exportable attendance records
   - Search and filter capabilities
5. **Attendance Logging**
   - Simple check-in process via student ID or name
   - Real-time display of checked-in students
   - Search and filter functionality
   - Loading skeletons for improved user experience
   - (Coming soon: kiosk mode, self check-in, and QR scanning)
6. **Member Management**
   - Bulk import functionality with downloadable templates
   - Manual member addition with responsive forms
   - Searchable member directory with instant results
   - Pagination for large member lists
   - Multiple view options (standard and compact card layouts)
   - Mobile-optimized member management interface
7. **Enrollment & Student Records**
   - One Stop Shop Enrollment (OSSE): self-registration for incoming freshmen
   - Self-registration extended to unregistered upperclassmen
   - Update Student Record for correcting or maintaining accurate student data
   - Available across all tiers, including Basic
8. **Multi-Semester & Multi-Account**
   - Navigate across semester periods to view historical clearance status and fines
   - Multiple accounts per organization for per-officer transaction tracking
   - Available across all tiers, including Basic
9. **Financial Management** *(Plus tier only)*
   - Configurable membership fees (semester, event-based, or custom)
   - Custom fine types with standard amounts
   - Manual fine assignment to individual students
   - GCash payment verification workflow
   - Officer-side clearance management
   - Basic financial summaries and reports

## Recent Improvements
 
### UI/UX Enhancements
 
- **Member List Component**: Completely redesigned with responsive card layouts, proper spacing, and pagination
- **Bulk Import Dialog**: Fixed layout issues, improved mobile experience, and enhanced file upload section
- **Navigation**: Improved header behavior based on authentication status
- **Loading States**: Added skeleton loaders to replace static messages or content
- **Self-Registration (OSSE)**: Added self-registration for freshmen and extended it to unregistered upperclassmen
- **Update Student Record**: Added a dedicated feature for correcting and maintaining accurate student records
- **Multi-Semester Navigation**: Added the ability to view clearance status and fines across different semester periods
- **Multi-Account per Organization**: Added support for multiple user accounts per organization for better transaction tracking

### Component Architecture
 
- Refactored large components into smaller, focused ones for better maintainability
- Created reusable components for lists, cards, search, and pagination
- Implemented proper responsive design with tailored mobile and desktop experiences

### Documentation
 
- Comprehensive README with detailed project information
- Clear feature documentation and system capabilities
- Updated deployment information and technology stack details

## Coming Soon
 
- QR code-based check-in system
- Self-service attendance kiosk mode
- Mobile application for on-the-go attendance tracking
- Advanced reporting and analytics

## Getting Started

### Prerequisites

- Node.js 16.8 or later
- npm, yarn, or pnpm package manager
- A Firebase project (for authentication and database)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/Atlas-VSU/coral-ussc.git
cd coral-ussc
```

2. Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up environment variables:
   
   Copy the example environment file and configure it with your USSC Firebase credentials:
   
   ```bash
   cp .env.local.example .env.local
   ```
   
   Then edit `.env.local` with your Firebase configuration. You'll need both client and admin SDK credentials:
   
   **Client SDK (Browser-side):**
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```
   
   **Admin SDK (Server-side):**
   ```
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_CLIENT_EMAIL=your_service_account_email
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```
   
   > **Important:** Never commit your `.env.local` file to version control. It contains sensitive credentials.

4. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Firebase Setup Guide

To obtain the required Firebase credentials for the USSC instance:

### Client SDK Configuration

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your USSC project (or create a new one)
3. Click on the gear icon ⚙️ next to "Project Overview" and select "Project settings"
4. Scroll down to "Your apps" section
5. If you haven't added a web app, click the web icon (</>) to add one
6. Copy the Firebase configuration object - these are your `NEXT_PUBLIC_FIREBASE_*` values

### Admin SDK Configuration

1. In Firebase Console, go to Project Settings > Service Accounts
2. Click "Generate new private key"
3. Download the JSON file (keep it secure!)
4. Extract the following values from the JSON:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (keep the quotes and newlines)

### Firestore Database Setup

1. In Firebase Console, go to Firestore Database
2. Click "Create database"
3. Choose production mode (or test mode for development)
4. Select a location close to your users
5. The database will be created with the required security rules

### Firebase Authentication Setup

1. In Firebase Console, go to Authentication
2. Click "Get started" if not already enabled
3. Enable the sign-in methods you want to use (Email/Password is required)
4. Configure authorized domains for your deployment

## Technology Stack

- **Frontend Framework**: Next.js 16 (App Router)
- **UI Component Library**: ShadcnUI with Tailwind CSS
- **State Management**: React Context API
- **Authentication**: Firebase Authentication
- **Database**: Firebase Firestore
- **Language**: TypeScript
- **Styling**: Tailwind CSS with responsive design
- **Form Handling**: React Hook Form with Zod validation
- **Deployment**: Vercel

## Project Structure

```
src/
├── app/                  # Next.js App Router structure
│   ├── (auth)/           # Authentication related pages
│   ├── (dashboard)/      # Dashboard and authenticated features
│   └── (public)/         # Public facing pages
├── components/           # Shared UI components
│   ├── NavBar/           # Navigation components
│   └── ui/               # Basic UI elements (shadcn)
├── features/             # Feature-based organization
│   ├── auth/             # Authentication related components
│   ├── dashboard/        # Dashboard components and logic
│   ├── events/           # Event management features
│   └── organization/     # Organization and member management
└── lib/                  # Utility functions and shared logic
```

## Development Team

VERIS System is developed and commercially maintained by the **Veris Dev Team** under **FC-SSC**, offering attendance and organization management (Basic tier) and financial management (Plus tier) as subscription services for course organizations and supreme students councils. The system is built with scalability and extensibility in mind, allowing for future enhancements and integrations.

## License

This project is licensed for commercial use by the Veris Dev Team (FC-SSC). Unauthorized redistribution or resale is not permitted.