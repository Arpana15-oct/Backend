# Finance Dashboard Backend

A backend system for managing financial records with role-based access control, built with Node.js, Express, and MongoDB.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Role & Access Control](#role--access-control)
- [Design Decisions & Assumptions](#design-decisions--assumptions)

---

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (via Mongoose)
- **Authentication**: JSON Web Tokens (JWT)
- **Password Hashing**: bcryptjs
- **Environment Config**: dotenv

---

## Project Structure
├── config/
│   └── db.js                 # MongoDB connection
├── controllers/
│   ├── authcontroller.js     # Register, login
│   ├── dashboardcontroller.js# Analytics and summary APIs
│   ├── recordcontroller.js   # Financial record CRUD
│   └── usercontroller.js     # User management
├── middleware/
│   ├── authmiddleware.js     # JWT authentication
│   └── rolemiddleware.js     # Role-based access control
├── models/
│   ├── recordmodel.js        # Financial record schema
│   └── usermodel.js          # User schema
├── routes/
│   ├── authRoutes.js
│   ├── dashboardRoutes.js
│   ├── recordRoutes.js
│   └── userRoutes.js
├── app.js                    # Express app setup
├── server.js                 # Entry point
└── .env                      # Environment variables (not committed)

---

## Setup & Installation

**Prerequisites**: Node.js v18+ and a MongoDB instance (local or Atlas)
```bash
# 1. Clone the repository
git clone <your-repo-url>
cd finance-backend

# 2. Install dependencies
npm install

# 3. Create your environment file
cp .env.example .env
# Fill in your values (see Environment Variables section)

# 4. Start the development server
npm run dev
```

---

## Environment Variables

Create a `.env` file in the root directory:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=1d
NODE_ENV=development
```

| Variable | Description | Required |
|---|---|---|
| `PORT` | Port the server runs on | No (default: 5000) |
| `MONGO_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | Secret key for signing JWTs | Yes |
| `JWT_EXPIRES_IN` | Token expiry duration | No (default: 1d) |
| `NODE_ENV` | Environment mode | No (default: development) |

---

## API Reference

All protected routes require a Bearer token in the Authorization header:
Authorization: Bearer <your_token>

---

### Auth

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register a new user (always assigned viewer role) |
<img width="1886" height="905" alt="Screenshot 2026-04-03 211838" src="https://github.com/user-attachments/assets/0696a389-ee19-4d73-b29b-0ec621bb333f" />

<img width="1918" height="974" alt="Screenshot 2026-04-03 212106" src="https://github.com/user-attachments/assets/3ad2d53f-b9f2-4712-bf4f-f2f98d2d31c2" />


| POST | `/api/auth/login` | Public | Login and receive JWT token |
<img width="1919" height="980" alt="Screenshot 2026-04-03 212422" src="https://github.com/user-attachments/assets/4b64ae80-5094-4c71-8137-4fd2f710a414" />

<img width="1915" height="971" alt="Screenshot 2026-04-03 212538" src="https://github.com/user-attachments/assets/3660caf4-70d2-4d1d-9bc3-27f986ba167f" />


**Register request body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "secret123"
}
```

**Login request body:**
```json
{
  "email": "john@example.com",
  "password": "secret123"
}
```

**Login response:**
```json
{
  "success": true,
  "message": "Login successful.",
  "token": "eyJhbGci...",
  "user": {
    "id": "64abc...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "viewer",
    "status": "active"
  }
}
```

---

### Users (Admin only)

<img width="1367" height="779" alt="Screenshot 2026-04-03 213659" src="https://github.com/user-attachments/assets/b985f0b3-396f-4971-ae96-f7d7bbe0b20f" />

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/users` | Admin | Create a new user |
| GET | `/api/users` | Admin | Get all users (paginated) |
| GET | `/api/users/:id` | Admin | Get a single user |
| PATCH | `/api/users/:id` | Admin | Update name or email |
| PATCH | `/api/users/:id/role` | Admin | Change user role |
| PATCH | `/api/users/:id/status` | Admin | Activate or deactivate user |

**Query parameters for GET `/api/users`:**

| Param | Type | Description |
|---|---|---|
| `role` | string | Filter by role: `viewer`, `analyst`, `admin` |
| `status` | string | Filter by status: `active`, `inactive` |
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page (default: 10, max: 100) |

---

### Records
<img width="1917" height="979" alt="Screenshot 2026-04-03 213417" src="https://github.com/user-attachments/assets/f51f57a8-9f67-4fd7-8388-2318136efe83" />

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/records` | Admin, Analyst | Create a financial record |
| GET | `/api/records` | All roles | Get records (paginated, filterable) |
| GET | `/api/records/:id` | All roles | Get a single record |
| PATCH | `/api/records/:id` | Admin | Update a record |
| DELETE | `/api/records/:id` | Admin | Delete a record |

**Query parameters for GET `/api/records`:**

| Param | Type | Description |
|---|---|---|
| `type` | string | Filter by `income` or `expense` |
| `category` | string | Filter by category name |
| `startDate` | ISO date | Filter from date |
| `endDate` | ISO date | Filter to date |
| `search` | string | Search in category or notes |
| `sortBy` | string | Field to sort by (default: `date`) |
| `order` | string | `asc` or `desc` (default: `desc`) |
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page (default: 10, max: 100) |

**Create record request body:**
```json
{
  "amount": 5000,
  "type": "income",
  "category": "salary",
  "date": "2024-03-01",
  "note": "March salary"
}
```

---

### Dashboard

<img width="1337" height="759" alt="Screenshot 2026-04-03 213718" src="https://github.com/user-attachments/assets/3dc2e723-6ee0-41e7-80c9-0b3d94430b6e" />

| Method | Endpoint | Access | Description |
|---   |---                          |---|---|
| GET | `/api/dashboard/summary`    | All roles | Total income, expenses, net balance |
| GET | `/api/dashboard/summary/month` | All roles | Current month summary |
| GET | `/api/dashboard/categories` | All roles | Totals grouped by category and type |
| GET | `/api/dashboard/top-categories` | All roles | Top 5 spending categories |
| GET | `/api/dashboard/recent` | All roles | Latest 5 records |
| GET | `/api/dashboard/trends/monthly` | All roles | Month-by-month income and expense breakdown |

All dashboard endpoints support optional date range filtering:

| Param       | Type     | Description |
|---          |---       |---          |
| `startDate` | ISO date | Filter from date |
| `endDate`   | ISO date | Filter to date |

**Sample summary response:**
```json
{
  "success": true,
  "data": {
    "totalIncome": 50000,
    "totalExpense": 32000,
    "netBalance": 18000
  }
}
```

---


**Additional access rules:**
- Non-admin users can only see records they created
- Inactive users are blocked from all protected routes even with a valid token
- Admins cannot deactivate the last remaining active admin
- Admins cannot change their own role

---

## Design Decisions & Assumptions

**Self-registration always assigns viewer role**
Users who register via `/api/auth/register` are always assigned the `viewer` role regardless of what is sent in the request body. Role upgrades must be done by an admin via `PATCH /api/users/:id/role`. This prevents privilege escalation on registration.

**Admin registration:

If a valid adminSecret is provided during registration, the user will be assigned the admin role.

**Admin-created users get a temporary password**
When an admin creates a user via `POST /api/users`, a temporary password is auto-generated and returned in the response. The admin is responsible for sharing it with the user securely.

**Non-admin data scoping**
Viewers and analysts can only see records they personally created. Admins see all records across all users. This scoping is enforced at the controller level, not just the route level.

**Category normalization**
All category values are stored in lowercase at the database level. This ensures `"Food"`, `"food"`, and `"FOOD"` are treated as the same category in analytics and filtering.

**Token-based authentication**
JWTs are stateless and verified on every request. The user is fetched fresh from the database on each request rather than trusting the token payload alone — this ensures role or status changes take effect immediately without requiring re-login.

**Error visibility**
Detailed error messages and stack traces are only included in responses when `NODE_ENV=development`. Production responses return generic messages to avoid leaking internal details.
