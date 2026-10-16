# Jupiter Admin Panel

Dark Jupiter-branded admin panel for the Android clothing app.

## Current configuration
- Firebase project: `jclothing-8a30b`
- Admin email: `kusal@gmail.com`
- Payment source: Firestore `payments`
- Dashboard / Orders / Reports update from Firebase payment records

## Included
- Single-admin Firebase sign in
- Dashboard with users, payments, revenue and completed counts
- Live recent-payment table
- Product CRUD
- Category CRUD
- Customers list
- Read-only payment orders page
- Notifications sender
- Reports
- Cloudinary image uploads through a small Node server

## Run the frontend
```bash
npm install
npm run dev
```
Open the Vite URL, normally `http://localhost:3000/signin.html`.

## Required Firestore rule step
The admin cannot display customer/payment data if Firestore rules reject the read.
Read `FIRESTORE_PAYMENT_FIX.md` and publish the included `firestore.rules`.

## Run the upload server
```bash
cd server
cp .env.example .env
npm install
npm start
```
On Windows, copy `.env.example` to `.env` manually if `cp` is unavailable.

## Cloudinary setup
Put your Cloudinary values inside `server/.env`.
