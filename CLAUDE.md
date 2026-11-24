# The Royal Clay Oven — Project & Deployment Rules

## 1. Dependency & Security Hygiene
- Always run `npm run security:check` (`npm audit --audit-level=moderate`) before committing dependency changes.
- On Hostinger (`clayoven.ie`) deployments, always run a clean install (`npm ci`) rather than reusing stale `node_modules/` so Hostinger's Node.js vulnerability scanner stays at 0 vulnerabilities.
- Never commit `.env` or database/SMTP/JWT credentials.

## 2. Verification Before Push
- Run `npm run lint` (`tsc --noEmit`) and `npm run build` (`vite build`) after frontend or shared utility edits.
- Restart `node server.js` after backend or database migration changes (`server/db/migrate.js`).

## 3. Local Development Ports
- Frontend Vite dev server: `http://localhost:3000` (`npm run dev`).
- Backend Express server: `http://localhost:5001` (`node server.js`, `PORT=5001` in `.env` to avoid macOS Control Center conflict on port `5000`).
