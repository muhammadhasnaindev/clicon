// client/src/pages/admin/AdminProducts.jsx
/**
 * AdminProducts — Manage products with quick templates, JSON-driven specs/variants, media, and coupons.

 */

import React, { useRef, useState, useEffect } from "react";
import {
  useAdminGetProductsQuery,
  useAdminCreateProductMutation,
  useAdminUpdateProductMutation,
  useAdminDeleteProductMutation,
} from "../../store/api/apiSlice";
import {
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Alert,
  Chip,
  Stack,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Divider,
  IconButton,
  Tooltip,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from "@mui/material";
import { Delete, Edit, Add, UploadFile, ContentCopy, AutoFixHigh } from "@mui/icons-material";
import PermGate from "../../acl/PermGate";

/* -------------------- small UI constants (avoid magic values) -------------------- */
const DEFAULT_FEATURES = "Free 1 Year Warranty\nFree Shipping & Fast Delivery\n24/7 Customer Support";
const NO_IMAGES_TEXT = "No images yet.";
const NO_PRODUCTS_TEXT = "No products yet.";

/* -------------------- helpers: templates -------------------- */
const pretty = (v) => {
  try { return JSON.stringify(v, null, 2); } catch { return typeof v === "string" ? v : ""; }
};
const toArr = (x) => Array.isArray(x) ? x : [];
const lc = (s) => String(s || "").toLowerCase();

function T_generic({ form }) {
  return {
    specs: {
      brand: form.brand || "",
      model: form.title || "",
      warranty: "1 Year",
    },
    attributes: [
      { key: "color", label: "Color", kind: "swatch", values: ["Black", "White", "Blue"], required: false, uiOrder: 1 },
    ],
    adjustments: {},
  };
}
function T_phone({ form }) {
  return {
    specs: {
      brand: form.brand || "",
      model: form.title || "",
      display: "6.1-6.7\" 120Hz OLED",
      chip: "A-series / Snapdragon",
      memory: "6-12GB RAM",
      storage: "64/128/256GB",
      cameras: "Wide + Ultra-wide + Tele",
      battery: "4000-5000 mAh",
      os: "iOS / Android",
      network: "5G / LTE",
      warranty: "1 Year",
    },
    attributes: [
      { key: "color", label: "Color", kind: "swatch", values: ["Black", "White", "Blue"], required: false, uiOrder: 1 },
      { key: "storage", label: "Storage", kind: "select", values: ["64GB", "128GB", "256GB"], required: true, uiOrder: 2 },
      { key: "carrier", label: "Carrier", kind: "select", values: ["Unlocked", "AT&T", "Verizon"], required: false, uiOrder: 3 },
    ],
    adjustments: { storage: { "128GB": 100, "256GB": 220 } },
  };
}
function T_laptop({ form }) {
  return {
    specs: {
      brand: form.brand || "",
      model: form.title || "",
      processor: "Apple M-series / Intel / AMD",
      memory: "8/16/32GB",
      storage: "256GB-1TB SSD",
      display: "13-15\" IPS/Retina",
      graphics: "Integrated / Dedicated",
      os: "macOS / Windows",
      ports: "USB-C / TB / HDMI",
      warranty: "1 Year",
    },
    attributes: [
      { key: "color", label: "Color", kind: "swatch", values: ["#000000", "#f5f5f5", "#bdbdbd"], required: false, uiOrder: 1 },
      { key: "size", label: "Size", kind: "select", values: ["13-inch", "15-inch"], required: true, uiOrder: 2 },
      { key: "memory", label: "Memory", kind: "select", values: ["8GB", "16GB", "32GB"], required: true, uiOrder: 3 },
      { key: "storage", label: "Storage", kind: "select", values: ["256GB SSD", "512GB SSD", "1TB SSD"], required: true, uiOrder: 4 },
    ],
    adjustments: { size: { "15-inch": 300 }, memory: { "16GB": 200, "32GB": 500 }, storage: { "512GB SSD": 250, "1TB SSD": 550 } },
  };
}
function T_tv() {
  return {
    specs: {
      screenSize: "43-65 inch",
      panel: "LED",
      resolution: "4K (3840-160)",
      refreshRate: "60/120 Hz",
      smartOS: "Google TV / Fire TV / Roku",
      hdmi: 3,
      warranty: "1 Year",
    },
    attributes: [
      { key: "size", label: "Size", kind: "select", values: ["43-inch", "55-inch", "65-inch"], required: true, uiOrder: 1 },
      { key: "refresh", label: "Refresh Rate", kind: "select", values: ["60Hz", "120Hz"], required: false, uiOrder: 2 },
    ],
    adjustments: { size: { "55-inch": 150, "65-inch": 350 } },
  };
}
function T_monitor() {
  return {
    specs: {
      size: "24-27 inch",
      panel: "IPS",
      resolution: "1920x1080",
      refreshRate: "60-75 Hz",
      response: "5 ms",
      inputs: "HDMI, VGA",
      warranty: "1 Year",
    },
    attributes: [
      { key: "size", label: "Size", kind: "select", values: ["24-inch", "27-inch"], required: true, uiOrder: 1 },
      { key: "refresh", label: "Refresh Rate", kind: "select", values: ["60Hz", "75Hz"], required: false, uiOrder: 2 },
    ],
    adjustments: { size: { "27-inch": 70 } },
  };
}
function T_printer() {
  return {
    specs: {
      type: "Inkjet",
      functions: "Print / Copy / Scan",
      connectivity: "Wi-Fi / USB",
      speed: "Up to 15 ppm",
      paper: "A4/Letter",
      warranty: "1 Year",
    },
    attributes: [
      { key: "bundle", label: "Bundle", kind: "select", values: ["Printer Only", "Printer + 2x Ink", "Printer + 4x Ink"], required: false, uiOrder: 1 },
      { key: "connectivity", label: "Connectivity", kind: "select", values: ["Wi-Fi", "USB"], required: false, uiOrder: 2 },
    ],
    adjustments: { bundle: { "Printer + 2x Ink": 25, "Printer + 4x Ink": 45 } },
  };
}
function T_headphone({ form }) {
  return {
    specs: {
      brand: form.brand || "",
      type: "Over-Ear / In-Ear",
      connection: "Bluetooth 5.x",
      noiseCancel: "ANC (model-dependent)",
      battery: "Up to 24-30 hours",
      microphones: "Dual / 3-Mic",
      charging: "USB-C / Lightning",
      warranty: "1 Year",
    },
    attributes: [
      { key: "color", label: "Color", kind: "swatch", values: ["#000000", "#f5f5f5", "#9c27b0"], required: false, uiOrder: 1 },
    ],
    adjustments: {},
  };
}
function T_tablet() {
  return {
    specs: {
      display: "10-11 inch IPS",
      storage: "64 / 256GB",
      memory: "4-8GB RAM",
      os: "iPadOS / Android",
      battery: "10 hours",
      warranty: "1 Year",
    },
    attributes: [
      { key: "color", label: "Color", kind: "swatch", values: ["#000000", "#f5f5f5", "#bdbdbd"], required: false, uiOrder: 1 },
      { key: "storage", label: "Storage", kind: "select", values: ["64GB", "256GB"], required: true, uiOrder: 2 },
    ],
    adjustments: { storage: { "256GB": 100 } },
  };
}
function T_wearable() {
  return {
    specs: {
      caseSize: "41 / 45mm",
      sensors: "HR, SpO2, GPS",
      waterResist: "50m",
      battery: "18-36 hours",
      warranty: "1 Year",
    },
    attributes: [
      { key: "color", label: "Color", kind: "swatch", values: ["#000000", "#f0f0f0", "#2b6cb0"], required: false, uiOrder: 1 },
      { key: "caseSize", label: "Case Size", kind: "select", values: ["41mm", "45mm"], required: true, uiOrder: 2 },
      { key: "band", label: "Band", kind: "select", values: ["Sport Band", "Milanese Loop", "Leather"], required: true, uiOrder: 3 },
    ],
    adjustments: { caseSize: { "45mm": 30 }, band: { "Milanese Loop": 50, "Leather": 40 } },
  };
}
function T_camera() {
  return {
    specs: {
      type: "Compact / Mirrorless / DSLR",
      sensor: "APS-C / Full-Frame",
      video: "4K",
      mount: "Varies",
      warranty: "1 Year",
    },
    attributes: [
      { key: "kit", label: "Kit", kind: "select", values: ["Body", "Body + Lens"], required: false, uiOrder: 1 },
    ],
    adjustments: { kit: { "Body + Lens": 300 } },
  };
}
function T_console() {
  return {
    specs: {
      storage: "512GB / 1TB",
      output: "4K HDR",
      wifi: "Wi-Fi 6",
      warranty: "1 Year",
    },
    attributes: [
      { key: "bundle", label: "Bundle", kind: "select", values: ["Console Only", "Console + Extra Controller"], required: false, uiOrder: 1 },
    ],
    adjustments: { bundle: { "Console + Extra Controller": 49 } },
  };
}

const TEMPLATE_OPTIONS = [
  { key: "generic", label: "Generic", make: T_generic },
  { key: "smartphone", label: "Smartphone", make: T_phone },
  { key: "laptop", label: "Computer & Laptop", make: T_laptop },
  { key: "tv", label: "TV", make: T_tv },
  { key: "monitor", label: "Monitor", make: T_monitor },
  { key: "printer", label: "Printer", make: T_printer },
  { key: "headphone", label: "Headphone / Earbuds", make: T_headphone },
  { key: "tablet", label: "Tablet", make: T_tablet },
  { key: "wearable", label: "Wearable", make: T_wearable },
  { key: "camera", label: "Camera & Photo", make: T_camera },
  { key: "console", label: "Gaming Console", make: T_console },
];

function autoKeyFor(form) {
  const c = lc(form.category);
  const s = lc(form.subcategory);
  if (/smart ?phone/.test(c) || /phone/.test(c)) return "smartphone";
  if (/computer/.test(c) && !/accessories/.test(c)) return "laptop";
  if (/tv|television/.test(c)) return "tv";
  if (/monitor/.test(s)) return "monitor";
  if (/printer/.test(s)) return "printer";
  if (/headphone|earbud/.test(s) || /headphone/.test(c)) return "headphone";
  if (/tablet/.test(c)) return "tablet";
  if (/wearable/.test(c)) return "wearable";
  if (/camera|photo/.test(c)) return "camera";
  if (/gaming/.test(c)) return "console";
  return "generic";
}
function makeTemplate(form, key = autoKeyFor(form)) {
  const found = TEMPLATE_OPTIONS.find((t) => t.key === key) || TEMPLATE_OPTIONS[0];
  return found.make({ form });
}

/* -------------------- component -------------------- */
const empty = {
  title: "",
  slug: "",
  sku: "",
  brand: "",
  category: "",
  subcategory: "",
  images: [],
  price: { current: 0, old: null },
  published: true,
  label: "",
  discountText: "",
  dealEndsAt: "",
  rating: 0,
  numReviews: 0,
  tags: [],
  description: "",
  features: [],
  shippingInfo: [],
  specs: {},
  attributes: [],
  adjustments: {},
  coupon: {
    code: "",
    type: "percent",
    amount: 0,
    minSubtotal: 0,
    active: false,
    expiresAt: "",
  },
};

/**
 * Admin products screen: create, edit, and list products with JSON-based specs & variants.
 * @returns {JSX.Element}
 */
export default function AdminProducts() {
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const fileInputRef = useRef(null);

  // RAW editors (type anything)
  const [featuresRaw, setFeaturesRaw] = useState(DEFAULT_FEATURES);
  const [specsRaw, setSpecsRaw] = useState(pretty(makeTemplate(empty, "generic").specs));
  const [attrsRaw, setAttrsRaw] = useState(pretty(makeTemplate(empty, "generic").attributes));
  const [adjRaw, setAdjRaw] = useState(pretty(makeTemplate(empty, "generic").adjustments));

  // touched flags — if you’ve typed, we won’t auto-overwrite on category change
  const [touchedSpecs, setTouchedSpecs] = useState(false);
  const [touchedAttrs, setTouchedAttrs] = useState(false);
  const [touchedAdj, setTouchedAdj] = useState(false);

  const { data: list, refetch, error: listErr } = useAdminGetProductsQuery({ page: 1, limit: 100 });
  const products = list?.data || [];

  const [createProduct, { isLoading: creating, error: createErr }] = useAdminCreateProductMutation();
  const [updateProduct, { isLoading: updating, error: updateErr }] = useAdminUpdateProductMutation();
  const [deleteProduct, { error: delErr }] = useAdminDeleteProductMutation();

  // auto-apply template when Category/Subcategory/Brand/Title changes (only if not touched)
  useEffect(() => {
    if (editingId) return; // don't auto-change when editing existing products
    const tmpl = makeTemplate(form);
    if (!touchedSpecs) setSpecsRaw(pretty({ ...tmpl.specs, brand: form.brand || tmpl.specs.brand, model: form.title || tmpl.specs.model }));
    if (!touchedAttrs) setAttrsRaw(pretty(tmpl.attributes));
    if (!touchedAdj) setAdjRaw(pretty(tmpl.adjustments));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.category, form.subcategory, form.brand, form.title]);

  const onSubmit = async () => {
    let specs = {};
    let attributes = [];
    let adjustments = {};
    try { specs = JSON.parse(specsRaw || "{}"); } catch {}
    try { attributes = JSON.parse(attrsRaw || "[]"); } catch {}
    try { adjustments = JSON.parse(adjRaw || "{}"); } catch {}

    const coupon =
      form.coupon && form.coupon.code
        ? {
            code: String(form.coupon.code || "").trim().toUpperCase(),
            type: form.coupon.type === "fixed" ? "fixed" : "percent",
            amount: Number(form.coupon.amount || 0),
            minSubtotal: Number(form.coupon.minSubtotal || 0),
            active: !!form.coupon.active,
            expiresAt: form.coupon.expiresAt ? new Date(form.coupon.expiresAt).toISOString() : null,
          }
        : null;

    const payload = {
      ...form,
      price: {
        current: Number(form.price?.current || 0),
        old: form.price?.old === "" ? null : (form.price?.old != null ? Number(form.price.old) : null),
      },
      dealEndsAt: form.dealEndsAt ? new Date(form.dealEndsAt).toISOString() : null,
      features: (featuresRaw || "").split("\n").map((s) => s.trim()).filter(Boolean),
      specs,
      attributes: toArr(attributes),
      adjustments: adjustments && typeof adjustments === "object" ? adjustments : {},
      tags: toArr(form.tags).map((t) => String(t).trim()).filter(Boolean),
      images: form.images || [],
      coupon,
    };

    if (editingId) await updateProduct({ id: editingId, ...payload }).unwrap();
    else await createProduct(payload).unwrap();

    setForm(empty);
    setEditingId(null);
    setTab(0);
    setFeaturesRaw(DEFAULT_FEATURES);
    const gen = makeTemplate(empty, "generic");
    setSpecsRaw(pretty(gen.specs));
    setAttrsRaw(pretty(gen.attributes));
    setAdjRaw(pretty(gen.adjustments));
    setTouchedSpecs(false); setTouchedAttrs(false); setTouchedAdj(false);
    refetch();
  };

  const onEdit = (p) => {
    setEditingId(p._id);
    setTab(0);

    setForm({
      ...empty,
      title: p.title || "",
      slug: p.slug || "",
      sku: p.sku || "",
      brand: p.brand || "",
      category: p.category || "",
      subcategory: p.subcategory || "",
      images: Array.isArray(p.images) ? p.images : [],
      price: { current: p?.price?.current ?? 0, old: p?.price?.old ?? null },
      published: p.published !== false,
      label: p.label || "",
      discountText: p.discountText || "",
      dealEndsAt: p.dealEndsAt ? new Date(p.dealEndsAt).toISOString().slice(0, 16) : "",
      rating: Number(p.rating || 0),
      numReviews: Number(p.numReviews || 0),
      tags: Array.isArray(p.tags) ? p.tags : [],
      description: p.description || "",
      features: Array.isArray(p.features) ? p.features : [],
      shippingInfo: Array.isArray(p.shippingInfo) ? p.shippingInfo : [],
      specs: p.specs || {},
      attributes: Array.isArray(p.attributes) ? p.attributes : [],
      adjustments: p.adjustments || {},
      coupon: {
        code: p?.coupon?.code || "",
        type: p?.coupon?.type || "percent",
        amount: Number(p?.coupon?.amount || 0),
        minSubtotal: Number(p?.coupon?.minSubtotal || 0),
        active: !!p?.coupon?.active,
        expiresAt: p?.coupon?.expiresAt ? new Date(p.coupon.expiresAt).toISOString().slice(0, 16) : "",
      },
    });

    setFeaturesRaw((Array.isArray(p.features) ? p.features : []).join("\n"));
    setSpecsRaw(pretty(p.specs || {}));
    setAttrsRaw(pretty(Array.isArray(p.attributes) ? p.attributes : []));
    setAdjRaw(pretty(p.adjustments || {}));

    // when loading for edit, consider them "touched" so auto-template won't override
    setTouchedSpecs(true); setTouchedAttrs(true); setTouchedAdj(true);
  };

  /* ==== NEW LOGIC: Safer delete with user-safe feedback ====
     PRO: Users get clear feedback if deletion fails (permissions/network).
     We keep the native confirm for simplicity and avoid silent failures. */
  const onDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await deleteProduct(id).unwrap();
      refetch();
    } catch (err) {
      console.error(err);
      window.alert("Could not delete the product. Please try again.");
    }
  };

  const addTag = (t) => {
    const tag = String(t || "").trim();
    if (!tag) return;
    setForm((f) => ({ ...f, tags: Array.from(new Set([...(f.tags || []), tag])) }));
  };
  const removeTag = (t) => {
    setForm((f) => ({ ...f, tags: (f.tags || []).filter((x) => x !== t) }));
  };

  const addShippingRow = () =>
    setForm((f) => ({ ...f, shippingInfo: [...(f.shippingInfo || []), { label: "", note: "", cost: 0 }] }));

  const onUploadFiles = async (files) => {
    const arr = Array.from(files || []);
    const toDataUrl = (file) =>
      new Promise((resolve) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.readAsDataURL(file);
      });
    const all = await Promise.all(arr.map(toDataUrl));
    setForm((f) => ({ ...f, images: [...(f.images || []), ...all] }));
  };

  const copy = (s) => navigator.clipboard?.writeText(s).catch(() => {});
  const beautify = (raw, setter, fallback) => {
    try { setter(JSON.stringify(JSON.parse(raw || fallback), null, 2)); }
    catch { setter(pretty(fallback)); }
  };
  const applyTemplateKey = (key) => {
    const t = makeTemplate(form, key);
    setSpecsRaw(pretty({ ...t.specs, brand: form.brand || t.specs.brand, model: form.title || t.specs.model }));
    setAttrsRaw(pretty(t.attributes));
    setAdjRaw(pretty(t.adjustments));
    setTouchedSpecs(true); setTouchedAttrs(true); setTouchedAdj(true);
  };

  return (
    <div className="p-4">
      <Typography variant="h5" gutterBottom>Manage Products</Typography>
      {(listErr || createErr || updateErr || delErr) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {listErr?.data?.message || createErr?.data?.message || updateErr?.data?.message || delErr?.data?.message || "Operation failed"}
        </Alert>
      )}

      <PermGate all={["products:write"]}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2 }}>
              <Tab label="Basic" />
              <Tab label="Content" />
              <Tab label="Specs & Variants" />
              <Tab label="Media" />
            </Tabs>

            {/* BASIC */}
            {tab === 0 && (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Title" placeholder="Apple iPhone 12 64GB"
                    value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})}/>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Slug" placeholder="apple-iphone-12-64gb"
                    value={form.slug} onChange={(e)=>setForm({...form,slug:e.target.value})}/>
                </Grid>

                <Grid item xs={12} md={3}>
                  <TextField fullWidth label="SKU" placeholder="APP-IPHONE-12"
                    value={form.sku} onChange={(e)=>setForm({...form,sku:e.target.value})}/>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField fullWidth label="Brand" placeholder="Apple"
                    value={form.brand} onChange={(e)=>setForm({...form,brand:e.target.value})}/>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField fullWidth label="Category" placeholder="SmartPhone / TV / Computer & Laptop"
                    value={form.category} onChange={(e)=>setForm({...form,category:e.target.value})}/>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField fullWidth label="Subcategory" placeholder="Android / iOS / Headphone / Monitor"
                    value={form.subcategory} onChange={(e)=>setForm({...form,subcategory:e.target.value})}/>
                </Grid>

                <Grid item xs={12} md={3}>
                  <TextField fullWidth type="number" label="Price (current)" placeholder="699"
                    value={form.price.current}
                    onChange={(e)=>setForm({...form,price:{...form.price,current:e.target.value}})} />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField fullWidth type="number" label="Price (old)" placeholder="749"
                    value={form.price.old ?? ""}
                    onChange={(e)=>setForm({...form,price:{...form.price,old:e.target.value}})} />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField fullWidth label="Badge Label" placeholder="FEATURED / HOT"
                    value={form.label} onChange={(e)=>setForm({...form,label:e.target.value})}/>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField fullWidth label="Discount Text" placeholder="SAVE $50 / 10% OFF"
                    value={form.discountText} onChange={(e)=>setForm({...form,discountText:e.target.value})}/>
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField fullWidth type="datetime-local" label="Deal Ends At" InputLabelProps={{ shrink: true }}
                    value={form.dealEndsAt} onChange={(e)=>setForm({...form,dealEndsAt:e.target.value})}/>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth type="number" label="Rating" placeholder="4.7"
                    value={form.rating} onChange={(e)=>setForm({...form,rating:e.target.value})}/>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth type="number" label="Num Reviews" placeholder="6403"
                    value={form.numReviews} onChange={(e)=>setForm({...form,numReviews:e.target.value})}/>
                </Grid>

                <Grid item xs={12}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ flexWrap: "wrap" }}>
                    {(form.tags || []).map((t) => (
                      <Chip key={t} label={t} onDelete={() => removeTag(t)} sx={{ mr: 1, mb: 1 }}/>
                    ))}
                  </Stack>
                  {/* ==== NEW LOGIC: Tag input supports "comma or Enter" ====
                     PRO: Matches placeholder promise; splits by commas, trims, and de-dupes.
                     Edge cases: multiple commas, extra spaces, or trailing separator are safely ignored. */}
                  <TextField
                    fullWidth sx={{ mt: 1 }} label="Add tags (comma or Enter)" placeholder="featured, bestseller, flash"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const raw = String(e.currentTarget.value || "");
                        raw.split(",").map(s=>s.trim()).filter(Boolean).forEach(addTag);
                        e.currentTarget.value = "";
                      }
                    }}
                    onBlur={(e) => {
                      const raw = String(e.currentTarget.value || "");
                      raw.split(",").map(s=>s.trim()).filter(Boolean).forEach(addTag);
                      e.currentTarget.value = "";
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Switch checked={!!form.published} onChange={(e)=>setForm({...form,published:e.target.checked})} />}
                    label="Published"
                  />
                </Grid>

                {/* Coupon */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>Coupon (optional)</Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField fullWidth label="Coupon Code" placeholder="OFF10 / SAVE24"
                    value={form.coupon.code} onChange={(e)=>setForm({...form, coupon: { ...form.coupon, code: e.target.value }})}/>
                </Grid>
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth>
                    <InputLabel id="coupon-type">Type</InputLabel>
                    <Select labelId="coupon-type" label="Type" value={form.coupon.type}
                      onChange={(e)=>setForm({...form, coupon: { ...form.coupon, type: e.target.value }})}>
                      <MenuItem value="percent">Percent %</MenuItem>
                      <MenuItem value="fixed">Fixed $</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField fullWidth type="number" label="Amount" placeholder="10"
                    value={form.coupon.amount} onChange={(e)=>setForm({...form, coupon: { ...form.coupon, amount: e.target.value }})}/>
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField fullWidth type="number" label="Min Subtotal" placeholder="0"
                    value={form.coupon.minSubtotal} onChange={(e)=>setForm({...form, coupon: { ...form.coupon, minSubtotal: e.target.value }})}/>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField fullWidth type="datetime-local" label="Expires At" InputLabelProps={{ shrink: true }}
                    value={form.coupon.expiresAt} onChange={(e)=>setForm({...form, coupon: { ...form.coupon, expiresAt: e.target.value }})}/>
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Switch checked={!!form.coupon.active} onChange={(e)=>setForm({...form, coupon: { ...form.coupon, active: e.target.checked }})}/>}
                    label="Coupon Active"
                  />
                </Grid>
              </Grid>
            )}

            {/* CONTENT */}
            {tab === 1 && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth multiline minRows={4}
                    label="Description"
                    placeholder="Short marketing description…"
                    value={form.description}
                    onChange={(e)=>setForm({...form,description:e.target.value})}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth multiline minRows={6}
                    label="Features (one per line)"
                    value={featuresRaw}
                    onChange={(e)=>setFeaturesRaw(e.target.value)}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>Shipping Options</Typography>
                  <Stack spacing={1}>
                    {(form.shippingInfo || []).map((row, idx) => (
                      <Stack key={idx} direction="row" spacing={1}>
                        <TextField label="Label" value={row.label}
                          onChange={(e)=>setForm((f)=>{ const si=[...(f.shippingInfo||[])]; si[idx]={...si[idx],label:e.target.value}; return {...f,shippingInfo:si}; })}/>
                        <TextField label="Note" value={row.note}
                          onChange={(e)=>setForm((f)=>{ const si=[...(f.shippingInfo||[])]; si[idx]={...si[idx],note:e.target.value}; return {...f,shippingInfo:si}; })}/>
                        <TextField label="Cost" type="number" value={row.cost}
                          onChange={(e)=>setForm((f)=>{ const si=[...(f.shippingInfo||[])]; si[idx]={...si[idx],cost:e.target.value}; return {...f,shippingInfo:si}; })}/>
                        <IconButton color="error" onClick={()=>setForm((f)=>({ ...f, shippingInfo: (f.shippingInfo||[]).filter((_,i)=>i!==idx) }))}><Delete/></IconButton>
                      </Stack>
                    ))}
                    <Button startIcon={<Add/>} onClick={()=>addShippingRow()} size="small">Add shipping row</Button>
                  </Stack>
                </Grid>
              </Grid>
            )}

            {/* SPECS & VARIANTS */}
            {tab === 2 && (
              <Grid container spacing={2}>
                {/* Quick template row */}
                <Grid item xs={12}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <FormControl size="small" sx={{ minWidth: 220 }}>
                      <InputLabel id="tpl">Quick template</InputLabel>
                      <Select labelId="tpl" label="Quick template" defaultValue={autoKeyFor(form)}
                        onChange={(e)=>applyTemplateKey(e.target.value)}>
                        {TEMPLATE_OPTIONS.map((t)=>(
                          <MenuItem key={t.key} value={t.key}>{t.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Tooltip title="Beautify all JSON">
                      <span>
                        <Button variant="outlined" size="small" startIcon={<AutoFixHigh/>}
                          onClick={()=>{
                            beautify(specsRaw, setSpecsRaw, "{}");
                            beautify(attrsRaw, setAttrsRaw, "[]");
                            beautify(adjRaw, setAdjRaw, "{}");
                          }}>
                          Beautify
                        </Button>
                      </span>
                    </Tooltip>
                    <Button size="small" onClick={()=>{
                      const t = makeTemplate(empty, "generic");
                      setSpecsRaw(pretty(t.specs)); setAttrsRaw(pretty(t.attributes)); setAdjRaw(pretty(t.adjustments));
                      setTouchedSpecs(false); setTouchedAttrs(false); setTouchedAdj(false);
                    }}>
                      Reset to Generic
                    </Button>
                  </Stack>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="subtitle1">Specs (JSON)</Typography>
                    <Tooltip title="Copy JSON"><IconButton onClick={()=>copy(specsRaw)}><ContentCopy fontSize="small"/></IconButton></Tooltip>
                  </Stack>
                  <TextField
                    fullWidth multiline minRows={14}
                    value={specsRaw}
                    onChange={(e)=>{ setSpecsRaw(e.target.value); setTouchedSpecs(true); }}
                    placeholder={pretty({ brand: "Apple", model: "iPhone 12", warranty: "1 Year" })}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="subtitle1">Attributes (JSON array)</Typography>
                    <Tooltip title="Copy JSON"><IconButton onClick={()=>copy(attrsRaw)}><ContentCopy fontSize="small"/></IconButton></Tooltip>
                  </Stack>
                  <TextField
                    fullWidth multiline minRows={14}
                    value={attrsRaw}
                    onChange={(e)=>{ setAttrsRaw(e.target.value); setTouchedAttrs(true); }}
                    placeholder={pretty([
                      { key: "color", label: "Color", kind: "swatch", values: ["Black","White"], required: false, uiOrder: 1 },
                      { key: "storage", label: "Storage", kind: "select", values: ["64GB","128GB"], required: true, uiOrder: 2 },
                    ])}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="subtitle1">Adjustments (JSON)</Typography>
                    <Tooltip title="Copy JSON"><IconButton onClick={()=>copy(adjRaw)}><ContentCopy fontSize="small"/></IconButton></Tooltip>
                  </Stack>
                  <TextField
                    fullWidth multiline minRows={14}
                    value={adjRaw}
                    onChange={(e)=>{ setAdjRaw(e.target.value); setTouchedAdj(true); }}
                    placeholder={pretty({ storage: { "128GB": 100, "256GB": 220 } })}
                  />
                </Grid>
              </Grid>
            )}

            {/* MEDIA */}
            {tab === 3 && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button variant="outlined" startIcon={<UploadFile/>} onClick={()=>fileInputRef.current?.click()}>
                      Upload images
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      hidden
                      onChange={(e)=>onUploadFiles(e.target.files)}
                    />
                    <TextField
                      fullWidth label="Add image URLs (comma-separated)"
                      onBlur={(e)=>{
                        const urls = String(e.target.value||"").split(",").map(s=>s.trim()).filter(Boolean);
                        if (urls.length) setForm(f=>({...f, images:[...(f.images||[]), ...urls]}));
                        e.target.value = "";
                      }}
                    />
                  </Stack>
                </Grid>
                <Grid item xs={12}>
                  <Stack direction="row" spacing={1} sx={{ overflowX:"auto", pb:1 }}>
                    {(form.images||[]).map((src, i)=>(
                      <Stack key={i} spacing={1} alignItems="center">
                        <img src={src} alt={`p-${i}`} style={{ width: 120, height: 120, objectFit:"cover", borderRadius: 8 }}/>
                        <Button size="small" color="error" onClick={()=>setForm(f=>({...f,images:(f.images||[]).filter((_,idx)=>idx!==i)}))}>
                          Remove
                        </Button>
                      </Stack>
                    ))}
                    {(!form.images || form.images.length===0) && <Typography variant="body2">{NO_IMAGES_TEXT}</Typography>}
                  </Stack>
                </Grid>
              </Grid>
            )}

            <Divider sx={{ my: 2 }} />
            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={onSubmit} disabled={creating||updating}>
                {editingId ? "Update Product" : "Create Product"}
              </Button>
              {editingId && (
                <Button onClick={()=>{
                  setEditingId(null);
                  setForm(empty);
                  setFeaturesRaw(DEFAULT_FEATURES);
                  const gen = makeTemplate(empty, "generic");
                  setSpecsRaw(pretty(gen.specs));
                  setAttrsRaw(pretty(gen.attributes));
                  setAdjRaw(pretty(gen.adjustments));
                  setTouchedSpecs(false); setTouchedAttrs(false); setTouchedAdj(false);
                }}>
                  Cancel
                </Button>
              )}
            </Stack>
          </CardContent>
        </Card>
      </PermGate>

      {/* LIST */}
      <Card>
        <CardContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Slug</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Badge</TableCell>
                <TableCell>Discount</TableCell>
                <TableCell>Coupon</TableCell>
                <TableCell>Views</TableCell>
                <TableCell>Published</TableCell>
                <TableCell width={220}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((p)=>(
                <TableRow key={p._id}>
                  <TableCell>{p.title}</TableCell>
                  <TableCell>{p.slug}</TableCell>
                  <TableCell>{p.category}{p.subcategory ? ` · ${p.subcategory}` : ""}</TableCell>
                  <TableCell>
                    ${p?.price?.current ?? 0}
                    {p?.price?.old ? <span style={{ color:"#888", marginLeft:6, textDecoration:"line-through" }}>${p.price.old}</span> : null}
                  </TableCell>
                  <TableCell>{p.label}</TableCell>
                  <TableCell>{p.discountText}</TableCell>
                  <TableCell>{p?.coupon?.code ? `${p.coupon.code} (${p.coupon.type} ${p.coupon.amount})` : "-"}</TableCell>
                  <TableCell>{p.viewCount ?? 0}</TableCell>
                  <TableCell>{p.published ? "Yes" : "No"}</TableCell>
                  <TableCell>
                    <PermGate all={["products:write"]} fallback={null}>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" startIcon={<Edit/>} onClick={()=>onEdit(p)}>Edit</Button>
                        <Button size="small" color="error" startIcon={<Delete/>} onClick={()=>onDelete(p._id)}>Delete</Button>
                      </Stack>
                    </PermGate>
                  </TableCell>
                </TableRow>
              ))}
              {products.length === 0 && (
                <TableRow><TableCell colSpan={10}>{NO_PRODUCTS_TEXT}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
