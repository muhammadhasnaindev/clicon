// src/pages/account/AdminDashboard.jsx
/**
 * AdminDashboard
 * Summary: Entry hub showing tiles based on role/permissions.

 */

import { Link } from "react-router-dom";
import { Card, CardContent, Typography, Button, Grid, Skeleton, Stack, Chip } from "@mui/material";
import { useMeQuery } from "../../store/api/apiSlice";
import { hasAnyPermission, hasRole } from "../../utils/acl";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import HelpCenterIcon from "@mui/icons-material/HelpCenter";

/** ======================= NEW/REVISED LOGIC =======================
 * PRO: Human-friendly identity line even if fields are missing.
 */
const who = (me) => me?.name || me?.email || "Unknown user";
const roleText = (me) => (me?.role ? String(me.role) : "—");

export default function AdminDashboard() {
  const { data, isFetching } = useMeQuery();
  const me = data?.data ?? data ?? null;

  /** ======================= NEW/REVISED LOGIC =======================
   * PRO: Robust admin-ish predicate if `me` is not yet loaded.
   */
  const isAdminish = !!me && hasRole(me, ["admin", "manager"]);

  const canProducts  = isAdminish || hasAnyPermission(me, ["products:*", "products:write"]);
  const canAnalytics = isAdminish || hasAnyPermission(me, ["analytics:view"]);
  const canPosts     = isAdminish || hasAnyPermission(me, [
    "posts:*", "posts:write", "posts:read", "posts:read:own", "posts:write:own",
  ]);
  const canUsers     = isAdminish;

  const canOrders    = isAdminish || hasAnyPermission(me, ["billing:view","orders:update","analytics:view"]);
  const canSupport   = isAdminish || hasAnyPermission(me, ["support:*", "support:reply", "support:read"]);
  const canFaqs      = isAdminish || hasAnyPermission(me, ["faqs:*", "faqs:write", "faqs:read"]);

  return (
    <div className="p-4">
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="h5" gutterBottom>Admin Panel</Typography>
        {me?.role && <Chip size="small" label={roleText(me)} />}
      </Stack>

      <Typography variant="body2" color="text.secondary" gutterBottom>
        {isFetching ? (
          <Skeleton width={260} />
        ) : (
          <>Signed in as <b>{who(me)}</b> — role: <b>{roleText(me)}</b></>
        )}
      </Typography>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        {canOrders && (
          <Grid item xs={12} md={6} lg={3}>
            <Card><CardContent>
              <Typography variant="h6">Orders</Typography>
              <Typography variant="body2">View, filter, export orders.</Typography>
              <Button aria-label="Open Orders" component={Link} to="/admin/orders" sx={{ mt: 1 }} variant="contained">Open</Button>
            </CardContent></Card>
          </Grid>
        )}

        {canProducts && (
          <Grid item xs={12} md={6} lg={3}>
            <Card><CardContent>
              <Typography variant="h6">Products</Typography>
              <Typography variant="body2">Add, edit, delete products.</Typography>
              <Button aria-label="Manage Products" component={Link} to="/admin/products" sx={{ mt: 1 }} variant="contained">Manage</Button>
            </CardContent></Card>
          </Grid>
        )}

        {canAnalytics && (
          <Grid item xs={12} md={6} lg={3}>
            <Card><CardContent>
              <Typography variant="h6">Analytics</Typography>
              <Typography variant="body2">Sales &amp; views graphs.</Typography>
              <Button aria-label="Open Analytics" component={Link} to="/admin/analytics" sx={{ mt: 1 }} variant="contained">Open</Button>
            </CardContent></Card>
          </Grid>
        )}

        {canPosts && (
          <Grid item xs={12} md={6} lg={3}>
            <Card><CardContent>
              <Typography variant="h6">Posts</Typography>
              <Typography variant="body2">Create &amp; share posts.</Typography>
              <Button aria-label="Open Posts" component={Link} to="/admin/posts" sx={{ mt: 1 }} variant="contained">Open</Button>
            </CardContent></Card>
          </Grid>
        )}

        {canUsers && (
          <>
            <Grid item xs={12} md={6} lg={3}>
              <Card><CardContent>
                <Typography variant="h6">Users (ACL)</Typography>
                <Typography variant="body2">Set roles &amp; access.</Typography>
                <Button aria-label="Open Users" component={Link} to="/admin/users" sx={{ mt: 1 }} variant="contained">Open</Button>
              </CardContent></Card>
            </Grid>

            {/* Customers */}
            <Grid item xs={12} md={6} lg={3}>
              <Card><CardContent>
                <Typography variant="h6">Customers</Typography>
                <Typography variant="body2">Buyers list + activity.</Typography>
                <Button aria-label="Open Customers" component={Link} to="/admin/customers" sx={{ mt: 1 }} variant="contained">Open</Button>
              </CardContent></Card>
            </Grid>

            {/* Staff */}
            <Grid item xs={12} md={6} lg={3}>
              <Card><CardContent>
                <Typography variant="h6">Staff</Typography>
                <Typography variant="body2">Admins, managers &amp; permissioned users.</Typography>
                <Button aria-label="Open Staff" component={Link} to="/admin/staff" sx={{ mt: 1 }} variant="contained">Open</Button>
              </CardContent></Card>
            </Grid>
          </>
        )}

        {canSupport && (
          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <CardContent>
                <Typography variant="h6">Support</Typography>
                <Typography variant="body2">View questions &amp; reply by email.</Typography>
                <Button
                  aria-label="Open Support"
                  component={Link}
                  to="/admin/support"
                  sx={{ mt: 1 }}
                  variant="contained"
                  startIcon={<SupportAgentIcon />}
                >
                  Open
                </Button>
              </CardContent>
            </Card>
          </Grid>
        )}

        {canFaqs && (
          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <CardContent>
                <Typography variant="h6">FAQs</Typography>
                <Typography variant="body2">Create, edit &amp; publish FAQs.</Typography>
                <Button
                  aria-label="Manage FAQs"
                  component={Link}
                  to="/admin/faqs"
                  sx={{ mt: 1 }}
                  variant="contained"
                  startIcon={<HelpCenterIcon />}
                >
                  Manage
                </Button>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </div>
  );
}
