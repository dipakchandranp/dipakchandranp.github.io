// Daily challenge constants for the page. Boards and answers live only in the Worker (signed-in players); nothing here is secret.
// The calendar starts on DAILY_START (no back-filled days) and ends on DAILY_END. To extend the season, change DAILY_END here AND in
// worker/src/daily.js (`npm run regen` in /workspace/worker does both for you, then redeploy the Worker).
export const ROUNDS = 4;                                  // rounds per day, each worth up to 100 points
export const DAILY_START = '2026-10-25', DAILY_END = '2027-04-25';
