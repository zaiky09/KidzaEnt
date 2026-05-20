# KidzaEnt Marketplace

A full-stack marketplace web app for **Kidza Enterprise Ltd**, where users browse goods and services, describe what they feel like eating in natural language, and let an AI assistant turn that craving into a purchasable cart.

> ⚠️ **Status:** Work in progress. Features, APIs, and structure may change.

---

## Overview

KidzaEnt is more than a catalogue. Two features set it apart:

- **AI-powered ingredient recommendations.** A user types something like *"I feel like making chicken biryani tonight"* and the app, powered by the Gemini API, returns the required ingredients available in the marketplace — ready to add to a cart.
- **Trip tracking.** Real-time location tracking using the browser Geolocation API, designed to follow deliveries from the seller to the buyer. Planned migration to the Google Maps API for richer mapping, routing, and place data.

The goal is to remove the friction between *"I want this"* and *"I have what I need to make it,"* while keeping logistics transparent end-to-end.

---

## Tech Stack

**Backend**
- Node.js + Express 5
- MongoDB via Mongoose
- JWT authentication (`jsonwebtoken`) + `bcryptjs` for password hashing
- Real-time communication with Socket.IO
- Email via Nodemailer
- AI features via `@google/generative-ai` (Gemini)
- Configuration via `dotenv`

**Frontend**
- React (JavaScript)
- Browser Geolocation API for trip tracking
- Google Maps API *(planned)*

**Tooling**
- Git / GitHub
- AI-assisted development with Claude, ChatGPT, and Gemini

---

## Project Structure

```
KidzaEnt/
├── backend/                 # Express API, Mongoose models, Socket.IO server
├── marketplace-frontend/    # React client
├── package.json             # Root dependencies
└── .gitignore
```

---

## Getting Started

### Prerequisites
- Node.js (LTS recommended)
- npm
- A running MongoDB instance (local or MongoDB Atlas)
- A Google AI Studio API key for Gemini

### 1. Clone

```bash
git clone https://github.com/zaiky09/KidzaEnt.git
cd KidzaEnt
```

### 2. Install dependencies

```bash
# Root / backend dependencies
npm install

# Frontend dependencies
cd marketplace-frontend
npm install
cd ..
```

### 3. Configure environment variables

Create a `.env` file in the project root (or `backend/`) with the following:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/kidzaent

# Authentication
JWT_SECRET=replace-with-a-long-random-string
JWT_EXPIRES_IN=7d

# Gemini AI
GEMINI_API_KEY=your-google-ai-studio-key

# Email (Nodemailer)
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-email-password
```

> Never commit your `.env` file. It is already covered by `.gitignore`.

### 4. Run the app

```bash
# Start the backend
npm run dev    # or: node backend/index.js

# In a separate terminal, start the frontend
cd marketplace-frontend
npm start
```

The frontend will run on `http://localhost:3000` and the API on `http://localhost:5000` by default.

---

## Key Features

### 🛒 Marketplace
Browse and purchase goods and services offered by Kidza Enterprise Ltd. Listings are stored in MongoDB and served through a REST API.

### 🤖 AI Recipe-to-Ingredients
Type what you feel like eating in plain language. The Gemini API parses the request and returns a list of ingredients — cross-referenced against the marketplace inventory and ready to add to a cart.

### 📍 Trip Tracking
Real-time delivery tracking powered by the browser Geolocation API and Socket.IO for live updates between client and server.

### 🔐 Authentication
JWT-based authentication with bcrypt-hashed passwords. Separate flows for buyers and sellers (in development).

### 📧 Transactional Email
Order confirmations and account notifications via Nodemailer.

---

## Roadmap

- [ ] Complete buyer and seller flows
- [ ] Cart and checkout
- [ ] Payment integration
- [ ] Migrate trip tracking from raw Geolocation to **Google Maps API** (routing, place data, ETA)
- [ ] Order management dashboard
- [ ] Mobile-responsive polish
- [ ] Deployment (frontend + backend)
- [ ] Automated tests

---

## Built With AI

Development of KidzaEnt makes active use of AI tools — **Claude, ChatGPT, and Gemini** — for code generation, debugging, code review, and rapid prototyping. The Gemini API is also a product feature, powering the recipe-to-ingredients recommendation engine.

---

## Author

**Zamil M. Sheikh**
Nairobi, Kenya
- 📧 [zamilmozamil@outlook.com](mailto:zamilmozamil@outlook.com)
- 🌐 [Portfolio](https://zaiky09.github.io/Zamil-Portfolio/)
- 💻 [GitHub](https://github.com/zaiky09)
- 💼 [LinkedIn](https://www.linkedin.com/in/zamil-mozamil-7523aa1b6)

---

## License

ISC. See the root `package.json` for license metadata.
