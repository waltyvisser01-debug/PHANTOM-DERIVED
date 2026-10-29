# PHANTOM DERIVED — Starter Prototype

This is a mobile-first installable website prototype for the PHANTOM DERIVED concept.

## What works now
- Responsive dark PHANTOM dashboard
- Manual / automatic mode selection UI
- Market and strategy selectors
- Stake, duration, and daily risk-limit settings UI
- PWA manifest and service worker

## What is NOT connected yet
- Deriv OAuth/account authorization
- Live ticks, balance, contract proposals, purchases, or trade monitoring
- Strategy signal generation
- Enforced risk controls on a backend
- Supabase authentication, license checks, and payments

The UI does not place trades. Do not advertise it as a live trading bot until those parts are implemented and tested.

## Deploy to Vercel
1. Extract the ZIP.
2. Create a new GitHub repository and upload these files to the repository root.
3. In Vercel, import that repository.
4. Framework preset: Other. Build command: leave blank. Output directory: `.`.
5. Deploy. Open the deployment URL on Android Chrome.
6. To install: Chrome menu → Add to Home screen / Install app.

## Next development stages
1. Register a Deriv API application and implement OAuth authorization.
2. Implement a server-side session/token handling layer; never put app secrets or long-lived tokens in browser code.
3. Add account-scoped trading endpoints and a strategy engine using Deriv's current official API documentation.
4. Add Supabase authentication, license validation, and database policies.
5. Add server-enforced stake, daily-loss, and stop-trading limits.
6. Run full demo-account tests, including disconnects, duplicate order prevention, and rejected contracts, before any live account support.

## Important
Trading can lose money. No win rate or profit is guaranteed. Follow Deriv's current API terms and local legal requirements before distributing a paid trading product.
