# JUPITER ADMIN SETUP

## 1. Frontend
1. Extract the project.
2. Run `npm install`.
3. Run `npm run dev`.
4. Open `http://localhost:3000/signin.html`.
5. Sign in using the Firebase admin account configured in `src/assets/js/firebase-config.js`.

Current allowed admin email: `kusal@gmail.com`

## 2. Firestore permissions – required for Dashboard / Orders / Customers
1. Open `FIRESTORE_PAYMENT_FIX.md`.
2. Publish the included `firestore.rules` in Firebase Console, or deploy it with Firebase CLI.
3. Sign out and sign in again after publishing.

The Android app saves successful payment records under `payments`. The admin must have permission to read those documents.

## 3. Upload server
1. Open the `server` folder.
2. Run `npm install`.
3. Copy `.env.example` to `.env`.
4. Add:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
5. Run `npm start`.

## 4. Expected verification
- Products page loads `products`.
- Categories page loads `categories`.
- Customers page loads `users`.
- Dashboard recent payments and Orders load `payments`.
- Reports revenue is calculated from payment records.
- A new successful Android payment appears without needing to rebuild the admin project.
