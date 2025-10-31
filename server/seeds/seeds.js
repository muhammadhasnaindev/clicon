
// server/scripts/seedAll.js

/*
[PRO] Purpose: One-shot database seeder for local/dev environments.
Context: Provides realistic catalog, users, and example orders so the app boots with meaningful data.
Edge cases: Reruns should be idempotent where reasonable (users are upserted; products/orders are cleared to avoid dupes).
Notes: Intended for DEV. Reads MONGO_URI from config. Safe to re-run; do NOT use in production data sets.
*/
import mongoose from "mongoose";
import { MONGO_URI } from "../config.js";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";

/* -----------------------------------------------------------
   1) HELPERS
----------------------------------------------------------- */
/*
[PRO] Purpose: Small helpers for concise seed definitions (e.g., price wrapper).
Context: Keeps product fixtures readable while still populating nested shapes correctly.
Edge cases: Coerce to Number to avoid NaN/strings; gracefully handle missing "old" price.
Notes: Prefer explicit Number(...) to avoid implicit casts from JSON literals.
*/
const P = (p) => ({ price: { current: Number(p.current), old: p.old != null ? Number(p.old) : null } });

/*
[PRO] Purpose: Baseline elevated permissions for admin-like roles in seed users.
Context: Mirrors app-level permission taxonomy used by admin routes and UI.
Edge cases: Duplication with server constants is acceptable for seeds; divergence only affects dev UX.
Notes: If permission taxonomy changes, update this set to match new capabilities.
*/
const ADMINISH_PERMS = [
  "products:*", "products:write",
  "posts:*", "posts:write", "posts:read", "posts:read:own", "posts:write:own",
  "analytics:view",
  "orders:update",
  "users:read", "users:role:set", "users:permission:set",
  "settings:write",
];

/* -----------------------------------------------------------
   2) SOURCE PRODUCTS (base facts only)
   The enrichment step (attributes/specs/shipping/features) comes later.
----------------------------------------------------------- */
/*
[PRO] Purpose: Canonical product fixture list with only core properties.
Context: Keep it lightweight here; richer presentation and variant data is added during enrichment.
Edge cases: Ensure unique slugs; keep categories consistent with UI filters.
Notes: Image paths assume a dev uploads folder or placeholder routes in server.
*/
const products = [
  // ====== SMARTPHONES ======
  {
    title: "Samsung Galaxy S21 5G",
    slug: "samsung-galaxy-s21-5g",
    sku: "S21-5G",
    brand: "SAMSUNG",
    images: ["/uploads/galaxy_s21.png"],
    rating: 4.5,
    numReviews: 530,
    label: "FEATURED",
    ...P({ current: 2300 }),
    category: "SmartPhone",
    subcategory: "Android",
    tags: ["featured", "bestseller"],
  },
  {
    title: "Google Pixel 6 Pro",
    slug: "google-pixel-6-pro",
    sku: "PIX-6PRO",
    brand: "Google",
    images: ["/uploads/pixel.png"],
    rating: 4.6,
    numReviews: 312,
    ...P({ current: 899, old: 999 }),
    category: "SmartPhone",
    subcategory: "Android",
    discountText: "10% OFF",
    tags: ["flash", "new"],
  },
  {
    title: "Apple iPhone 12 64GB",
    slug: "apple-iphone-12-64gb",
    sku: "APP-IPHONE-12",
    brand: "Apple",
    images: ["/uploads/iphone_12.png"],
    rating: 4.7,
    numReviews: 6403,
    ...P({ current: 699, old: 749 }),
    discountText: "SALE",
    category: "SmartPhone",
    subcategory: "iOS",
  },

  // ====== TV / STREAMING ======
  {
    title: "4K UHD LED Smart TV with Chromecast Built-in",
    slug: "4k-uhd-led-smart-tv",
    sku: "TV4K-001",
    brand: "Generic",
    images: ["/uploads/controller.png"],
    rating: 4.3,
    numReviews: 653,
    label: "FEATURED",
    discountText: "31% OFF",
    ...P({ current: 220, old: 320 }),
    category: "TV",
    tags: ["featured"],
  },
  {
    title: "Chromecast with Google TV (4K)",
    slug: "chromecast-with-google-tv-4k",
    sku: "GGL-CHROMECAST-4K",
    brand: "Google",
    images: ["/uploads/chromecast_4k.png"],
    rating: 4.6,
    numReviews: 2201,
    ...P({ current: 49.99 }),
    category: "TV",
    subcategory: "Streaming",
    tags: ["featured"],
  },
  {
    title: "Fire TV Stick 4K Max (2023)",
    slug: "fire-tv-stick-4k-max-2023",
    sku: "AMZ-FIRETV-4KMAX",
    brand: "Amazon",
    images: ["/uploads/fire_tv_stick_4k_max.png"],
    rating: 4.6,
    numReviews: 3109,
    ...P({ current: 54.99, old: 59.99 }),
    discountText: "SAVE $5",
    category: "TV",
    subcategory: "Streaming",
  },

  // ====== COMPUTER ACCESSORIES ======
  {
    title: "T02D T6 True Wireless Earbuds Bluetooth Headphones",
    slug: "t02d-t6-earbuds",
    sku: "TOZO-T6",
    brand: "TOZO",
    images: ["/uploads/tz02.png"],
    rating: 4.7,
    numReviews: 732,
    label: "HOT",
    ...P({ current: 70 }),
    category: "Computer Accessories",
    subcategory: "Headphone",
    tags: ["featured", "bestseller"],
  },
  {
    title: "Bose Sport Earbuds - Wireless Bluetooth In-Ear",
    slug: "bose-sport-earbuds",
    sku: "BOSE-SPRT",
    brand: "Bose",
    images: ["/uploads/bose_earbuds.png"],
    rating: 4.8,
    numReviews: 112,
    ...P({ current: 149, old: 199 }),
    discountText: "25% OFF",
    category: "Computer Accessories",
    subcategory: "Headphone",
    tags: ["flash"],
  },
  {
    title: "Amazon Basics High-Speed HDMI Cable 6ft",
    slug: "amazon-basics-hdmi-6ft",
    sku: "HDMI-6FT",
    brand: "Amazon",
    images: ["/uploads/hdmi_cable.png"],
    rating: 4.9,
    numReviews: 394,
    label: "BEST DEALS",
    ...P({ current: 12.99 }),
    category: "Computer Accessories",
    subcategory: "Accessories",
    tags: ["featured"],
  },
  {
    title: "Dell Optiplex 7000/7480 All-In-One Computer Monitor",
    slug: "dell-optiplex-7000-7480-monitor",
    sku: "DELL-7480",
    brand: "Dell",
    images: ["/uploads/monitor.png"],
    rating: 4.2,
    numReviews: 426,
    ...P({ current: 250 }),
    category: "Computer Accessories",
    subcategory: "Monitor",
  },
  {
    title: "Wired Over-Ear Gaming Headphones with USB",
    slug: "wired-over-ear-gaming-headset-usb",
    sku: "GAME-HS-USB",
    brand: "HyperX",
    images: ["/uploads/headset.png"],
    rating: 4.5,
    numReviews: 536,
    ...P({ current: 79.99 }),
    category: "Computer Accessories",
    subcategory: "Headphone",
  },
  {
    title: "Mechanical Keyboard & Mouse Combo",
    slug: "mech-keyboard-mouse-combo",
    sku: "KBMS-SET",
    brand: "Logi",
    images: ["/uploads/headphones.png"],
    rating: 4.4,
    numReviews: 198,
    ...P({ current: 59.99, old: 79.99 }),
    discountText: "25% OFF",
    category: "Computer Accessories",
    subcategory: "Keyboard & Mouse",
  },
  {
    title: "1080p USB Webcam with Privacy Cover",
    slug: "1080p-usb-webcam-privacy",
    sku: "WEBCAM-1080",
    brand: "Aukey",
    images: ["/uploads/sony_camera.png"],
    rating: 4.1,
    numReviews: 134,
    ...P({ current: 29.99 }),
    category: "Computer Accessories",
    subcategory: "Webcam",
  },
  {
    title: "All-in-One Inkjet Printer Wi-Fi Duplex",
    slug: "aio-inkjet-printer-wifi",
    sku: "PRN-AIO",
    brand: "Canon",
    images: ["/uploads/machine.png"],
    rating: 4.0,
    numReviews: 92,
    ...P({ current: 129, old: 179 }),
    discountText: "28% OFF",
    category: "Computer Accessories",
    subcategory: "Printer",
  },
  {
    title: "Apple AirPods Pro (2nd Gen)",
    slug: "apple-airpods-pro-2nd-gen",
    sku: "APP-APPRO2",
    brand: "Apple",
    images: ["/uploads/airpods_pro_2.png"],
    rating: 4.8,
    numReviews: 2153,
    label: "HOT",
    ...P({ current: 199, old: 249 }),
    discountText: "SAVE $50",
    category: "Computer Accessories",
    subcategory: "Headphone",
    tags: ["featured"],
  },
  {
    title: "Sony WH-1000XM4 Wireless Noise Cancelling Headphones",
    slug: "sony-wh-1000xm4",
    sku: "SONY-WH1000XM4",
    brand: "Sony",
    images: ["/uploads/sony_wh1000xm4.png"],
    rating: 4.9,
    numReviews: 5401,
    ...P({ current: 278, old: 349 }),
    discountText: "20% OFF",
    category: "Computer Accessories",
    subcategory: "Headphone",
    tags: ["bestseller"],
  },
  {
    title: "Logitech MX Master 3S Wireless Mouse",
    slug: "logitech-mx-master-3s",
    sku: "LOGI-MX3S",
    brand: "Logitech",
    images: ["/uploads/logi_mx_master_3s.png"],
    rating: 4.8,
    numReviews: 1789,
    ...P({ current: 99 }),
    category: "Computer Accessories",
    subcategory: "Mouse",
    tags: ["featured"],
  },
  {
    title: "Razer Huntsman Mini 60% Gaming Keyboard",
    slug: "razer-huntsman-mini",
    sku: "RAZ-HUNTMINI",
    brand: "Razer",
    images: ["/uploads/razer_huntsman_mini.png"],
    rating: 4.6,
    numReviews: 902,
    ...P({ current: 89, old: 119 }),
    discountText: "25% OFF",
    category: "Computer Accessories",
    subcategory: "Keyboard & Mouse",
  },
  {
    title: "Anker PowerCore 20000mAh Power Bank",
    slug: "anker-powercore-20000",
    sku: "ANK-PWR20000",
    brand: "Anker",
    images: ["/uploads/anker_powercore_20000.png"],
    rating: 4.7,
    numReviews: 3310,
    ...P({ current: 45, old: 59 }),
    discountText: "SAVE $14",
    category: "Computer Accessories",
    subcategory: "Accessories",
  },
  {
    title: "SanDisk Ultra 128GB microSDXC UHS-I",
    slug: "sandisk-ultra-128gb-microsd",
    sku: "SAND-USD128",
    brand: "SanDisk",
    images: ["/uploads/sandisk_ultra_128gb.png"],
    rating: 4.8,
    numReviews: 8200,
    ...P({ current: 19.99, old: 24.99 }),
    discountText: "BEST DEALS",
    category: "Computer Accessories",
    subcategory: "Storage",
  },
  {
    title: "TP-Link Archer AX55 Wi-Fi 6 Router",
    slug: "tp-link-archer-ax55",
    sku: "TPL-AX55",
    brand: "TP-Link",
    images: ["/uploads/tplink_ax55.png"],
    rating: 4.7,
    numReviews: 990,
    ...P({ current: 129.99, old: 149.99 }),
    discountText: "SAVE $20",
    category: "Computer Accessories",
    subcategory: "Networking",
  },
  {
    title: "Canon PIXMA Wireless Photo Printer",
    slug: "canon-pixma-wireless-photo-printer",
    sku: "CAN-PIXMA-6420",
    brand: "Canon",
    images: ["/uploads/canon_pixma.png"],
    rating: 4.2,
    numReviews: 411,
    ...P({ current: 119 }),
    category: "Computer Accessories",
    subcategory: "Printer",
  },
  {
    title: "HP 24\" FHD IPS Monitor (75Hz)",
    slug: "hp-24fhd-ips-monitor",
    sku: "HP-24FHD-IPS",
    brand: "HP",
    images: ["/uploads/hp_24fhd_ips.png"],
    rating: 4.5,
    numReviews: 1330,
    ...P({ current: 159, old: 189 }),
    discountText: "15% OFF",
    category: "Computer Accessories",
    subcategory: "Monitor",
  },
  {
    title: "Kingston NV1 1TB NVMe SSD",
    slug: "kingston-nv1-1tb-nvme-ssd",
    sku: "KING-NV1-1TB",
    brand: "Kingston",
    images: ["/uploads/kingston_nv1_1tb.png"],
    rating: 4.8,
    numReviews: 5300,
    ...P({ current: 59.99, old: 79.99 }),
    discountText: "BEST DEALS",
    category: "Computer Accessories",
    subcategory: "Storage",
  },
  {
    title: "Seagate Portable 2TB External HDD USB 3.0",
    slug: "seagate-2tb-external-hdd",
    sku: "SEA-EXHDD-2TB",
    brand: "Seagate",
    images: ["/uploads/seagate_2tb.png"],
    rating: 4.7,
    numReviews: 4200,
    ...P({ current: 62.99 }),
    category: "Computer Accessories",
    subcategory: "Storage",
  },
  {
    title: "Elgato Stream Deck Mini",
    slug: "elgato-stream-deck-mini",
    sku: "ELG-STREAMDECK-MINI",
    brand: "Elgato",
    images: ["/uploads/elgato_stream_deck_mini.png"],
    rating: 4.8,
    numReviews: 1140,
    ...P({ current: 79.99 }),
    category: "Computer Accessories",
    subcategory: "Creator Gear",
  },
  {
    title: "Blue Yeti USB Microphone",
    slug: "blue-yeti-usb-microphone",
    sku: "BLUE-YETI-USB",
    brand: "Blue",
    images: ["/uploads/blue_yeti_usb.png"],
    rating: 4.7,
    numReviews: 3500,
    ...P({ current: 109.99, old: 129.99 }),
    discountText: "SAVE $20",
    category: "Computer Accessories",
    subcategory: "Audio",
  },
  {
    title: "Logitech C920x Pro HD Webcam",
    slug: "logitech-c920x-pro-hd-webcam",
    sku: "LOGI-C920X",
    brand: "Logitech",
    images: ["/uploads/logi_c920x.png"],
    rating: 4.6,
    numReviews: 7800,
    ...P({ current: 59.99, old: 69.99 }),
    discountText: "BEST DEALS",
    category: "Computer Accessories",
    subcategory: "Webcam",
  },
  {
    title: "Anker 7-in-1 USB-C Hub (4K HDMI, 100W PD)",
    slug: "anker-7-in-1-usb-c-hub",
    sku: "ANK-USBC-HUB-7IN1",
    brand: "Anker",
    images: ["/uploads/anker_usbc_hub_7in1.png"],
    rating: 4.7,
    numReviews: 2100,
    ...P({ current: 34.99, old: 49.99 }),
    discountText: "30% OFF",
    category: "Computer Accessories",
    subcategory: "Accessories",
  },

  // ====== LAPTOPS / TABLETS / WEARABLE ======
  {
    title: "MacBook Pro M1 Max 32GB/1TB",
    slug: "macbook-pro-m1-max-32-1tb",
    sku: "MBP-M1MAX",
    brand: "Apple",
    images: ["/uploads/macbook.png"],
    rating: 4.9,
    numReviews: 1201,
    label: "FEATURED",
    ...P({ current: 1999, old: 2299 }),
    discountText: "SAVE $300",
    category: "Computer & Laptop",
    tags: ["featured", "new"],
  },
  {
    title: "Apple iPad Air (5th Gen) 10.9\" 64GB Wi-Fi",
    slug: "apple-ipad-air-5th-gen",
    sku: "APP-IPADAIR-5",
    brand: "Apple",
    images: ["/uploads/ipad_air_5.png"],
    rating: 4.9,
    numReviews: 1540,
    ...P({ current: 599, old: 649 }),
    discountText: "SAVE $50",
    category: "Tablet",
    tags: ["featured", "new"],
  },
  {
    title: "ASUS TUF Gaming A15 (Ryzen 5, RTX 3060)",
    slug: "asus-tuf-gaming-a15-rtx3060",
    sku: "ASUS-TUF-A15",
    brand: "ASUS",
    images: ["/uploads/asus_tuf_a15.png"],
    rating: 4.6,
    numReviews: 721,
    label: "HOT",
    ...P({ current: 999, old: 1199 }),
    discountText: "SAVE $200",
    category: "Computer & Laptop",
    tags: ["featured"],
  },
  {
    title: "Apple Watch Series 7 GPS 41mm",
    slug: "apple-watch-series-7-gps-41mm",
    sku: "APP-WATCH-S7-41",
    brand: "Apple",
    images: ["/uploads/apple_watch_series7_41.png"],
    rating: 4.8,
    numReviews: 2411,
    ...P({ current: 279, old: 329 }),
    discountText: "SALE",
    category: "Wearable Technology",
    tags: ["featured"],
  },
  {
    title: "Samsung Galaxy Buds2 Pro",
    slug: "samsung-galaxy-buds2-pro",
    sku: "SAM-BUDS2PRO",
    brand: "SAMSUNG",
    images: ["/uploads/galaxy_buds2_pro.png"],
    rating: 4.7,
    numReviews: 1640,
    ...P({ current: 149, old: 199 }),
    discountText: "25% OFF",
    category: "Computer Accessories",
    subcategory: "Headphone",
  },
  {
    title: "Xiaomi Mi Band 7 Fitness Tracker",
    slug: "xiaomi-mi-band-7",
    sku: "XIA-MIBAND7",
    brand: "Xiaomi",
    images: ["/uploads/xiaomi_miband_7.png"],
    rating: 4.6,
    numReviews: 2870,
    ...P({ current: 39.99 }),
    category: "Wearable Technology",
  },
  {
    title: "DJI Osmo Mobile 6 Smartphone Gimbal",
    slug: "dji-osmo-mobile-6",
    sku: "DJI-OSMO-M6",
    brand: "DJI",
    images: ["/uploads/dji_osmo_mobile_6.png"],
    rating: 4.7,
    numReviews: 905,
    ...P({ current: 129, old: 159 }),
    discountText: "SAVE $30",
    category: "Camera & Photo",
    subcategory: "Accessories",
  },
  {
    title: "Xbox Series S 512GB + Wireless Controller (EU)",
    slug: "xbox-series-s-512gb",
    sku: "XBOX-S-512",
    brand: "Microsoft",
    images: ["/uploads/xbox.png"],
    rating: 4.6,
    numReviews: 882,
    ...P({ current: 299 }),
    category: "Gaming Console",
    tags: ["flash", "featured"],
  },
];

/* -----------------------------------------------------------
   3) ENRICHMENT: attributes/adjustments, description, features,
      shippingInfo and SPECIFICATIONS (by category + overrides)
----------------------------------------------------------- */
/*
[PRO] Purpose: Transform base products into rich, UI-ready items (attributes, specs, shipping, etc.).
Context: Keeps seed data realistic enough for variant pickers, PDP sections, and comparison widgets.
Edge cases: Category/subcategory typos could reduce richness; functions include conservative fallbacks.
Notes: Computation-only; does not mutate DB directly — only the in-memory fixtures.
*/
const PALETTES = {
  neutral: ["#000000", "#f5f5f5", "#bdbdbd"],
  phone: ["Black", "White", "Blue"],
  fun: ["#222831", "#3A86FF", "#FF006E"],
  watch: ["#000000", "#f0f0f0", "#2b6cb0"],
  audio: ["#000000", "#f5f5f5", "#9c27b0"],
};

function pickColors(p) {
  const cat = (p.category || "").toLowerCase();
  if (/smartphone/.test(cat)) return PALETTES.phone;
  if (/wearable/.test(cat)) return PALETTES.watch;
  if (/headphone|earbud/.test((p.subcategory || "").toLowerCase()) || /headphone/.test(cat))
    return PALETTES.audio;
  if (/tv|monitor/.test(cat)) return PALETTES.neutral;
  if (/computer/.test(cat)) return PALETTES.neutral;
  return PALETTES.neutral;
}

function buildAttributesByCategory(p) {
  const attributes = [];
  const adjustments = {};
  const addColor = (vals) => {
    const colors = vals.slice(0, 3);
    attributes.push({ key: "color", label: "Color", kind: "swatch", values: colors, required: false, uiOrder: 1 });
    p.colors = colors;
  };

  switch ((p.category || "").toLowerCase()) {
    case "computer & laptop": {
      addColor(pickColors(p));
      const size = ["13-inch", "15-inch"];
      const memory = ["8GB", "16GB", "32GB"];
      const storage = ["256GB SSD", "512GB SSD", "1TB SSD"];
      attributes.push({ key: "size", label: "Size", kind: "select", values: size, required: true, uiOrder: 2 });
      attributes.push({ key: "memory", label: "Memory", kind: "select", values: memory, required: true, uiOrder: 3 });
      attributes.push({ key: "storage", label: "Storage", kind: "select", values: storage, required: true, uiOrder: 4 });
      adjustments.size = { "15-inch": 300 };
      adjustments.memory = { "16GB": 200, "32GB": 500 };
      adjustments.storage = { "512GB SSD": 250, "1TB SSD": 550 };
      p.size = size; p.memory = memory; p.storage = storage;
      break;
    }
    case "smartphone": {
      addColor(pickColors(p));
      const storage = ["64GB", "128GB", "256GB"];
      attributes.push({ key: "storage", label: "Storage", kind: "select", values: storage, required: true, uiOrder: 3 });
      adjustments.storage = { "128GB": 100, "256GB": 220 };
      attributes.push({ key: "carrier", label: "Carrier", kind: "select", values: ["Unlocked", "AT&T", "Verizon"], required: false, uiOrder: 5 });
      p.storage = storage;
      break;
    }
    case "wearable technology": {
      const colors = pickColors(p);
      const size = ["41mm", "45mm"];
      attributes.push({ key: "color", label: "Color", kind: "swatch", values: colors, required: false, uiOrder: 1 });
      attributes.push({ key: "caseSize", label: "Case Size", kind: "select", values: size, required: true, uiOrder: 2 });
      attributes.push({ key: "band", label: "Band", kind: "select", values: ["Sport Band", "Milanese Loop", "Leather"], required: true, uiOrder: 3 });
      adjustments.caseSize = { "45mm": 30 };
      adjustments.band = { "Milanese Loop": 50, "Leather": 40 };
      p.size = size;
      break;
    }
    case "computer accessories": {
      const sub = (p.subcategory || "").toLowerCase();
      if (/headphone/.test(sub)) {
        addColor(pickColors(p));
        if (/airpods|pro|buds/i.test(p.title)) {
          attributes.push({ key: "case", label: "Charging Case", kind: "select", values: ["USB-C", "Lightning"], required: false, uiOrder: 3 });
          adjustments.case = { "USB-C": 10 };
        }
      } else if (/monitor/.test(sub)) {
        const size = ["24-inch", "27-inch"];
        attributes.push({ key: "size", label: "Size", kind: "select", values: size, required: true, uiOrder: 2 });
        attributes.push({ key: "refresh", label: "Refresh Rate", kind: "select", values: ["60Hz", "75Hz"], required: false, uiOrder: 3 });
        adjustments.size = { "27-inch": 70 };
      } else if (/printer/.test(sub)) {
        attributes.push({ key: "bundle", label: "Bundle", kind: "select", values: ["Printer Only", "Printer + 2x Ink", "Printer + 4x Ink"], required: false, uiOrder: 2 });
        attributes.push({ key: "connectivity", label: "Connectivity", kind: "select", values: ["Wi-Fi", "USB"], required: false, uiOrder: 3 });
        adjustments.bundle = { "Printer + 2x Ink": 25, "Printer + 4x Ink": 45 };
      } else if (/accessories/.test(sub)) {
        if (/hdmi|cable/i.test(p.title)) {
          attributes.push({ key: "length", label: "Length", kind: "select", values: ["3ft", "6ft", "10ft"], required: true, uiOrder: 2 });
          adjustments.length = { "6ft": 2, "10ft": 4 };
        }
        if (/hub|7-in-1/i.test(p.title)) {
          attributes.push({ key: "pack", label: "Pack Size", kind: "select", values: ["Single", "2-Pack"], required: false, uiOrder: 3 });
          adjustments.pack = { "2-Pack": 6 };
        }
      } else if (/storage/.test(sub)) {
        attributes.push({ key: "capacity", label: "Capacity", kind: "select", values: ["1TB", "2TB"], required: true, uiOrder: 2 });
        adjustments.capacity = { "2TB": 18 };
      } else {
        addColor(pickColors(p));
      }
      break;
    }
    case "tv": {
      const size = ["43-inch", "55-inch", "65-inch"];
      attributes.push({ key: "size", label: "Size", kind: "select", values: size, required: true, uiOrder: 2 });
      attributes.push({ key: "refresh", label: "Refresh Rate", kind: "select", values: ["60Hz", "120Hz"], required: false, uiOrder: 3 });
      adjustments.size = { "55-inch": 150, "65-inch": 350 };
      break;
    }
    case "camera & photo": {
      addColor(PALETTES.neutral);
      if (/osmo|gimbal/i.test(p.title)) {
        attributes.push({ key: "kit", label: "Kit", kind: "select", values: ["Standard", "Creator Combo"], required: false, uiOrder: 3 });
        adjustments.kit = { "Creator Combo": 30 };
      } else {
        attributes.push({ key: "kit", label: "Kit", kind: "select", values: ["Body", "Body + Lens"], required: false, uiOrder: 3 });
        adjustments.kit = { "Body + Lens": 300 };
      }
      break;
    }
    case "gaming console": {
      addColor(PALETTES.neutral);
      attributes.push({ key: "bundle", label: "Bundle", kind: "select", values: ["Console Only", "Console + Extra Controller"], required: false, uiOrder: 3 });
      adjustments.bundle = { "Console + Extra Controller": 49 };
      break;
    }
    case "tablet": {
      addColor(PALETTES.neutral);
      const storage = ["64GB", "256GB"];
      attributes.push({ key: "storage", label: "Storage", kind: "select", values: storage, required: true, uiOrder: 3 });
      adjustments.storage = { "256GB": 100 };
      break;
    }
    default: {
      addColor(pickColors(p));
    }
  }

  return { attributes, adjustments };
}

function buildSpecsByCategory(p) {
  const c = (p.category || "").toLowerCase();
  const s = (p.subcategory || "").toLowerCase();
  if (/computer & laptop/.test(c)) {
    return {
      processor: "Apple M1 / AMD / Intel (varies by model)",
      memory: "8GB / 16GB / 32GB",
      storage: "256GB - 1TB SSD",
      display: "13-15\" Retina / IPS",
      graphics: "Integrated / Dedicated",
      keyboard: "Backlit",
      os: "macOS / Windows",
      ports: "USB-C / Thunderbolt / HDMI (varies)",
      warranty: "1 Year",
    };
  }
  if (/smartphone/.test(c)) {
    return {
      display: "6.1–6.7\" 120Hz OLED (varies)",
      chip: "A-series / Snapdragon (varies)",
      memory: "6–12GB RAM",
      storage: "64–256GB",
      cameras: "Wide + Ultra-wide + Tele (varies)",
      battery: "4000–5000 mAh",
      os: "Android / iOS",
      network: "5G / LTE",
      warranty: "1 Year",
    };
  }
  if (/tv/.test(c)) {
    return {
      screenSize: "43-65 inch",
      panel: "LED",
      resolution: "4K (3840x2160)",
      refreshRate: "60/120 Hz",
      smartOS: "Google TV / Fire TV / Roku (varies)",
      hdmi: 3,
      warranty: "1 Year",
    };
  }
  if (/monitor/.test(s)) {
    return {
      size: "24-27 inch",
      panel: "IPS",
      resolution: "1920x1080",
      refreshRate: "60-75 Hz",
      response: "5 ms",
      inputs: "HDMI, VGA",
      warranty: "1 Year",
    };
  }
  if (/headphone/.test(s)) {
    return {
      type: "Over-Ear / In-Ear",
      connection: "Bluetooth 5.x",
      noiseCancel: "ANC (model-dependent)",
      battery: "Up to 24-30 hours",
      microphones: "Dual / 3-Mic (varies)",
      charging: "USB-C / Lightning",
      warranty: "1 Year",
    };
  }
  if (/printer/.test(s)) {
    return {
      type: "Inkjet",
      functions: "Print / Copy / Scan",
      connectivity: "Wi-Fi, USB",
      speed: "Up to 15 ppm",
      paper: "A4/Letter",
      warranty: "1 Year",
    };
  }
  if (/storage/.test(s)) {
    return {
      capacity: "128GB -2TB (varies)",
      interface: "USB 3.0 / NVMe",
      readSpeed: "Up to 2100 MB/s (NVMe) / 120 MB/s (HDD)",
      warranty: "3 Years",
    };
  }
  if (/tablet/.test(c)) {
    return {
      display: "10-11 inch IPS",
      storage: "64 / 256GB",
      memory: "4-8GB RAM",
      os: "iPadOS / Android",
      battery: "10 hours",
      warranty: "1 Year",
    };
  }
  if (/wearable/.test(c)) {
    return {
      caseSize: "41 / 45mm",
      sensors: "HR, SpO2, GPS",
      waterResist: "50m",
      battery: "18-36 hours",
      warranty: "1 Year",
    };
  }
  return { warranty: "1 Year" };
}

/*
[PRO] Purpose: Targeted per-product tuning where generic category rules fall short.
Context: Lets us override attributes/adjustments/specs for marquee items (e.g., MacBook, Watch, AirPods).
Edge cases: Keys must match product slug; partial overrides are merged conservatively.
Notes: Leave undefined to skip removal; assign specific values to extend/override.
*/
const perSlugOverrides = {
  "macbook-pro-m1-max-32-1tb": {
    specs: {
      processor: "Apple M1 Max 10-core",
      memory: "32GB unified",
      storage: "1TB SSD",
      display: '14" Liquid Retina XDR',
      graphics: "32-core GPU",
      ports: "3× Thunderbolt 4, HDMI, SDXC, MagSafe",
      weight: "1.6 kg",
    },
    adjustments: {
      caseSize: undefined,
      size: { "15-inch": 300 },
      memory: { "16GB": 200, "32GB": 500 },
      storage: { "512GB SSD": 250, "1TB SSD": 550 },
      color: { "#bdbdbd": 50 },
    },
  },
  "apple-watch-series-7-gps-41mm": {
    specs: {
      caseSize: "41mm",
      display: "Always-On Retina",
      battery: "18 hours",
      connectivity: "GPS",
      band: "Sport Band",
    },
    attributes: [{ key: "band", required: true }],
    adjustments: { caseSize: { "45mm": 30 }, band: { "Milanese Loop": 50, "Leather": 40 } },
  },
  "apple-airpods-pro-2nd-gen": {
    specs: {
      type: "In-Ear",
      noiseCancel: "Active Noise Cancellation",
      chip: "Apple H2",
      charging: "MagSafe / USB-C",
    },
    attributes: [{ key: "case", label: "Charging Case", kind: "select", values: ["USB-C", "Lightning"], required: false, uiOrder: 3 }],
    adjustments: { case: { "USB-C": 10 } },
  },
};

/*
[PRO] Purpose: Add human-facing PDP sections (description, features, shipping) to each product.
Context: Keeps fixtures polished for demos without manual per-item copywriting.
Edge cases: Generic wording; acceptable for dev and staging environments.
Notes: If marketing copy becomes available, swap text here or in overrides.
*/
function addPresentation(p) {
  const desc = `The ${p.title} delivers excellent performance and value. With its premium build and reliable components, it is a great choice for everyday workloads, entertainment, and productivity.`;

  const features = [
    "Free 1 Year Warranty",
    "Free Shipping & Fasted Delivery",
    "100% Money-back guarantee",
    "24/7 Customer support",
    "Secure payment method",
  ];

  const shippingInfo = [
    { label: "Courier", note: "2-4 days, free shipping", cost: 0 },
    { label: "Local Shipping", note: "up to one week", cost: 19.00 },
    { label: "UPS Ground Shipping", note: "4-6 days", cost: 29.00 },
    { label: "Unishop Global Export", note: "3-4 days", cost: 39.00 },
  ];

  const specs = buildSpecsByCategory(p);

  return { ...p, description: desc, features, shippingInfo, specs };
}

/*
[PRO] Purpose: Merge category-derived attributes/specs with per-slug overrides and pricing adjustments.
Context: Produces the final seed document shape that the app expects.
Edge cases: Missing overrides are ignored; adjustments merged shallowly per key.
Notes: Pure function; returns a new object (no in-place mutation of the original reference).
*/
function enrichProduct(p) {
  const { attributes, adjustments } = buildAttributesByCategory(p);
  const ov = perSlugOverrides[p.slug];

  // merge attribute overrides if any
  if (ov?.attributes?.length) {
    ov.attributes.forEach((over) => {
      const idx = attributes.findIndex((a) => a.key === over.key);
      if (idx >= 0) attributes[idx] = { ...attributes[idx], ...over };
      else attributes.push(over);
    });
  }

  // merge adjustments
  const mergedAdj = { ...(adjustments || {}) };
  if (ov?.adjustments) {
    Object.entries(ov.adjustments).forEach(([k, map]) => {
      if (!map) return;
      mergedAdj[k] = { ...(mergedAdj[k] || {}), ...(map || {}) };
    });
  }

  // merge spec overrides
  const finalSpecs = { ...(p.specs || {}) };
  if (ov?.specs) Object.assign(finalSpecs, ov.specs);

  return { ...p, attributes, adjustments: mergedAdj, specs: finalSpecs };
}

/*
[PRO] Purpose: Compose presentation + enrichment to create final seed-ready product docs.
Context: Keeps pipeline readable; transforms are intentionally split for clarity.
Edge cases: Order matters (presentation → enrichment) where attributes may depend on category.
Notes: If you add new transforms, add them here in the intended sequence.
*/
const productsFinal = products.map((p) => enrichProduct(addPresentation({ ...p })));

/* -----------------------------------------------------------
   4) USERS (unchanged)
----------------------------------------------------------- */
/*
[PRO] Purpose: Upsert seed users with optional password and permissions.
Context: Allows re-running seeds without duplicating users or losing role tweaks.
Edge cases: Only sets password if provided; preserves existing permissions unless replacement provided.
Notes: Email normalized to lowercase+trim to avoid duplicate keys across runs.
*/
async function upsertUser({ name, email, role, password, permissions = [], emailVerified = true }) {
  const em = String(email).toLowerCase().trim();
  let u = await User.findOne({ email: em });
  if (!u) {
    u = new User({ name, email: em, role, permissions, emailVerified });
  } else {
    u.name = name ?? u.name;
    u.role = role ?? u.role;
    u.emailVerified = emailVerified ?? u.emailVerified;
    u.permissions = Array.isArray(permissions) && permissions.length ? permissions : u.permissions || [];
  }
  if (password) await u.setPassword(password);
  await u.save();
  return u;
}

/* -----------------------------------------------------------
   5) RUN
----------------------------------------------------------- */
/*
[PRO] Purpose: Orchestrate the seed process: connect, wipe target collections, insert products, upsert users, add sample orders.
Context: Provides a one-shot command suitable for `node server/scripts/seedAll.js`.
Edge cases: Product/order wipes are intentional; guard before using in shared environments.
Notes: Exits with code 1 on failure for CI visibility; logs progress steps to console.
*/
async function run() {
  await mongoose.connect(MONGO_URI);
  console.log(" Mongo connected");

  console.log(" Clearing products & orders…");
  await Product.deleteMany({});
  await Order.deleteMany({});

  console.log(" Inserting products…");
  const inserted = await Product.insertMany(productsFinal);
  const bySlug = new Map(inserted.map((p) => [p.slug, p]));

  console.log(" Upserting users…");
  const admin = await upsertUser({
    name: "Admin User",
    email: "admin@example.com",
    role: "admin",
    password: "admin1234",
    permissions: ADMINISH_PERMS,
    emailVerified: true,
  });

  const manager = await upsertUser({
    name: "Manager User",
    email: "manager@example.com",
    role: "manager",
    password: "manager1234",
    permissions: ["products:read", "products:write", "posts:read", "posts:write", "analytics:view", "orders:update"],
    emailVerified: true,
  });

  const regular = await upsertUser({
    name: "Regular User",
    email: "user@example.com",
    role: "user",
    password: "user1234",
    permissions: [],
    emailVerified: true,
  });

  await upsertUser({
    name: "Content Editor",
    email: "editor@example.com",
    role: "user",
    password: "editor1234",
    permissions: ["posts:*", "analytics:view"],
    emailVerified: true,
  });

  console.log(" Creating sample orders…");
  const pick = (slug) => {
    const p = bySlug.get(slug);
    if (!p) throw new Error(`Missing product for slug: ${slug}`);
    return p;
    // order items only need minimal fields for your UI
  };

  const p1 = pick("samsung-galaxy-s21-5g");
  const p2 = pick("apple-airpods-pro-2nd-gen");
  const p3 = pick("hp-24fhd-ips-monitor");

  /*
  [PRO] Purpose: Insert a couple of sample orders to power dashboards & “My Orders”.
  Context: Uses simple totals; aligns with the app’s current order reading components.
  Edge cases: Dates set for seasonal charts; ensure referenced product slugs exist.
  Notes: Minimal item fields on purpose; extend to match any new UI needs.
  */
  await Order.create({
    userId: regular._id,
    items: [
      { productId: p1._id, title: p1.title, qty: 1, price: p1.price.current, category: p1.category, slug: p1.slug },
      { productId: p2._id, title: p2.title, qty: 2, price: p2.price.current, category: p2.category, slug: p2.slug },
    ],
    status: "completed",
    stage: "delivered",
    total: p1.price.current + 2 * p2.price.current,
    createdAt: new Date(new Date().getFullYear(), 1, 12),
  });

  await Order.create({
    userId: regular._id,
    items: [{ productId: p3._id, title: p3.title, qty: 1, price: p3.price.current, category: p3.category, slug: p3.slug }],
    status: "in progress",
    stage: "shipped",
    total: p3.price.current,
    createdAt: new Date(new Date().getFullYear(), 5, 3),
  });

  console.log("✔ Done.");
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(" Seed error:", e);
  process.exit(1);
});
