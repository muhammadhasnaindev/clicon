// server/routes/aboutPublic.js
// Public About page + Team listing (read-only).
// Summary: Loads/initializes About content, then returns hero + team list.
import express from "express";
import AboutPage from "../models/AboutPage.js";
import User from "../models/User.js";

const router = express.Router();

/*
[PRO] Purpose: Serve About page content + team list for public site.
Context: Original code worked but lacked rationale/structure markers.
Edge cases: Missing page doc -> create one; empty team -> fallback to admins/managers.
Notes: Read-only path; uses lean() for perf; response shape unchanged.
*/
router.get("/", async (_req, res) => {
  let page = await AboutPage.findOne({ key: "about" });
  if (!page) page = await AboutPage.create({});

  /*
  [PRO] Purpose: Prefer explicitly curated team cards (marketing control).
  Context: Was already querying showOnAbout; we keep it and document intent.
  Edge cases: No flagged users -> handled by fallback block below.
  Notes: Sorts by team.order then createdAt for stable deterministic output.
  */
  let team = await User.find(
    { "team.showOnAbout": true },
    "fullName displayName name email avatarUrl team createdAt"
  )
    .sort({ "team.order": 1, createdAt: 1 })
    .lean();

  /*
  [PRO] Purpose: Fallback when showOnAbout is not curated yet.
  Context: Marketing often hasn’t curated early on; fallback shows leadership.
  Edge cases: Caps at 8 to keep hero section tight; oldest-first for consistency.
  Notes: Still read-only; safe for public responses.
  */
  if (!team.length) {
    team = await User.find(
      { role: { $in: ["admin", "manager"] } },
      "fullName displayName name email avatarUrl team createdAt"
    )
      .sort({ createdAt: 1 })
      .limit(8)
      .lean();
  }

  /*
  [PRO] Purpose: Normalize response shape for frontend.
  Context: Frontend expects hero + team; keep same field names.
  Edge cases: Missing avatar -> default asset; name fallbacks in priority order.
  Notes: No PII beyond email fallback for name; public-safe payload.
  */
  res.json({
    hero: {
      badge: page.badge,
      title: page.title,
      subtitle: page.subtitle,
      bullets: page.bullets,
      imageUrl: page.heroImageUrl,
    },
    team: team.map((u) => ({
      id: String(u._id),
      name: u.displayName || u.fullName || u.name || u.email,
      title: u.team?.title || "",
      avatarUrl: u.avatarUrl || "/uploads/avatars/default.png",
      order: u.team?.order ?? 0,
    })),
  });
});

export default router;
