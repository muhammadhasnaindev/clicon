// server/models/AboutPage.js

/*
[PRO] Purpose: Store the public “About” page content (hero + bullets) editable via admin.
Context: Centralizes a single document (key="about") instead of hardcoding copy in the frontend.
Edge cases: If the document doesn't exist yet, routes create it lazily; defaults keep UI stable.
Notes: Keep `key` unique for easy lookup; heroImageUrl points at /uploads and can be replaced.
*/
import mongoose from "mongoose";

const AboutPageSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, index: true, default: "about" },
    badge: { type: String, default: "WHO WE ARE" },
    title: {
      type: String,
      default: "Kinbo - largest electronics retail shop in the world.",
    },
    subtitle: {
      type: String,
      default:
        "Pellentesque ultricies, dui vel hendrerit lobortis, ipsum velit vestibulum risus, eu tincidunt diam lectus id magna. Praesent maximus lobortis neque at lorem rhoncus.",
    },
    bullets: {
      type: [String],
      default: [
        "Great 24/7 customer services.",
        "600+ Dedicated employee.",
        "50+ Branches all over the world.",
        "Over 1 Million Electronics Products",
      ],
    },
    heroImageUrl: { type: String, default: "/uploads/about/hero.jpg" },
  },
  { timestamps: true }
);

export default mongoose.model("AboutPage", AboutPageSchema);
