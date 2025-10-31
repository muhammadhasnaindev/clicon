// src/pages/account/CardsAddress.jsx
/**
 * CardsAddress — payment methods + billing/shipping summary.
 
 */

import React, { useMemo, useState } from "react";
import {
  Box, Grid, Paper, Typography, Button, Stack, Chip, IconButton, Menu, MenuItem, Divider, Tooltip, Alert,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

import {
  useMeQuery,
  useGetPaymentMethodsQuery,
  useAddPaymentMethodMutation,
  useUpdatePaymentMethodMutation,
  useDeletePaymentMethodMutation,
  useSetDefaultPaymentMethodMutation,
} from "../../store/api/apiSlice";

import AddCardDialog from "../../components/account/AddCardDialog";
import EditCardDialog from "../../components/account/EditCardDialog";

const BORDER = "#E5E7EB";
const BLUE = "#1B6392";
const GREEN = "#059669";
const MUTED = "#5F6C72";

const getId = (pm) => pm?.id || pm?._id || pm?.paymentMethodId || "";

/** Reusable shell */
const CardShell = ({ title, action, children, sx }) => (
  <Paper elevation={0} sx={{ p: 2, border: `1px solid ${BORDER}`, borderRadius: 1.5, ...sx }}>
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
      <Typography sx={{ fontWeight: 800 }}>{title}</Typography>
      {action || null}
    </Stack>
    {children}
  </Paper>
);

const BrandBadge = ({ brand }) => {
  const b = String(brand || "").toLowerCase();
  if (b.includes("visa")) {
    return (
      <Box sx={{ px: 1, py: 0.25, fontWeight: 800, fontSize: 11, borderRadius: 0.75, bgcolor: "#1434CB", color: "#fff", lineHeight: 1 }}>
        VISA
      </Box>
    );
  }
  if (b.includes("master")) {
    return (
      <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
        <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#EA001B" }} />
        <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#FF5F00", ml: -0.8 }} />
        <Typography sx={{ fontSize: 11, fontWeight: 800, color: "#111827", ml: 0.25 }}>Mastercard</Typography>
      </Box>
    );
  }
  return (
    <Box sx={{ px: 1, py: 0.25, fontWeight: 800, fontSize: 11, borderRadius: 0.75, bgcolor: "#334155", color: "#fff", lineHeight: 1 }}>
      CARD
    </Box>
  );
};

const MoneyCard = ({ pm, isDefault, onEdit, onDelete, onMakeDefault, color = BLUE }) => {
  const [anchor, setAnchor] = useState(null);
  const openMenu = (e) => setAnchor(e.currentTarget);
  const closeMenu = () => setAnchor(null);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        border: `1px solid ${BORDER}`,
        borderRadius: 1.5,
        bgcolor: color,
        color: "#fff",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Stack direction="row" alignItems="center" spacing={1}>
          <BrandBadge brand={pm.brand} />
          {isDefault ? (
            <Chip
              size="small"
              icon={<CheckCircleIcon sx={{ color: "#16a34a !important" }} />}
              label="Default"
              sx={{ bgcolor: "rgba(255,255,255,.18)", color: "#fff" }}
            />
          ) : null}
        </Stack>
        <IconButton size="small" onClick={openMenu} sx={{ color: "#fff" }}>
          <MoreVertIcon />
        </IconButton>
        <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={closeMenu}>
          <MenuItem onClick={() => { closeMenu(); onEdit?.(pm); }}>
            <EditIcon fontSize="small" style={{ marginRight: 8 }} /> Edit Card
          </MenuItem>
          {!isDefault && (
            <MenuItem onClick={() => { closeMenu(); onMakeDefault?.(pm); }}>
              <CheckCircleIcon fontSize="small" style={{ marginRight: 8 }} /> Make Default
            </MenuItem>
          )}
          <MenuItem onClick={() => { closeMenu(); onDelete?.(pm); }} sx={{ color: "error.main" }}>
            <DeleteOutlineIcon fontSize="small" style={{ marginRight: 8 }} /> Delete
          </MenuItem>
        </Menu>
      </Stack>

      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 2 }}>
        <CreditCardIcon />
        <Typography sx={{ fontWeight: 800, letterSpacing: 1 }}>
          **** **** **** {pm.last4 || "0000"}
        </Typography>
      </Stack>
      <Typography sx={{ mt: 0.5, opacity: 0.92 }}>{pm.name || "—"}</Typography>
      {(pm.expMonth || pm.expYear) && (
        <Typography sx={{ mt: 0.5, opacity: 0.8, fontSize: 12 }}>
          Exp: {pm.expMonth?.toString().padStart(2, "0")}/{pm.expYear}
        </Typography>
      )}
    </Paper>
  );
};

export default function CardsAddress() {
  const { data: me } = useMeQuery();
  const billing = me?.billingAddress || me?.billing || {};
  const shipping = me?.shippingAddress || me?.shipping || {};
  const defaultPmId = me?.defaultPaymentMethodId || me?.defaultPaymentMethod?._id || me?.defaultPaymentMethod;

  const { data: pmData, isFetching, refetch } = useGetPaymentMethodsQuery();
  const cards = pmData?.data || [];

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editValue, setEditValue] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [deleteCard] = useDeletePaymentMethodMutation();
  const [setDefaultPm] = useSetDefaultPaymentMethodMutation();
  const [updatePm] = useUpdatePaymentMethodMutation();
  const [addPm] = useAddPaymentMethodMutation();

  const onAddClose = async (changed) => {
    setMsg(""); setErr("");
    setAddOpen(false);
    if (changed) {
      await refetch();
      setMsg("Card added.");
    }
  };

  const onEditClose = async (changed) => {
    setMsg(""); setErr("");
    setEditOpen(false);
    setEditValue(null);
    if (changed) {
      await refetch();
      setMsg("Card updated.");
    }
  };

  const handleEdit = (pm) => {
    setEditValue(pm);
    setEditOpen(true);
  };

  const handleDelete = async (pm) => {
    setErr(""); setMsg("");
    const id = getId(pm);
    if (!id) return setErr("Missing card id.");
    // ===== NEW LOGIC: Prevent deleting the default card =====
    if (String(id) === String(defaultPmId)) {
      setErr("This is your default card. Set another card as default before deleting.");
      return;
    }
    if (!window.confirm("Delete this card?")) return;
    try {
      await deleteCard(id).unwrap();
      await refetch();
      setMsg("Card deleted.");
    } catch (e) {
      setErr(e?.data?.message || e?.error || "Failed to delete card.");
    }
  };

  const handleMakeDefault = async (pm) => {
    setErr(""); setMsg("");
    const id = getId(pm);
    if (!id) return setErr("Missing card id.");
    try {
      await setDefaultPm({ id }).unwrap();
      await refetch();
      setMsg("Default payment method updated.");
    } catch (e) {
      setErr(e?.data?.message || e?.error || "Failed to set default card.");
    }
  };

  return (
    <Box>
      <Grid container spacing={2}>
        {/* Payment option */}
        <Grid item xs={12}>
          <CardShell
            title="Payment Option"
            action={
              <Button size="small" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
                Add Card
              </Button>
            }
          >
            {msg && <Alert severity="success" sx={{ mb: 1 }}>{msg}</Alert>}
            {err && <Alert severity="error" sx={{ mb: 1 }}>{err}</Alert>}
            <Grid container spacing={2}>
              {cards.map((pm, i) => {
                const id = getId(pm);
                const isDefault = String(id) === String(defaultPmId);
                return (
                  <Grid key={id || i} item xs={12} md={6}>
                    <MoneyCard
                      pm={pm}
                      isDefault={isDefault}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onMakeDefault={handleMakeDefault}
                      color={i % 2 === 0 ? BLUE : GREEN}
                    />
                  </Grid>
                );
              })}
              {!cards?.length && (
                <Grid item xs={12}>
                  <Typography sx={{ color: MUTED, fontSize: 13 }}>
                    No payment methods yet. Add a card to speed up checkout.
                  </Typography>
                </Grid>
              )}
            </Grid>
          </CardShell>
        </Grid>

        {/* Billing & Shipping */}
        <Grid item xs={12} md={6}>
          <CardShell
            title="Billing Address"
            action={
              <Tooltip title="Edit in Settings">
                <Button size="small" href="/account/dashboard/settings">Edit Address</Button>
              </Tooltip>
            }
          >
            <Typography sx={{ color: "#374151", fontSize: 14 }}>
              {billing?.line1 || billing?.address || "-"}
              {billing?.city ? `, ${billing.city}` : ""}
              {billing?.country ? `, ${billing.country}` : ""}
            </Typography>
            <Typography sx={{ color: MUTED, fontSize: 13, mt: 0.5 }}>
              Phone: {billing?.phone || me?.phone || "-"} • Email: {billing?.email || me?.email || "-"}
            </Typography>
          </CardShell>
        </Grid>

        <Grid item xs={12} md={6}>
          <CardShell
            title="Shipping Address"
            action={
              <Tooltip title="Edit in Settings">
                <Button size="small" href="/account/dashboard/settings">Edit Address</Button>
              </Tooltip>
            }
          >
            <Typography sx={{ color: "#374151", fontSize: 14 }}>
              {shipping?.line1 || shipping?.address || "-"}
              {shipping?.city ? `, ${shipping.city}` : ""}
              {shipping?.country ? `, ${shipping.country}` : ""}
            </Typography>
            <Typography sx={{ color: MUTED, fontSize: 13, mt: 0.5 }}>
              Phone: {shipping?.phone || me?.phone || "-"} • Email: {shipping?.email || me?.email || "-"}
            </Typography>
          </CardShell>
        </Grid>
      </Grid>

      {/* dialogs */}
      <AddCardDialog open={addOpen} onClose={onAddClose} />
      <EditCardDialog open={editOpen} value={editValue} onClose={onEditClose} />
    </Box>
  );
}
