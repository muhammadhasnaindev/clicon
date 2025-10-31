// src/pages/account/Dashboard.jsx
/**
 * Account Dashboard — sample tiles and quick links.
 *
 
 */

import React from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Avatar,
  Button,
  Divider,
  Chip,
  Stack,
  Link as MuiLink,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  ListAlt as OrdersIcon,
  LocalShipping as TrackIcon,
  ShoppingCart as CartIcon,
  FavoriteBorder as WishlistIcon,
  PersonOutline as ProfileIcon,
  LocationOn as AddressIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  CreditCard as CardIcon,
  Visibility as EyeIcon,
} from "@mui/icons-material";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

const Sidebar = () => {
  const items = [
    { icon: <DashboardIcon />, text: "Dashboard", to: "/account/dashboard" },
    { icon: <OrdersIcon />, text: "Order History", to: "/account/orders" },
    { icon: <TrackIcon />, text: "Track Order", to: "/account/track" },
    { icon: <CartIcon />, text: "Shopping Cart", to: "/shopping-cart" },
    { icon: <WishlistIcon />, text: "Wishlist", to: "/wishlist" },
    { icon: <ProfileIcon />, text: "Profile & Address", to: "/account/profile" },
    { icon: <HistoryIcon />, text: "Browsing History", to: "/account/history" },
    { icon: <SettingsIcon />, text: "Setting", to: "/account/settings" },
    { icon: <LogoutIcon />, text: "Log out", to: "/logout" },
  ];

  return (
    <Paper variant="outlined" sx={{ p: 0 }}>
      <List dense aria-label="Account navigation">
        {items.map((it, i) => (
          <ListItem
            key={`${it.text}-${i}`}
            button
            component={Link}
            to={it.to}
            sx={{
              py: 1,
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: "text.secondary" }}>
              {it.icon}
            </ListItemIcon>
            <ListItemText
              primary={<Typography variant="body2">{it.text}</Typography>}
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

const StatTile = ({ label, value, color }) => (
  <Paper variant="outlined" sx={{ p: 2 }}>
    <Typography sx={{ color: "text.secondary", fontSize: 13 }}>{label}</Typography>
    <Typography sx={{ fontWeight: 700, color, mt: 0.5 }}>{value}</Typography>
  </Paper>
);

const CardItem = ({ title, number, name, color = "#1B6392" }) => (
  <Paper
    elevation={0}
    sx={{
      p: 2,
      border: "1px solid",
      borderColor: "divider",
      bgcolor: color,
      color: "#fff",
      borderRadius: 1,
      position: "relative",
      overflow: "hidden",
    }}
  >
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
      <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
      <Chip label="Edit Card" size="small" sx={{ bgcolor: "rgba(255,255,255,.2)", color: "#fff" }} />
    </Stack>
    <Typography sx={{ mt: 2, fontWeight: 700, letterSpacing: 1 }}>
      {number.replace(/(\d{4})/g, "$1 ").trim()}
    </Typography>
    <Typography sx={{ mt: 0.5, opacity: 0.9 }}>{name}</Typography>
  </Paper>
);

const Dashboard = () => {
  const user = useSelector((s) => s.auth?.user || { name: "Kevin Gilbert", email: "kevin@example.com" });

  const orders = [
    { id: "#10568710", status: "IN PROGRESS", date: "Dec 20, 2019 05:38", total: "$150.05", items: 2 },
    { id: "#7365767", status: "COMPLETED", date: "Feb 02, 2019 20:28", total: "$89.00", items: 1 },
    { id: "#7564787", status: "CANCELLED", date: "Mar 20, 2019 13:44", total: "$350.77", items: 5 },
  ];

  const browsing = [
    { title: "T20 TWS Earbuds", price: "$79", tag: "HOT" },
    { title: "Samsung Galaxy S23", price: "$2,300", tag: "" },
    { title: "High-Speed HDMI Cable", price: "$30", tag: "BEST DEALS" },
    { title: "Wireless Headphone", price: "$59", tag: "" },
  ];

  return (
    <Box sx={{ px: { xs: 2, md: 6 }, py: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
        Hello, {user?.name?.split(" ")[0] || "User"}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
        From your account dashboard, you can easily check & view your recent orders,
        manage your shipping and billing addresses and edit your password and account details.
      </Typography>

      <Grid container spacing={3}>
        {/* left sidebar */}
        <Grid item xs={12} md={3}>
          <Sidebar />
        </Grid>

        {/* main content */}
        <Grid item xs={12} md={9}>
          {/* Account Info + Address + Stats */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography sx={{ fontWeight: 700, mb: 2 }}>Account Info</Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ width: 48, height: 48 }}>{(user?.name || "U").charAt(0)}</Avatar>
                  <Box>
                    <Typography sx={{ fontWeight: 600 }}>{user?.name || "User"}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Email: {user?.email || "user@example.com"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Phone: +1 202-555-0198
                    </Typography>
                  </Box>
                </Stack>
                <Button size="small" variant="outlined" sx={{ mt: 2 }}>
                  Edit Account
                </Button>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography sx={{ fontWeight: 700, mb: 2 }}>Billing Address</Typography>
                <Typography variant="body2">
                  4259 Star Route, New York, 06 Road, No 4.<br />
                  Dhaka-1209, Bangladesh.
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Phone Number: +202-555-0188
                </Typography>
                <Typography variant="body2">Email: {user?.email || "user@example.com"}</Typography>
                <Button size="small" variant="outlined" sx={{ mt: 2 }}>
                  Edit Address
                </Button>
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <StatTile label="Total Orders" value="154" color="#1B6392" />
            </Grid>
            <Grid item xs={12} md={4}>
              <StatTile label="Pending Orders" value="05" color="#F59E0B" />
            </Grid>
            <Grid item xs={12} md={4}>
              <StatTile label="Completed Orders" value="149" color="#10B981" />
            </Grid>
          </Grid>

          {/* Payment option */}
          <Paper variant="outlined" sx={{ p: 2, mt: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography sx={{ fontWeight: 700 }}>Payment Option</Typography>
              <MuiLink component={Link} to="#" underline="hover" color="primary">
                Add Card +
              </MuiLink>
            </Stack>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <CardItem title="$95,400.00 USD" number="**** **** **** 3814" name="Kevin Gilbert" />
              </Grid>
              <Grid item xs={12} md={6}>
                <CardItem
                  title="$87,652.00 USD"
                  number="**** **** **** 1761"
                  name="Kevin Gilbert"
                  color="#059669"
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Recent Orders */}
          <Paper variant="outlined" sx={{ p: 2, mt: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography sx={{ fontWeight: 700 }}>Recent Order</Typography>
              <MuiLink component={Link} to="/account/orders" underline="hover" color="primary">
                View All →
              </MuiLink>
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Grid container sx={{ px: 1, color: "text.secondary", fontSize: 13, fontWeight: 600 }}>
              <Grid item xs={12} md={3}>ORDER ID</Grid>
              <Grid item xs={12} md={3}>STATUS</Grid>
              <Grid item xs={12} md={3}>DATE</Grid>
              <Grid item xs={12} md={2}>TOTAL</Grid>
              <Grid item xs={12} md={1} textAlign="right">ACTION</Grid>
            </Grid>
            {orders.map((o, i) => (
              <React.Fragment key={`${o.id}-${i}`}>
                <Divider sx={{ my: 1 }} />
                <Grid container alignItems="center" sx={{ px: 1 }}>
                  <Grid item xs={12} md={3}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{o.id}</Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Chip
                      size="small"
                      label={o.status}
                      color={
                        o.status === "COMPLETED"
                          ? "success"
                          : o.status === "IN PROGRESS"
                          ? "warning"
                          : "default"
                      }
                      variant={o.status === "CANCELLED" ? "outlined" : "filled"}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="body2" color="text.secondary">{o.date}</Typography>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <Typography variant="body2">{o.total} ({o.items} Products)</Typography>
                  </Grid>
                  <Grid item xs={12} md={1} textAlign="right">
                    <Button size="small" endIcon={<EyeIcon />} component={Link} to="/account/orders/1">
                      View
                    </Button>
                  </Grid>
                </Grid>
              </React.Fragment>
            ))}
          </Paper>

          {/* Browsing History */}
          <Paper variant="outlined" sx={{ p: 2, mt: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography sx={{ fontWeight: 700 }}>Browsing History</Typography>
              <MuiLink component={Link} to="/account/history" underline="hover" color="primary">
                View All →
              </MuiLink>
            </Stack>

            <Grid container spacing={2} sx={{ mt: 1 }}>
              {browsing.map((p, i) => (
                <Grid item xs={12} sm={6} md={3} key={`${p.title}-${i}`}>
                  <Paper variant="outlined" sx={{ p: 1.5 }}>
                    <Box sx={{ height: 120, bgcolor: "grey.100", borderRadius: 1, mb: 1 }} />
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                        {p.title}
                      </Typography>
                      {p.tag && (
                        <Chip size="small" label={p.tag} color="primary" variant="outlined" />
                      )}
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {p.price}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
