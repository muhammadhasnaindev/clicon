
# 🛒 Clicon — Full Stack E-Commerce (MERN)

A modern and fully functional e-commerce web application featuring storefront shopping, product browsing, cart & checkout, orders, wishlist, compare, user dashboard, blog system, reviews, and an advanced **Admin Panel** with Role & Permission Management.

---

## 🚀 Tech Stack

| Layer      | Technologies Used |
|-----------|------------------|
| **Frontend** | React 18, Vite, Redux Toolkit, React Router, Tailwind CSS, MUI, React Query, Recharts, i18next |
| **Backend**  | Node.js, Express, MongoDB (Mongoose), JWT (Http-Only Cookies), Nodemailer |
| **Dev Tools** | Git, VS Code, NPM, MongoDB Compass / Atlas |

---

## 📂 Project Structure
clicon/
├─ client/ # Frontend (React + Vite)
│ ├─ src/
│ ├─ public/
│ └─ .env.example
│
└─ server/ # Backend (Node + Express + MongoDB)
├─ routes/
├─ models/
├─ utils/
└─ .env.example

---

## ⚙️ How to Run Locally

### 1️⃣ Start Backend API
```bash
cd server
cp .env.example .env
npm install
npm run dev
Backend will run on → http://localhost:4000
2️⃣ Start Frontend App 
cd client
cp .env.example .env
npm install
npm run dev
Frontend will run on → http://localhost:5173
🔐 Environment Variables
client/.env
VITE_API_URL=/api
VITE_BACKEND_ORIGIN=http://localhost:4000
server/.env
PORT=4000
MONGO_URI=mongodb://localhost:27017/clicon
JWT_SECRET=your-strong-secret
CLIENT_ORIGIN=http://localhost:5173
FRONTEND_ORIGIN=http://localhost:5173
DEMO_MODE=true
🔥 Features

✅ Product Browsing & Filters

✅ Wishlist & Compare

✅ Cart & Checkout

✅ Order Tracking

✅ Reviews & Ratings

✅ Blog / Posts System

✅ User Dashboard

✅ Admin Panel (Products, Orders, Posts, Support, Staff, Permissions)

✅ Multi-Language Ready (i18next)

✅ Secure Cookie-based Auth (No token exposure)
---

---

## 🖼️ Screenshots

| Page | Preview |
|------|---------|
| 🏠 Homepage | ![](client/public/screenshots/01_Homepage.png) |
| 🛍️ Shop Page | ![](client/public/screenshots/07_Shop-Page.png) |
| 📄 Product Detail | ![](client/public/screenshots/08_Product-Detail.png) |
| 🚚 Track Order | ![](client/public/screenshots/09_Track-Order.png) |
| 💖 Wishlist | ![](client/public/screenshots/12_Wishlist.png) |
| 💳 Checkout | ![](client/public/screenshots/14_Checkout.png) |
| ❓ FAQs | ![](client/public/screenshots/21_FAQs.png) |
| ℹ️ About Us | ![](client/public/screenshots/23_About-Us.png) |
| 📰 Blog List | ![](client/public/screenshots/25_Blog-List.png) |
| 👤 Dashboard | ![](client/public/screenshots/27_Dasboard.png) |
| 📦 Order History | ![](client/public/screenshots/28_Dashboard_Order-History.png) |


