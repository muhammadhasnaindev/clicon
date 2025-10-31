/**
 * HelpCenterPage
 * Friendly help hub with search, quick tiles, popular topics, and contact band.
 */

import React, { useMemo, useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Divider,
  Chip,
  InputAdornment,
  Link as MuiLink,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PhoneIcon from "@mui/icons-material/Phone";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import ReplayIcon from "@mui/icons-material/Replay";
import PaymentIcon from "@mui/icons-material/Payment";
import PersonIcon from "@mui/icons-material/Person";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import StorefrontIcon from "@mui/icons-material/Storefront";
import LocalMallIcon from "@mui/icons-material/LocalMall";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { Link as RouterLink, useNavigate, useSearchParams } from "react-router-dom";
import { assetUrl } from "../utils/asset";

/* ------ theme tokens ------ */
const ORANGE = "#FA8232";
const DARK = "#191C1F";
const MUTED = "#5F6C72";
const BORDER = "#E5E7EB";
const PANEL = "#FFFFFF";

/* ------ quick action tiles ------ */
const HELP_TILES = [
  { icon: LocalMallIcon, label: "Track your order", to: "/track-order" },
  { icon: ReplayIcon, label: "Reset your password", to: "/forgot" },
  { icon: PaymentIcon, label: "Payment options", to: "/checkout" },
  { icon: PersonIcon, label: "Your account", to: "/account/dashboard" },
  { icon: CompareArrowsIcon, label: "Wishlist & compare", to: "/compare" },
  { icon: LocalShippingIcon, label: "Shipping & billing", to: "/checkout" },
  { icon: ShoppingCartIcon, label: "Cart & wallet", to: "/shopping-cart" },
  { icon: StorefrontIcon, label: "Sell on Clicon", to: "/posts" },
];

/* ------ lightweight knowledge base entries for search/topics ------ */
const KB = [
  { title: "How do I return an item?", to: "/faq#returns" },
  { title: "What’s your return policy?", to: "/faq#return-policy", featured: true },
  { title: "How long do refunds take?", to: "/faq#refunds" },
  { title: "When will my order arrive?", to: "/faq#delivery" },
  { title: "What’s included in our seasonal campaigns?", to: "/blog" },
  { title: "Are there vouchers or gift offers right now?", to: "/blog" },
  { title: "How do I cancel an order?", to: "/track-order#cancel" },
  { title: "Ask the community", to: "/posts" },
  { title: "How do I change my shop name?", to: "/account/dashboard#shop-name" }, // keep to your route shape
];

export default function HelpCenterPage() {
  const navigate = useNavigate();
  const [sp, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(sp.get("q") || "");

  // keep URL <-> input in sync without loops
  useEffect(() => {
    const current = sp.get("q") || "";
    if (current !== q) setQ(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  const results = useMemo(() => {
    if (!q.trim()) return [];
    const term = q.trim().toLowerCase();
    return KB.filter((a) => a.title.toLowerCase().includes(term));
  }, [q]);

  const submitSearch = (e) => {
    e.preventDefault();
    const trimmed = q.trim();
    setSearchParams(trimmed ? { q: trimmed } : {});
  };

  const useTile = (tile) => navigate(tile.to);

  const seedSearch = (text) => {
    setSearchParams({ q: text });
    window.scrollTo({ top: 120, behavior: "smooth" });
  };

  return (
    <Box sx={{ backgroundColor: "#F9FAFB", py: { xs: 4, md: 6 } }}>
      <Container maxWidth="lg">
        {/* ---------------- Hero / Search ---------------- */}
        <Box
          sx={{
            backgroundColor: PANEL,
            borderRadius: 2,
            p: { xs: 3, md: 5 },
            border: `1px solid ${BORDER}`,
          }}
        >
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={7}>
              <Chip
                label="HELP CENTER"
                size="small"
                sx={{
                  bgcolor: "#EFD33D",
                  color: "#111827",
                  fontWeight: 700,
                  letterSpacing: 0.4,
                  mb: 1.5,
                }}
              />
              <Typography variant="h5" sx={{ fontWeight: 800, color: DARK, mb: 2 }} gutterBottom>
                How can we help?
              </Typography>

              <Box component="form" onSubmit={submitSearch} sx={{ display: "flex", gap: 1.5 }}>
                <TextField
                  placeholder="Search help articles (e.g. returns, delivery, refund)"
                  variant="outlined"
                  size="medium"
                  fullWidth
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: MUTED }} />
                      </InputAdornment>
                    ),
                    sx: { bgcolor: "#F3F4F6" },
                  }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  sx={{
                    px: 3,
                    bgcolor: ORANGE,
                    fontWeight: 800,
                    "&:hover": { bgcolor: "#E7712F" },
                  }}
                >
                  Search
                </Button>
              </Box>

              {/* live results */}
              {!!q.trim() && (
                <Box sx={{ mt: 2 }}>
                  {results.length ? (
                    results.slice(0, 6).map((r) => (
                      <Box
                        key={r.title}
                        sx={{
                          py: 1,
                          display: "flex",
                          alignItems: "center",
                          borderBottom: `1px dashed ${BORDER}`,
                        }}
                      >
                        <ArrowForwardIcon sx={{ fontSize: 18, color: ORANGE, mr: 1 }} />
                        <MuiLink
                          component={RouterLink}
                          to={r.to}
                          sx={{ color: DARK, "&:hover": { color: ORANGE } }}
                        >
                          {r.title}
                        </MuiLink>
                      </Box>
                    ))
                  ) : (
                    <Typography sx={{ color: MUTED, mt: 1 }}>
                      No results for “{q.trim()}”. Try a different keyword.
                    </Typography>
                  )}
                </Box>
              )}
            </Grid>

            <Grid item xs={12} md={5}>
              <Box sx={{ display: "flex", justifyContent: "center" }}>
                <Box
                  component="img"
                  src={assetUrl("/uploads/help/agent.png")}
                  alt="Customer support agent"
                  onError={(e) => {
                    // graceful image fallback (keeps layout intact)
                    e.currentTarget.src =
                      "https://dummyimage.com/420x280/ededed/999&text=Help+Center";
                  }}
                  sx={{ maxWidth: "100%", borderRadius: 2 }}
                />
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* ---------------- Quick help tiles ---------------- */}
        <Box sx={{ mt: { xs: 5, md: 7 } }}>
          <Typography
            variant="h6"
            sx={{ fontWeight: 800, textAlign: "center", mb: 3, color: DARK }}
          >
            What do you need help with?
          </Typography>
          <Grid container spacing={2.5}>
            {HELP_TILES.map((t) => {
              const Icon = t.icon;
              return (
                <Grid item xs={12} sm={6} md={3} key={t.label}>
                  <Card
                    elevation={0}
                    sx={{
                      border: "1px solid #FFE3C5",
                      borderRadius: 2,
                      bgcolor: "#fff",
                      transition: "box-shadow .15s ease, transform .15s ease",
                      "&:hover": { boxShadow: 3, transform: "translateY(-2px)" },
                    }}
                  >
                    <CardActionArea onClick={() => useTile(t)}>
                      <CardContent
                        sx={{
                          display: "flex",
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 1.5,
                          py: 2.25,
                          px: 2.25,
                        }}
                      >
                        <Icon sx={{ color: ORANGE, fontSize: 28 }} />
                        <Typography variant="body1" sx={{ fontWeight: 700, color: DARK }}>
                          {t.label}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>

        {/* ---------------- Popular topics ---------------- */}
        <Box sx={{ mt: { xs: 5, md: 7 } }}>
          <Typography
            variant="h6"
            sx={{ fontWeight: 800, textAlign: "center", mb: 3, color: DARK }}
          >
            Popular topics
          </Typography>

          <Grid container spacing={2}>
            {KB.map((item) => (
              <Grid key={item.title} item xs={12} sm={6} md={4}>
                <MuiLink
                  component="button"
                  type="button"
                  onClick={() => (item.to ? navigate(item.to) : seedSearch(item.title))}
                  sx={{
                    color: item.featured ? ORANGE : MUTED,
                    textAlign: "left",
                    fontSize: 14,
                    "&:hover": { textDecoration: "underline", color: ORANGE },
                  }}
                >
                  • {item.title}
                </MuiLink>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* ---------------- Contact band ---------------- */}
        <Divider sx={{ my: { xs: 5, md: 7 } }} />

        <Box sx={{ textAlign: "center", mb: 2 }}>
          <Chip
            label="CONTACT US"
            size="small"
            sx={{
              bgcolor: "#EEF7FF",
              color: "#2DA5F3",
              fontWeight: 800,
              letterSpacing: 0.4,
            }}
          />
          <Typography variant="h6" sx={{ mt: 1.5, fontWeight: 800, color: DARK }}>
            Didn’t find what you need? Get in touch.
          </Typography>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card elevation={1} sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                  <PhoneIcon sx={{ color: "#2DA5F3", fontSize: 28, mr: 1.25 }} />
                  <Typography variant="h6" sx={{ fontWeight: 800, color: DARK }}>
                    Call us
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: MUTED, mb: 1 }}>
                  We’re available 9:00 AM–5:00 PM (GMT+5/6).
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                  +1-202-555-0126
                </Typography>
                <Button
                  variant="contained"
                  sx={{ textTransform: "none", fontWeight: 800 }}
                  onClick={() => (window.location.href = "tel:+12025550126")}
                >
                  Call now
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card elevation={1} sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                  <ChatBubbleOutlineIcon sx={{ color: "#20C997", fontSize: 28, mr: 1.25 }} />
                  <Typography variant="h6" sx={{ fontWeight: 800, color: DARK }}>
                    Email us
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: MUTED, mb: 1 }}>
                  We reply within business hours.
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                  support@clicon.com
                </Typography>
                <Button
                  variant="contained"
                  color="success"
                  sx={{ textTransform: "none", fontWeight: 800 }}
                  onClick={() => (window.location.href = "mailto:support@clicon.com")}
                >
                  Contact us
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
