import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "./models/Product.js";

dotenv.config();

const P = (p) => ({ price: { current: p.current, old: p.old ?? null } });

/**
 * Your original products list (unchanged). We’ll enrich each item below
 * according to its category, so Quick View shows the correct Figma selectors.
 */
const products = [
  { title:"Samsung Galaxy S21 5G", slug:"samsung-galaxy-s21-5g", sku:"S21-5G", brand:"SAMSUNG",
    images:["/uploads/galaxy_s21.png"], rating:4.5, numReviews:530, label:"HOT",
    ...P({ current:2300 }), category:"SmartPhone", subcategory:"Android", tags:["featured","bestseller"] },

  { title:"Google Pixel 6 Pro", slug:"google-pixel-6-pro", sku:"PIX-6PRO", brand:"Google",
    images:["/uploads/pixel.png"], rating:4.6, numReviews:312, ...P({ current:899, old:999 }),
    category:"SmartPhone", subcategory:"Android", discountText:"10% OFF", tags:["flash","new"] },

  { title:"4K UHD LED Smart TV with Chromecast Built-in", slug:"4k-uhd-led-smart-tv", sku:"TV4K-001", brand:"Generic",
    images:["/uploads/controller.png"], rating:4.3, numReviews:653, label:"SALE", discountText:"31% OFF",
    ...P({ current:220, old:320 }), category:"TV", tags:["featured"] },

  { title:"T02D T6 True Wireless Earbuds Bluetooth Headphones", slug:"t02d-t6-earbuds", sku:"TOZO-T6", brand:"TOZO",
    images:["/uploads/tz02.png"], colors:["#000000","#f5f5f5"], rating:4.7, numReviews:732, label:"HOT",
    ...P({ current:70 }), category:"Computer Accessories", subcategory:"Headphone", tags:["featured","bestseller"] },

  { title:"Bose Sport Earbuds - Wireless Bluetooth In-Ear", slug:"bose-sport-earbuds", sku:"BOSE-SPRT", brand:"Bose",
    images:["/uploads/bose_earbuds.png"], rating:4.8, numReviews:112, ...P({ current:149, old:199 }),
    discountText:"25% OFF", category:"Computer Accessories", subcategory:"Headphone", tags:["flash"] },

  { title:"Amazon Basics High-Speed HDMI Cable 6ft", slug:"amazon-basics-hdmi-6ft", sku:"HDMI-6FT", brand:"Amazon",
    images:["/uploads/hdmi_cable.png"], rating:4.9, numReviews:394, label:"BEST DEALS",
    ...P({ current:12.99 }), category:"Computer Accessories", subcategory:"Accessories", tags:["featured"] },

  { title:"Dell Optiplex 7000/7480 All-In-One Computer Monitor", slug:"dell-optiplex-7000-7480-monitor", sku:"DELL-7480", brand:"Dell",
    images:["/uploads/monitor.png"], rating:4.2, numReviews:426, ...P({ current:250 }),
    category:"Computer Accessories", subcategory:"Monitor" },

  { title:"Wired Over-Ear Gaming Headphones with USB", slug:"wired-over-ear-gaming-headset-usb", sku:"GAME-HS-USB", brand:"HyperX",
    images:["/uploads/headset.png"], rating:4.5, numReviews:536, ...P({ current:79.99 }),
    category:"Computer Accessories", subcategory:"Headphone" },

  { title:"Mechanical Keyboard & Mouse Combo", slug:"mech-keyboard-mouse-combo", sku:"KBMS-SET", brand:"Logi",
    images:["/uploads/headphones.png"], rating:4.4, numReviews:198, ...P({ current:59.99, old:79.99 }),
    discountText:"25% OFF", category:"Computer Accessories", subcategory:"Keyboard & Mouse" },

  { title:"1080p USB Webcam with Privacy Cover", slug:"1080p-usb-webcam-privacy", sku:"WEBCAM-1080", brand:"Aukey",
    images:["/uploads/sony_camera.png"], rating:4.1, numReviews:134, ...P({ current:29.99 }),
    category:"Computer Accessories", subcategory:"Webcam" },

  { title:"All-in-One Inkjet Printer Wi-Fi Duplex", slug:"aio-inkjet-printer-wifi", sku:"PRN-AIO", brand:"Canon",
    images:["/uploads/machine.png"], rating:4.0, numReviews:92, ...P({ current:129, old:179 }),
    discountText:"28% OFF", category:"Computer Accessories", subcategory:"Printer" },

  { title:"Xbox Series S 512GB + Wireless Controller (EU)", slug:"xbox-series-s-512gb", sku:"XBOX-S-512", brand:"Microsoft",
    images:["/uploads/xbox.png"], rating:4.6, numReviews:882, ...P({ current:299 }),
    category:"Gaming Console", tags:["flash","featured"] },

  { title:"MacBook Pro M1 Max 32GB/1TB", slug:"macbook-pro-m1-max-32-1tb", sku:"MBP-M1MAX", brand:"Apple",
    images:["/uploads/macbook.png"], rating:4.9, numReviews:1201, ...P({ current:1999, old:2299 }),
    discountText:"SAVE $300", category:"Computer & Laptop", tags:["featured","new"] },

  { title:"Apple AirPods Pro (2nd Gen)", slug:"apple-airpods-pro-2nd-gen", sku:"APP-APPRO2", brand:"Apple",
    images:["/uploads/airpods_pro_2.png"], rating:4.8, numReviews:2153, label:"HOT",
    ...P({ current:199, old:249 }), discountText:"SAVE $50",
    category:"Computer Accessories", subcategory:"Headphone", tags:["featured"] },

  { title:"Sony WH-1000XM4 Wireless Noise Cancelling Headphones", slug:"sony-wh-1000xm4", sku:"SONY-WH1000XM4", brand:"Sony",
    images:["/uploads/sony_wh1000xm4.png"], rating:4.9, numReviews:5401, ...P({ current:278, old:349 }),
    discountText:"20% OFF", category:"Computer Accessories", subcategory:"Headphone", tags:["bestseller"] },

  { title:"Logitech MX Master 3S Wireless Mouse", slug:"logitech-mx-master-3s", sku:"LOGI-MX3S", brand:"Logitech",
    images:["/uploads/logi_mx_master_3s.png"], rating:4.8, numReviews:1789, ...P({ current:99 }),
    category:"Computer Accessories", subcategory:"Mouse", tags:["featured"] },

  { title:"Razer Huntsman Mini 60% Gaming Keyboard", slug:"razer-huntsman-mini", sku:"RAZ-HUNTMINI", brand:"Razer",
    images:["/uploads/razer_huntsman_mini.png"], rating:4.6, numReviews:902, ...P({ current:89, old:119 }),
    discountText:"25% OFF", category:"Computer Accessories", subcategory:"Keyboard & Mouse" },

  { title:"Anker PowerCore 20000mAh Power Bank", slug:"anker-powercore-20000", sku:"ANK-PWR20000", brand:"Anker",
    images:["/uploads/anker_powercore_20000.png"], rating:4.7, numReviews:3310, ...P({ current:45, old:59 }),
    discountText:"SAVE $14", category:"Computer Accessories", subcategory:"Accessories" },

  { title:"SanDisk Ultra 128GB microSDXC UHS-I", slug:"sandisk-ultra-128gb-microsd", sku:"SAND-USD128", brand:"SanDisk",
    images:["/uploads/sandisk_ultra_128gb.png"], rating:4.8, numReviews:8200, ...P({ current:19.99, old:24.99 }),
    discountText:"BEST DEALS", category:"Computer Accessories", subcategory:"Storage" },

  { title:"Apple iPad Air (5th Gen) 10.9\" 64GB Wi-Fi", slug:"apple-ipad-air-5th-gen", sku:"APP-IPADAIR-5", brand:"Apple",
    images:["/uploads/ipad_air_5.png"], rating:4.9, numReviews:1540, ...P({ current:599, old:649 }),
    discountText:"SAVE $50", category:"Tablet", tags:["featured","new"] },

  { title:"Apple iPhone 12 64GB", slug:"apple-iphone-12-64gb", sku:"APP-IPHONE-12", brand:"Apple",
    images:["/uploads/iphone_12.png"], rating:4.7, numReviews:6403, ...P({ current:699, old:749 }),
    discountText:"SALE", category:"SmartPhone", subcategory:"iOS" },

  { title:"Chromecast with Google TV (4K)", slug:"chromecast-with-google-tv-4k", sku:"GGL-CHROMECAST-4K", brand:"Google",
    images:["/uploads/chromecast_4k.png"], rating:4.6, numReviews:2201, ...P({ current:49.99 }),
    category:"TV", subcategory:"Streaming", tags:["featured"] },

  { title:"TP-Link Archer AX55 Wi-Fi 6 Router", slug:"tp-link-archer-ax55", sku:"TPL-AX55", brand:"TP-Link",
    images:["/uploads/tplink_ax55.png"], rating:4.7, numReviews:990, ...P({ current:129.99, old:149.99 }),
    discountText:"SAVE $20", category:"Computer Accessories", subcategory:"Networking" },

  { title:"Canon PIXMA Wireless Photo Printer", slug:"canon-pixma-wireless-photo-printer", sku:"CAN-PIXMA-6420", brand:"Canon",
    images:["/uploads/canon_pixma.png"], rating:4.2, numReviews:411, ...P({ current:119 }),
    category:"Computer Accessories", subcategory:"Printer" },

  { title:"HP 24\" FHD IPS Monitor (75Hz)", slug:"hp-24fhd-ips-monitor", sku:"HP-24FHD-IPS", brand:"HP",
    images:["/uploads/hp_24fhd_ips.png"], rating:4.5, numReviews:1330, ...P({ current:159, old:189 }),
    discountText:"15% OFF", category:"Computer Accessories", subcategory:"Monitor" },

  { title:"ASUS TUF Gaming A15 (Ryzen 5, RTX 3060)", slug:"asus-tuf-gaming-a15-rtx3060", sku:"ASUS-TUF-A15", brand:"ASUS",
    images:["/uploads/asus_tuf_a15.png"], rating:4.6, numReviews:721, label:"HOT",
    ...P({ current:999, old:1199 }), discountText:"SAVE $200", category:"Computer & Laptop", tags:["featured"] },

  { title:"Kingston NV1 1TB NVMe SSD", slug:"kingston-nv1-1tb-nvme-ssd", sku:"KING-NV1-1TB", brand:"Kingston",
    images:["/uploads/kingston_nv1_1tb.png"], rating:4.8, numReviews:5300, ...P({ current:59.99, old:79.99 }),
    discountText:"BEST DEALS", category:"Computer Accessories", subcategory:"Storage" },

  { title:"Seagate Portable 2TB External HDD USB 3.0", slug:"seagate-2tb-external-hdd", sku:"SEA-EXHDD-2TB", brand:"Seagate",
    images:["/uploads/seagate_2tb.png"], rating:4.7, numReviews:4200, ...P({ current:62.99 }),
    category:"Computer Accessories", subcategory:"Storage" },

  { title:"Fire TV Stick 4K Max (2023)", slug:"fire-tv-stick-4k-max-2023", sku:"AMZ-FIRETV-4KMAX", brand:"Amazon",
    images:["/uploads/fire_tv_stick_4k_max.png"], rating:4.6, numReviews:3109, ...P({ current:54.99, old:59.99 }),
    discountText:"SAVE $5", category:"TV", subcategory:"Streaming" },

  { title:"Apple Watch Series 7 GPS 41mm", slug:"apple-watch-series-7-gps-41mm", sku:"APP-WATCH-S7-41", brand:"Apple",
    images:["/uploads/apple_watch_series7_41.png"], rating:4.8, numReviews:2411, ...P({ current:279, old:329 }),
    discountText:"SALE", category:"Wearable Technology", tags:["featured"] },

  { title:"Samsung Galaxy Buds2 Pro", slug:"samsung-galaxy-buds2-pro", sku:"SAM-BUDS2PRO", brand:"SAMSUNG",
    images:["/uploads/galaxy_buds2_pro.png"], rating:4.7, numReviews:1640, ...P({ current:149, old:199 }),
    discountText:"25% OFF", category:"Computer Accessories", subcategory:"Headphone" },

  { title:"Xiaomi Mi Band 7 Fitness Tracker", slug:"xiaomi-mi-band-7", sku:"XIA-MIBAND7", brand:"Xiaomi",
    images:["/uploads/xiaomi_miband_7.png"], rating:4.6, numReviews:2870, ...P({ current:39.99 }),
    category:"Wearable Technology" },

  { title:"DJI Osmo Mobile 6 Smartphone Gimbal", slug:"dji-osmo-mobile-6", sku:"DJI-OSMO-M6", brand:"DJI",
    images:["/uploads/dji_osmo_mobile_6.png"], rating:4.7, numReviews:905, ...P({ current:129, old:159 }),
    discountText:"SAVE $30", category:"Camera & Photo", subcategory:"Accessories" },

  { title:"Elgato Stream Deck Mini", slug:"elgato-stream-deck-mini", sku:"ELG-STREAMDECK-MINI", brand:"Elgato",
    images:["/uploads/elgato_stream_deck_mini.png"], rating:4.8, numReviews:1140, ...P({ current:79.99 }),
    category:"Computer Accessories", subcategory:"Creator Gear" },

  { title:"Blue Yeti USB Microphone", slug:"blue-yeti-usb-microphone", sku:"BLUE-YETI-USB", brand:"Blue",
    images:["/uploads/blue_yeti_usb.png"], rating:4.7, numReviews:3500, ...P({ current:109.99, old:129.99 }),
    discountText:"SAVE $20", category:"Computer Accessories", subcategory:"Audio" },

  { title:"Logitech C920x Pro HD Webcam", slug:"logitech-c920x-pro-hd-webcam", sku:"LOGI-C920X", brand:"Logitech",
    images:["/uploads/logi_c920x.png"], rating:4.6, numReviews:7800, ...P({ current:59.99, old:69.99 }),
    discountText:"BEST DEALS", category:"Computer Accessories", subcategory:"Webcam" },

  { title:"Anker 7-in-1 USB-C Hub (4K HDMI, 100W PD)", slug:"anker-7-in-1-usb-c-hub", sku:"ANK-USBC-HUB-7IN1", brand:"Anker",
    images:["/uploads/anker_usbc_hub_7in1.png"], rating:4.7, numReviews:2100, ...P({ current:34.99, old:49.99 }),
    discountText:"30% OFF", category:"Computer Accessories", subcategory:"Accessories" },
];

/* ---------------- helpers to enrich products with Figma-ready attributes ---------------- */

const PALETTES = {
  neutral: ["#000000", "#f5f5f5", "#bdbdbd"],              // black / white / silver
  phone:   ["Black", "White", "Blue"],
  fun:     ["#222831", "#3A86FF", "#FF006E"],              // dark / blue / pink
  watch:   ["#000000", "#f0f0f0", "#2b6cb0"],              // black / silver / blue
  audio:   ["#000000", "#f5f5f5", "#9c27b0"],              // black / white / purple
};

/** Pick a color set based on category (2–3 choices). */
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

/**
 * Build attributes + adjustments per category (your defaults).
 * Only seed the fields that make sense for that item.
 */
function buildByCategory(p) {
  const attributes = [];
  const adjustments = {};

  const addColor = (vals) => {
    const colors = vals.slice(0, 3); // keep 2–3
    attributes.push({ key: "color", label: "Color", kind: "swatch", values: colors, required: false, uiOrder: 1 });
    // also fill legacy to support both render paths
    p.colors = colors;
  };

  switch ((p.category || "").toLowerCase()) {
    /* Computer & Laptop */
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

      // legacy arrays to keep older UI branches happy
      p.size = size; p.memory = memory; p.storage = storage;
      break;
    }

    /* Smartphone */
    case "smartphone": {
      addColor(pickColors(p));
      const storage = ["64GB", "128GB", "256GB"];
      attributes.push({ key: "storage", label: "Storage", kind: "select", values: storage, required: true, uiOrder: 3 });
      adjustments.storage = { "128GB": 100, "256GB": 220 };

      // optional carrier (not required)
      attributes.push({ key: "carrier", label: "Carrier", kind: "select",
        values: ["Unlocked", "AT&T", "Verizon"], required: false, uiOrder: 5 });

      p.storage = storage;
      break;
    }

    /* Wearable / Watch */
    case "wearable technology": {
      const colors = pickColors(p);
      const size = ["41mm", "45mm"];
      attributes.push({ key: "color", label: "Color", kind: "swatch", values: colors, required: false, uiOrder: 1 });
      attributes.push({ key: "size", label: "Case Size", kind: "select", values: size, required: true, uiOrder: 2 });
      attributes.push({ key: "band", label: "Band", kind: "select",
        values: ["Sport Band", "Milanese Loop", "Leather"], required: true, uiOrder: 3 });

      adjustments.size = { "45mm": 30 };
      adjustments.band = { "Milanese Loop": 50, "Leather": 40 };

      p.colors = colors; p.size = size;
      break;
    }

    /* Headphone / Earbuds */
    case "computer accessories": {
      const sub = (p.subcategory || "").toLowerCase();

      if (/headphone/.test(sub)) {
        addColor(pickColors(p));
        // Version/Case where relevant (e.g., AirPods)
        if (/airpods|pro|buds/i.test(p.title)) {
          attributes.push({
            key: "case", label: "Charging Case", kind: "select",
            values: ["USB-C", "Lightning"], required: false, uiOrder: 3
          });
          adjustments.case = { "USB-C": 10 };
        }
      } else if (/monitor/.test(sub)) {
        const size = ["24-inch", "27-inch"];
        attributes.push({ key: "size", label: "Size", kind: "select", values: size, required: true, uiOrder: 2 });
        attributes.push({ key: "refresh", label: "Refresh Rate", kind: "select", values: ["60Hz", "75Hz"], required: false, uiOrder: 3 });
        adjustments.size = { "27-inch": 70 };
        p.size = size;
      } else if (/printer/.test(sub)) {
        attributes.push({ key: "bundle", label: "Bundle", kind: "select",
          values: ["Printer Only", "Printer + 2x Ink", "Printer + 4x Ink"], required: false, uiOrder: 2 });
        attributes.push({ key: "connectivity", label: "Connectivity", kind: "select",
          values: ["Wi-Fi", "USB"], required: false, uiOrder: 3 });
        adjustments.bundle = { "Printer + 2x Ink": 25, "Printer + 4x Ink": 45 };
      } else if (/accessories/.test(sub)) {
        // e.g. HDMI cable length
        if (/hdmi|cable/i.test(p.title)) {
          attributes.push({ key: "length", label: "Length", kind: "select",
            values: ["3ft", "6ft", "10ft"], required: true, uiOrder: 2 });
          adjustments.length = { "6ft": 2, "10ft": 4 };
        }
        // e.g. USB-C hubs pack size (optional)
        if (/hub|7-in-1/i.test(p.title)) {
          attributes.push({ key: "pack", label: "Pack Size", kind: "select",
            values: ["Single", "2-Pack"], required: false, uiOrder: 3 });
          adjustments.pack = { "2-Pack": 6 };
        }
      } else if (/storage/.test(sub)) {
        // SSD/HDD capacities
        attributes.push({ key: "capacity", label: "Capacity", kind: "select",
          values: ["1TB", "2TB"], required: true, uiOrder: 2 });
        adjustments.capacity = { "2TB": 18 };
      } else {
        // generic accessories — keep at least Color
        addColor(pickColors(p));
      }
      break;
    }

    /* TV */
    case "tv": {
      const size = ["43-inch", "55-inch", "65-inch"];
      attributes.push({ key: "size", label: "Size", kind: "select", values: size, required: true, uiOrder: 2 });
      adjustments.size = { "55-inch": 150, "65-inch": 350 };
      p.size = size;
      break;
    }

    /* Camera & Photo */
    case "camera & photo": {
      addColor(PALETTES.neutral);
      // If it’s a gimbal, use Kit options; otherwise Body/Body+Lens is still OK for demo
      if (/osmo|gimbal/i.test(p.title)) {
        attributes.push({ key: "kit", label: "Kit", kind: "select",
          values: ["Standard", "Creator Combo"], required: false, uiOrder: 3 });
        adjustments.kit = { "Creator Combo": 30 };
      } else {
        attributes.push({ key: "kit", label: "Kit", kind: "select",
          values: ["Body", "Body + Lens"], required: false, uiOrder: 3 });
        adjustments.kit = { "Body + Lens": 300 };
      }
      break;
    }

    /* Gaming Console (optional bundle) */
    case "gaming console": {
      addColor(PALETTES.neutral);
      attributes.push({ key: "bundle", label: "Bundle", kind: "select",
        values: ["Console Only", "Console + Extra Controller"], required: false, uiOrder: 3 });
      adjustments.bundle = { "Console + Extra Controller": 49 };
      break;
    }

    /* Tablet (simple color + storage) */
    case "tablet": {
      addColor(PALETTES.neutral);
      const storage = ["64GB", "256GB"];
      attributes.push({ key: "storage", label: "Storage", kind: "select", values: storage, required: true, uiOrder: 3 });
      adjustments.storage = { "256GB": 100 };
      p.storage = storage;
      break;
    }

    default: {
      // fallback: at least color for a consistent Figma feel
      addColor(pickColors(p));
    }
  }

  return { attributes, adjustments };
}

/** Merge custom per-slug overrides if you want to tweak specific hero items. */
const perSlugOverrides = {
  "macbook-pro-m1-max-32-1tb": {
    // example: stronger bumps
    adjustments: {
      size: { "15-inch": 300 },
      memory: { "16GB": 200, "32GB": 500 },
      storage: { "512GB SSD": 250, "1TB SSD": 550 },
      color: { "#bdbdbd": 50 },
    }
  },
  "apple-watch-series-7-gps-41mm": {
    // require Band (Figma: must pick)
    attributes: [
      { key: "band", required: true }
    ],
    adjustments: {
      size: { "45mm": 30 }, band: { "Milanese Loop": 50, "Leather": 40 }
    }
  },
  "apple-airpods-pro-2nd-gen": {
    attributes: [
      { key: "case", label: "Charging Case", kind: "select", values: ["USB-C", "Lightning"], required: false, uiOrder: 3 }
    ],
    adjustments: { case: { "USB-C": 10 } }
  },
};

/** Apply category defaults + optional per-slug overrides. */
function enrichProduct(p) {
  const { attributes, adjustments } = buildByCategory(p);

  // apply per-slug tweaks
  const ov = perSlugOverrides[p.slug];
  if (ov) {
    // merge attribute flags (e.g., set required for a key)
    if (ov.attributes && Array.isArray(ov.attributes)) {
      ov.attributes.forEach((over) => {
        const idx = attributes.findIndex(a => a.key === over.key);
        if (idx >= 0) attributes[idx] = { ...attributes[idx], ...over };
        else attributes.push(over);
      });
    }
  }

  // merge adjustments
  const mergedAdj = { ...(adjustments || {}) };
  if (ov && ov.adjustments) {
    Object.entries(ov.adjustments).forEach(([k, map]) => {
      mergedAdj[k] = { ...(mergedAdj[k] || {}), ...(map || {}) };
    });
  }

  return { ...p, attributes, adjustments: mergedAdj };
}

const productsFinal = products.map(enrichProduct);

/* --------------------------------- seed ---------------------------------- */
(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: "clicon" });
    await Product.deleteMany({});
    await Product.insertMany(productsFinal);
    console.log("Seeded products:", productsFinal.length);
  } catch (e) {
    console.error(e);
  } finally {
    await mongoose.disconnect();
  }
})();
