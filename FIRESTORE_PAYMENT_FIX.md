# Jupiter Admin – Firebase payment loading fix

The dashboard was able to render its shell, but one failed Firestore read could stop the whole data-loading step. The updated code now loads each dashboard source independently, shows a useful error instead of a blank area, and watches `payments` live.

## Important: deploy the Firestore rules

The Android app writes successful PayHere records to the top-level `payments` collection. The admin must be allowed to read that collection.

The included `firestore.rules` is already configured for the current admin email:

`kusal@gmail.com`

If you change `ADMIN_EMAIL` in `src/assets/js/firebase-config.js`, change the email in `firestore.rules` too.

### Option A – Firebase Console
1. Open Firebase Console.
2. Select project `jclothing-8a30b`.
3. Open Firestore Database → Rules.
4. Replace the rules with the contents of `firestore.rules`.
5. Click Publish.
6. Sign out of Jupiter Admin, sign back in, and refresh Dashboard / Orders.

### Option B – Firebase CLI
From the project root:

```bash
firebase login
firebase use jclothing-8a30b
firebase deploy --only firestore:rules
```

## What was fixed in the web admin

- Dashboard no longer becomes completely blank when one collection read fails.
- Live `payments` listener refreshes recent payments after a successful mobile payment.
- Orders page reads `payments` first and supports `payment`, `orders`, and `order` as compatibility fallbacks.
- Payment IDs prefer the app's `paymentCode`.
- Payment amount accepts `price`, `amount`, `total`, `totalAmount`, or `grandTotal`.
- Customer and product names are enriched from `users` and `products` when only IDs were saved.
- Reports always render a visible 7-day chart, including zero-sales days.
- Firebase permission/network problems are shown in the UI instead of silently stopping JavaScript.

## Quick verification

1. Sign in to the Android app as a customer.
2. Complete a PayHere **Sandbox** payment.
3. Confirm the Android app shows `Payment saved successfully`.
4. Open Firestore → `payments` and confirm a new document exists.
5. Keep Jupiter Admin Dashboard open or refresh it.
6. The payment should appear under **Recent payments** and **Orders**.

If step 4 has no document, the problem is on the Android payment-save side, not the admin display side.
