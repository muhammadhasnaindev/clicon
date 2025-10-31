// src/components/header/MiddleNav.jsx
/**
 * Summary:
 * Brand/search/action header bar with desktop autosuggest and mobile sheets.
 
 */

import React, { useState, useRef, useEffect } from "react";
import {
  AppBar, Toolbar, Box, Typography, InputBase, IconButton, Badge,
  List, ListItemButton, ListItemAvatar, Avatar, ListItemText,
  Typography as MuiText, Divider, CircularProgress, Tooltip, Drawer,
  Dialog, DialogContent, DialogTitle, RadioGroup, FormControlLabel, Radio,
  Button
} from "@mui/material";
import { useMediaQuery } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import SearchIcon from "@mui/icons-material/Search";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import RoomOutlinedIcon from "@mui/icons-material/RoomOutlined";
import CompareArrowsOutlinedIcon from "@mui/icons-material/CompareArrowsOutlined";
import HeadsetMicOutlinedIcon from "@mui/icons-material/HeadsetMicOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LanguageIcon from "@mui/icons-material/Language";
import CloseIcon from "@mui/icons-material/Close";

import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";

import { selectCartCount } from "../../store/slices/cartSlice";
import {
  selectWishlistItems,
  selectWishlistCount,
  removeFromWishlist as removeFromWishlistAction,
} from "../../store/slices/wishlistSlice";

import CartPopoverConnected from "./popovers/CartPopoverConnected";
import WishlistPopover from "./popovers/WishlistPopover";
import ProductQuickView from "./product/ProductQuickView";
import { openQuickView } from "../../store/slices/quickViewSlice";

import { convert, formatMoney } from "../../utils/money";
import { useGetProductsQuery } from "../../store/api/apiSlice";
import AllCategoryDropdown from "./category/AllCategoryDropdown";

import {
  selectCurrency,
  selectLanguage,
  setCurrency,
  setLanguage,
} from "../../store/slices/settingsSlice.jsx";
import i18n from "../../i18n";

/* ---------- helpers ---------- */
const useCurrency = () => {
  const currency = useSelector((s) => s.settings?.currency) || "USD";
  const rates = useSelector((s) => s.settings?.rates) || { USD: 1 };
  return { currency, rates };
};
const toAbs = (u) => {
  if (!u) return "/uploads/placeholder.png";
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("//")) return `${window?.location?.protocol || "http:"}${u}`;
  const base = window?.location?.origin || "";
  return `${base}${u.startsWith("/") ? "" : "/"}${u}`;
};

// PRO: reduced-motion aware scroll helper (avoid jank for users who prefer less motion)
const scrollTop = () => {
  try {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" });
  } catch {}
};

// PRO: Recent-searches persistence (small, user-friendly)
const RS_KEY = "search:recent"; // last 5 strings
const readRecents = () => {
  try {
    const arr = JSON.parse(localStorage.getItem(RS_KEY) || "[]");
    return Array.isArray(arr) ? arr.slice(0, 5) : [];
  } catch {
    return [];
  }
};
const writeRecents = (next) => {
  try {
    localStorage.setItem(RS_KEY, JSON.stringify(next.slice(0, 5)));
  } catch {}
};

const MiddleNav = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // tiny screens (Galaxy S8/S9 width and under)
  const isXXS = useMediaQuery("(max-width:360px)");

  // auth
  const user = useSelector((s) => s.auth?.user);
  const isAuthed = !!(user && (user._id || user.id || user.email));
  const role = user?.role || "user";
  const displayName =
    (user?.displayName ||
      user?.name ||
      [user?.firstName, user?.lastName].filter(Boolean).join(" "))?.trim() || "";

  // cart & wishlist
  const count = useSelector(selectCartCount);
  const wishlistItems = useSelector(selectWishlistItems);
  const wishlistCount = useSelector(selectWishlistCount);

  // money
  const { currency, rates } = useCurrency();
  const fmt = (v) => formatMoney(convert(v, rates, currency), currency);

  // language & currency
  const lang = useSelector(selectLanguage) || "en";
  const changeLang = (v) => { dispatch(setLanguage(v)); i18n.changeLanguage(v.toLowerCase()); };
  const changeCurr = (v) => dispatch(setCurrency(v));

  // cart popover
  const [anchorElCart, setAnchorElCart] = useState(null);
  const handleCartClick = (e) => setAnchorElCart(e.currentTarget);
  const handleCartClose = () => setAnchorElCart(null);

  // wishlist popover
  const [anchorElWishlist, setAnchorElWishlist] = useState(null);
  const handleWishlistClick = (e) => setAnchorElWishlist(e.currentTarget);
  const handleWishlistClose = () => setAnchorElWishlist(null);
  const onRemoveWishlist = (id) => dispatch(removeFromWishlistAction(id));

  // quick view for cart popover
  const [openProductQuickView, setOpenProductQuickView] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const handleViewProduct = (product) => {
    setSelectedProduct({
      title: product?.title,
      sku: product?.sku || "SKU1234",
      brand: product?.brand || "Brand",
      price: product?.priceBase || 0,
      oldPrice: product?.priceBase ? product.priceBase + 200 : 0,
      discount: 10,
      images: [product?.image].filter(Boolean),
      colors: ["#ccc", "#333"],
      memory: ["8GB", "16GB"],
      size: ["13-inch", "15-inch"],
      storage: ["256GB", "512GB"],
    });
    setOpenProductQuickView(true);
  };

  /* ======== SEARCH ======== */
  const rootRef = useRef(null);
  const [term, setTerm] = useState("");
  const [openResults, setOpenResults] = useState(false);

  // PRO: keep a small recent-searches list
  const [recents, setRecents] = useState(() => readRecents());
  const pushRecent = (q) => {
    const t = q.trim();
    if (!t) return;
    const next = [t, ...recents.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 5);
    setRecents(next);
    writeRecents(next);
  };

  // debounce
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebounced(term.trim()), 200);
    return () => clearTimeout(id);
  }, [term]);

  const { data, isFetching } = useGetProductsQuery(
    debounced ? { q: debounced, page: 1, limit: 50 } : { q: "", limit: 0 },
    { skip: !debounced }
  );
  const results = data?.data || [];

  useEffect(() => {
    const onDocClick = (e) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpenResults(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setOpenResults(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // PRO: keyboard navigation over suggestions (why: makes search faster & accessible)
  const [activeIdx, setActiveIdx] = useState(-1); // -1 = none
  useEffect(() => {
    // reset highlight when the list changes
    setActiveIdx(-1);
  }, [debounced, openResults]);

  const triggerSearchNav = (q) => {
    const s = q.trim();
    if (!s) return;
    setOpenResults(false);
    navigate(`/search?q=${encodeURIComponent(s)}&page=1`);
    pushRecent(s);
    scrollTop();
  };

  // account click
  const handleUserClick = () => {
    if (isAuthed) {
      navigate(role === "admin" || role === "manager" ? "/admin" : "/account/dashboard");
    } else {
      navigate("/auth");
    }
    scrollTop();
  };

  /* ======== MOBILE NAV (Drawer) + Mobile Search Sheet ======== */
  const [drawer, setDrawer] = useState(false);
  const [searchSheet, setSearchSheet] = useState(false);

  /* ======== Lang/Currency bottom sheet (mobile) ======== */
  const [lcOpen, setLcOpen] = useState(false);

  return (
    <>
      <AppBar
        position="relative"
        sx={{
          backgroundColor: "#1B6392",
          py: { xs: isXXS ? 0.25 : 0.5, sm: 1, md: 1.5 },
        }}
        elevation={0}
      >
        <Toolbar
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "auto 1fr auto", md: "200px 1fr auto" },
            alignItems: "center",
            px: { xs: isXXS ? 0.25 : 0.5, md: 8 },
            gap: { xs: isXXS ? 0 : 0.25, md: 2 },
            minHeight: { xs: isXXS ? 52 : 56, md: 72 },
          }}
        >
          {/* left: hamburger + logo */}
          <Box sx={{ display: "flex", alignItems: "center", gap: isXXS ? 0.25 : 0.5, minWidth: 0 }}>
            <IconButton
              onClick={() => setDrawer(true)}
              sx={{ display: { xs: "inline-flex", md: "none" }, color: "#fff", p: isXXS ? 0.25 : 0.5 }}
              aria-label="open menu"
            >
              <MenuIcon sx={{ fontSize: isXXS ? 20 : 24 }} />
            </IconButton>

            <Typography
              variant="h6"
              sx={{
                fontFamily: "Public Sans, sans-serif",
                fontWeight: 800,
                color: "#fff",
                letterSpacing: { xs: 0.2, md: 0.5 },
                fontSize: { xs: isXXS ? 15.5 : 18, md: 22 },
                maxWidth: { xs: isXXS ? 84 : 110, md: "unset" }, // clamp harder on tiny screens
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                cursor: "pointer",
                userSelect: "none",
                lineHeight: 1,
              }}
              onClick={() => { navigate("/"); scrollTop(); }}
              title="CLICON"
            >
              CLICON
            </Typography>
          </Box>

          {/* center search (md+) */}
          <Box
            ref={rootRef}
            sx={{ position: "relative", display: { xs: "none", md: "block" }, mx: { md: 3 } }}
          >
            <Box
              sx={{
                px: 2,
                height: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "#fff",
                borderRadius: 1,
                boxShadow: "0 1px 0 rgba(0,0,0,0.06)",
              }}
            >
              <InputBase
                value={term}
                onChange={(e) => { setTerm(e.target.value); setOpenResults(true); }}
                onFocus={() => setOpenResults(true)}
                onKeyDown={(e) => {
                  const total = results.length || 0;
                  // PRO: ↑/↓ to move selection, Enter to act
                  if (e.key === "ArrowDown" && total > 0) {
                    e.preventDefault();
                    setActiveIdx((i) => (i + 1) % total);
                    return;
                  }
                  if (e.key === "ArrowUp" && total > 0) {
                    e.preventDefault();
                    setActiveIdx((i) => (i - 1 + total) % total);
                    return;
                  }
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (activeIdx >= 0 && activeIdx < total) {
                      const p = results[activeIdx];
                      dispatch(openQuickView(p._id || p.id || p.slug));
                      setOpenResults(false);
                      return;
                    }
                    triggerSearchNav(term);
                    return;
                  }
                }}
                placeholder="Search for anything…"
                sx={{ flex: 1, fontSize: 14, color: "#333" }}
                inputProps={{ "aria-label": "search" }}
              />
              {isFetching ? (
                <CircularProgress size={18} sx={{ mr: 0.5, color: "#1B6392" }} />
              ) : (
                <SearchIcon sx={{ color: "#1B6392", fontSize: 20 }} />
              )}
            </Box>

            {/* desktop results */}
            {openResults && (
              <Box
                role="listbox"
                aria-label="search suggestions"
                sx={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 52,
                  bgcolor: "#fff",
                  borderRadius: 1,
                  boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
                  border: "1px solid #E5E7EB",
                  zIndex: 10,
                  maxHeight: 420,
                  overflowY: "auto",
                }}
              >
                {!debounced && (recents.length > 0) && (
                  <>
                    {/* PRO: recent searches block */}
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, pt: 1.5 }}>
                      <MuiText sx={{ fontSize: 12, color: "#6b7280", fontWeight: 700, letterSpacing: 0.3 }}>
                        Recent Searches
                      </MuiText>
                      <Button
                        size="small"
                        onClick={() => { setRecents([]); writeRecents([]); }}
                        sx={{ textTransform: "none", fontSize: 12, color: "#6b7280" }}
                        startIcon={<CloseIcon fontSize="small" />}
                      >
                        Clear
                      </Button>
                    </Box>
                    <List disablePadding>
                      {recents.map((q, i) => (
                        <ListItemButton key={`${q}_${i}`} onMouseDown={(e) => e.preventDefault()} onClick={() => triggerSearchNav(q)}>
                          <ListItemText
                            primary={<MuiText noWrap sx={{ fontSize: 14, color: "#111", fontWeight: 600 }}>{q}</MuiText>}
                            secondary={<MuiText noWrap sx={{ fontSize: 12, color: "#6b7280" }}>Press Enter to search</MuiText>}
                            sx={{ ml: 1 }}
                          />
                        </ListItemButton>
                      ))}
                    </List>
                    <Divider />
                  </>
                )}

                {!debounced && recents.length === 0 && (
                  <MuiText sx={{ p: 2, fontSize: 14, color: "#666" }}>Type to search products…</MuiText>
                )}
                {debounced && !isFetching && results.length === 0 && (
                  <MuiText sx={{ p: 2, fontSize: 14, color: "#666" }}>No products found.</MuiText>
                )}
                {results.length > 0 && (
                  <List disablePadding>
                    {results.map((p, idx) => {
                      const rawImg = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : (p.image || "/uploads/placeholder.png");
                      const img = toAbs(rawImg);
                      const price = p?.price?.current;
                      const active = idx === activeIdx;

                      return (
                        <React.Fragment key={p._id || p.id || p.slug || idx}>
                          <ListItemButton
                            role="option"
                            aria-selected={active ? "true" : "false"}
                            onMouseDown={(e) => e.preventDefault()}
                            onMouseEnter={() => setActiveIdx(idx)}
                            onClick={() => {
                              dispatch(openQuickView(p._id || p.id || p.slug));
                              setOpenResults(false);
                            }}
                            sx={{
                              py: 1,
                              bgcolor: active ? "rgba(27,99,146,0.06)" : "transparent",
                            }}
                          >
                            <ListItemAvatar>
                              <Avatar variant="rounded" sx={{ width: 44, height: 44, borderRadius: 1, bgcolor: "#fff" }} src={img} imgProps={{ loading: "lazy" }} />
                            </ListItemAvatar>
                            <ListItemText
                              primary={<MuiText noWrap sx={{ fontSize: 14, color: "#111", fontWeight: 600 }}>{p.title || p.name || "Untitled"}</MuiText>}
                              secondary={<MuiText noWrap sx={{ fontSize: 12, color: "#6b7280" }}>{p.brand || p.category || ""}</MuiText>}
                              sx={{ ml: 1 }}
                            />
                            {typeof price === "number" && (
                              <MuiText sx={{ fontSize: 13, color: "#1B6392", fontWeight: 700 }}>{fmt(price)}</MuiText>
                            )}
                          </ListItemButton>
                          {idx < results.length - 1 && <Divider component="li" />}
                        </React.Fragment>
                      );
                    })}
                  </List>
                )}
              </Box>
            )}
          </Box>

          {/* right actions — ALWAYS visible on xs */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: { xs: isXXS ? 0 : 0.25, md: 2 },
              justifySelf: "end",
              minWidth: 0,
            }}
          >
            {/* search (opens sheet on xs) */}
            <IconButton
              aria-label="open search"
              onClick={() => setSearchSheet(true)}
              sx={{ color: "#fff", display: { xs: "inline-flex", md: "none" }, p: isXXS ? 0.25 : 0.5 }}
            >
              <SearchIcon sx={{ fontSize: isXXS ? 20 : 24 }} />
            </IconButton>

            {/* globe -> bottom sheet for language/currency (xs only) */}
            <IconButton
              aria-label="language and currency"
              onClick={() => setLcOpen(true)}
              sx={{ color: "#fff", display: { xs: "inline-flex", md: "none" }, p: isXXS ? 0.25 : 0.5 }}
            >
              <LanguageIcon sx={{ fontSize: isXXS ? 20 : 24 }} />
            </IconButton>

            {/* cart / wishlist / account */}
            <IconButton sx={{ color: "#fff", p: isXXS ? 0.25 : 0.5 }} onClick={handleCartClick} aria-label="open cart">
              <Badge
                badgeContent={count}
                color="error"
                max={99}
                sx={{
                  "& .MuiBadge-badge": {
                    minWidth: isXXS ? 14 : 16,
                    height: isXXS ? 14 : 16,
                    fontSize: isXXS ? 9 : 10,
                    top: isXXS ? 2 : 3,
                    right: isXXS ? -3 : -4,
                    padding: 0,
                  },
                }}
              >
                <ShoppingCartIcon sx={{ fontSize: isXXS ? 20 : 24 }} />
              </Badge>
            </IconButton>

            <IconButton sx={{ color: "#fff", p: isXXS ? 0.25 : 0.5 }} onClick={handleWishlistClick} aria-label="open wishlist">
              <Badge
                badgeContent={wishlistCount}
                color="error"
                max={99}
                sx={{
                  "& .MuiBadge-badge": {
                    minWidth: isXXS ? 14 : 16,
                    height: isXXS ? 14 : 16,
                    fontSize: isXXS ? 9 : 10,
                    top: isXXS ? 2 : 3,
                    right: isXXS ? -3 : -4,
                    padding: 0,
                  },
                }}
              >
                <FavoriteBorderIcon sx={{ fontSize: isXXS ? 20 : 24 }} />
              </Badge>
            </IconButton>

            <Tooltip title={isAuthed ? (displayName ? `Hi, ${displayName}` : "My account") : "Sign in / Register"}>
              <IconButton sx={{ color: "#fff", p: isXXS ? 0.25 : 0.5 }} onClick={handleUserClick} aria-label="account">
                <PersonOutlineIcon sx={{ fontSize: isXXS ? 20 : 24 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Cart */}
      <CartPopoverConnected
        open={Boolean(anchorElCart)}
        anchorEl={anchorElCart}
        onClose={handleCartClose}
        onCheckout={() => {
          handleCartClose();
          navigate("/checkout");
          scrollTop();
        }}
        onViewCart={() => {
          handleCartClose();
          navigate("/shopping-cart");
          scrollTop();
        }}
        onViewProduct={handleViewProduct}
      />

      {/* Wishlist */}
      <WishlistPopover
        open={Boolean(anchorElWishlist)}
        anchorEl={anchorElWishlist}
        onClose={handleWishlistClose}
        items={wishlistItems}
        onRemoveItem={onRemoveWishlist}
        onViewWishlist={() => {
          handleWishlistClose();
          navigate("/wishlist");
          scrollTop();
        }}
      />

      {/* Quick View */}
      {selectedProduct && (
        <ProductQuickView
          open={openProductQuickView}
          onClose={() => setOpenProductQuickView(false)}
          product={selectedProduct}
        />
      )}

      {/* Drawer */}
      <Drawer
        open={Boolean(drawer)}
        onClose={() => setDrawer(false)}
        anchor="left"
        PaperProps={{ sx: { width: 320 } }}
      >
        <Box sx={{ p: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton onClick={() => setDrawer(false)} aria-label="back"><ArrowBackIosNewIcon fontSize="small" /></IconButton>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Menu</Typography>
        </Box>
        <Divider />
        <List>
          <ListItemButton onClick={() => { setDrawer(false); navigate("/track-order"); }}>
            <RoomOutlinedIcon sx={{ mr: 1 }} /> <ListItemText primary="Track Order" />
          </ListItemButton>
          <ListItemButton onClick={() => { setDrawer(false); navigate("/compare"); }}>
            <CompareArrowsOutlinedIcon sx={{ mr: 1 }} /> <ListItemText primary="Compare" />
          </ListItemButton>
          <ListItemButton onClick={() => { setDrawer(false); navigate("/help-center"); }}>
            <HeadsetMicOutlinedIcon sx={{ mr: 1 }} /> <ListItemText primary="Customer Support" />
          </ListItemButton>
          <ListItemButton onClick={() => { setDrawer(false); navigate("/faq"); }}>
            <InfoOutlinedIcon sx={{ mr: 1 }} /> <ListItemText primary="Need Help" />
          </ListItemButton>
        </List>
        <Divider sx={{ my: 1 }} />
        <Box sx={{ p: 1 }}>
          <Typography variant="subtitle2" sx={{ px: 1.5, pb: 1, fontWeight: 700 }}>Categories</Typography>
          <AllCategoryDropdown
            buttonRef={{ current: null }}
            dropdownRef={{ current: null }}
            onClose={() => {}}
          />
        </Box>
      </Drawer>

      {/* Search sheet (xs) */}
      <Dialog open={searchSheet} onClose={() => setSearchSheet(false)} fullWidth>
        <DialogTitle
          sx={{
            p: 1,
            display: "flex",
            alignItems: "center",
            gap: 1,
            borderBottom: "1px solid #E5E7EB",
          }}
        >
          <IconButton onClick={() => setSearchSheet(false)} aria-label="back">
            <ArrowBackIosNewIcon fontSize="small" />
          </IconButton>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Search</Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 1.5 }}>
          <Box
            sx={{
              px: 2,
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "#fff",
              borderRadius: 1,
              border: "1px solid #E5E7EB",
              mb: 1,
              position: "sticky",
              top: 0,
              zIndex: 1,
            }}
          >
            <InputBase
              autoFocus
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  triggerSearchNav(term);
                }
              }}
              placeholder="Search for anything…"
              sx={{ flex: 1, fontSize: 14, color: "#333" }}
            />
            {isFetching ? <CircularProgress size={18} /> : <SearchIcon />}
          </Box>

          {!debounced && (
            <>
              {recents.length ? (
                <>
                  <MuiText sx={{ px: 2, pt: 1, fontSize: 12, color: "#6b7280", fontWeight: 700, letterSpacing: 0.3 }}>
                    Recent Searches
                  </MuiText>
                  <List disablePadding sx={{ border: "1px solid #EEF2F5", borderRadius: 1, mt: 1 }}>
                    {recents.map((q, i) => (
                      <React.Fragment key={`${q}_${i}`}>
                        <ListItemButton onClick={() => { setSearchSheet(false); triggerSearchNav(q); }}>
                          <ListItemText
                            primary={<MuiText noWrap sx={{ fontSize: 14, color: "#111", fontWeight: 600 }}>{q}</MuiText>}
                          />
                        </ListItemButton>
                        {i < recents.length - 1 && <Divider component="li" />}
                      </React.Fragment>
                    ))}
                  </List>
                  <Button
                    size="small"
                    onClick={() => { setRecents([]); writeRecents([]); }}
                    sx={{ mt: 1, textTransform: "none" }}
                    startIcon={<CloseIcon fontSize="small" />}
                  >
                    Clear recent
                  </Button>
                </>
              ) : (
                <MuiText sx={{ p: 2, fontSize: 14, color: "#666" }}>Type to search products…</MuiText>
              )}
            </>
          )}

          {debounced && !isFetching && results.length === 0 && (
            <MuiText sx={{ p: 2, fontSize: 14, color: "#666" }}>No products found.</MuiText>
          )}
          {results.length > 0 && (
            <List disablePadding sx={{ border: "1px solid #EEF2F5", borderRadius: 1 }}>
              {results.map((p, idx) => {
                const rawImg = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : (p.image || "/uploads/placeholder.png");
                const img = toAbs(rawImg);
                const price = p?.price?.current;

                return (
                  <React.Fragment key={p._id || p.id || p.slug || idx}>
                    <ListItemButton
                      onClick={() => {
                        dispatch(openQuickView(p._id || p.id || p.slug));
                        setSearchSheet(false);
                      }}
                      sx={{ py: 1 }}
                    >
                      <ListItemAvatar>
                        <Avatar variant="rounded" sx={{ width: 44, height: 44, borderRadius: 1, bgcolor: "#fff" }} src={img} imgProps={{ loading: "lazy" }} />
                      </ListItemAvatar>
                      <ListItemText
                        primary={<MuiText noWrap sx={{ fontSize: 14, color: "#111", fontWeight: 600 }}>{p.title || p.name || "Untitled"}</MuiText>}
                        secondary={<MuiText noWrap sx={{ fontSize: 12, color: "#6b7280" }}>{p.brand || p.category || ""}</MuiText>}
                        sx={{ ml: 1 }}
                      />
                      {typeof price === "number" && (
                        <MuiText sx={{ fontSize: 13, color: "#1B6392", fontWeight: 700 }}>{fmt(price)}</MuiText>
                      )}
                    </ListItemButton>
                    {idx < results.length - 1 && <Divider component="li" />}
                  </React.Fragment>
                );
              })}
            </List>
          )}
        </DialogContent>
      </Dialog>

      {/* Language + Currency bottom sheet (mobile) */}
      <Dialog
        open={lcOpen}
        onClose={() => setLcOpen(false)}
        fullWidth
        PaperProps={{
          sx: {
            m: 0,
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            borderTopLeftRadius: 14,
            borderTopRightRadius: 14,
          },
        }}
      >
        <DialogTitle sx={{ px: 2, py: 1.25, fontWeight: 700 }}>
          Preferences
        </DialogTitle>
        <DialogContent sx={{ px: 2, pb: 2 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
              Language
            </Typography>
            <RadioGroup
              value={lang}
              onChange={(e) => changeLang(e.target.value)}
              sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0.5 }}
            >
              <FormControlLabel value="en" control={<Radio size="small" />} label="English" />
              {/* future: add more languages when content ready */}
            </RadioGroup>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
              Currency
            </Typography>
            <RadioGroup
              value={currency}
              onChange={(e) => changeCurr(e.target.value)}
              sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0.5 }}
            >
              <FormControlLabel value="USD" control={<Radio size="small" />} label="USD" />
              <FormControlLabel value="EUR" control={<Radio size="small" />} label="EUR" />
              <FormControlLabel value="PKR" control={<Radio size="small" />} label="PKR" />
            </RadioGroup>
          </Box>

          <Button onClick={() => setLcOpen(false)} variant="contained" fullWidth>
            Done
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MiddleNav;
