# AI Prompt Server

This is the backend server for the AI Prompt application, built with Node.js, Express, and MongoDB. 
## Features
- User Authentication (Email & Social)
- Organization Management
- AI Prompts Management (CRUD)
- Booking System with Capacity Management
- Payment Integration
- Premium User Membership System

## Technologies
- **Backend:** Node.js, Express
- **Database:** MongoDB
- **Authentication:** Custom implementation using MongoDB
- **Utilities:** `cors`, `dotenv`

## Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- MongoDB instance (Atlas or local)

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd AI-Prompt-server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env` file in the root directory and add the following:
   ```env
   PORT=8000
   MONGODB_URI=your_mongodb_connection_string
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```


