// server/utils/jwt.js
// Summary: Small helper to sign a JWT with an id-bearing payload.


/*
[PRO] Purpose: Create compact JWTs with a guaranteed `id` claim.
Context: Some callers pass {_id}; normalize to {id} for consistency.
Edge cases: Missing id → pass-through (upstream should provide it).
Notes: Uses process.env.JWT_SECRET with a dev fallback.
*/
import jwt from "jsonwebtoken";

export function signToken(payload, opts = {}) {
  const secret = process.env.JWT_SECRET || "dev_secret";
  const { _id, id, ...rest } = payload || {};
  const finalPayload = { id: id || _id, ...rest };
  return jwt.sign(finalPayload, secret, { expiresIn: "7d", ...opts });
}
