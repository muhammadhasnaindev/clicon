// src/pages/account/AdminUsers.jsx
/**
 * AdminUsers — Manage users, roles/permissions, and About page info.

 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  useAdminGetUsersQuery,
  useAdminCreateUserMutation,
  useAdminSetUserRoleMutation,
  useAdminGetPermissionsQuery,
  useAdminSetUserPermissionsMutation,
  useAdminDeleteUserMutation,
  useAdminSetUserAboutMutation, //  use admin About mutation
  useMeQuery,
} from "../../store/api/apiSlice";
// (Removed: useSetUserAboutMutation from aboutApi)

import {
  Typography, Card, CardContent, Table, TableHead, TableRow, TableCell, TableBody,
  TableContainer, Box, Select, MenuItem, Chip, Stack, IconButton, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete, TextField, Tooltip,
  Alert, FormControlLabel, Switch, Grid, InputAdornment, Avatar, Divider
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import PhotoCamera from "@mui/icons-material/PhotoCamera";

const PROTECTED_ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || "admin@example.com").toLowerCase();
const BORDER = "#E5E7EB";
/* Avoid magic values */
const PAGE_MSG_HIDE_MS = 2500;

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

const getIdLoose = (obj) =>
  obj?._id || obj?.id || obj?.data?._id || obj?.data?.id || obj?.user?._id || obj?.user?.id || "";

/* Small helper to safely revoke object URLs */
const safeRevoke = (url) => { try { url && URL.revokeObjectURL(url); } catch {} };

export default function AdminUsers() {
  const { data, refetch, error: listErr, isFetching } = useAdminGetUsersQuery();
  const rows = data?.data || [];

  const { data: permsData } = useAdminGetPermissionsQuery();
  const staticOptions = permsData?.data?.static || [];
  const categories = permsData?.data?.categories || [];

  const [createUser, { isLoading: creating, error: createErr }] = useAdminCreateUserMutation();
  const [setRole] = useAdminSetUserRoleMutation();
  const [setPerms] = useAdminSetUserPermissionsMutation();
  const [deleteUser, { isLoading: deleting }] = useAdminDeleteUserMutation();
  const [setUserAbout, { isLoading: savingAbout }] = useAdminSetUserAboutMutation(); // 

  const { data: meRaw } = useMeQuery();
  const me = meRaw?.data ?? meRaw ?? {};
  const myId = me?._id || me?.id || "";
  const myEmail = (me?.email || "").toLowerCase();

  // dialogs
  const [dlgOpen, setDlgOpen] = useState(false);
  const [targetUser, setTargetUser] = useState(null);
  const [staticSel, setStaticSel] = useState([]);
  const [catSel, setCatSel] = useState([]);

  // create form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRoleSel] = useState("user");
  const [verifyNow, setVerifyNow] = useState(true);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [createError, setCreateError] = useState("");
  // About-on-create
  const [newShowOnAbout, setNewShowOnAbout] = useState(false);
  const [newTeamTitle, setNewTeamTitle] = useState("");
  const [newTeamOrder, setNewTeamOrder] = useState(0);
  const [newAvatarFile, setNewAvatarFile] = useState(null);
  const newAvatarPreview = useMemo(
    () => (newAvatarFile ? URL.createObjectURL(newAvatarFile) : ""),
    [newAvatarFile]
  );

  // alerts
  const [pageErr, setPageErr] = useState("");
  const [pageMsg, setPageMsg] = useState("");
  const msgTimerRef = useRef(null);

  // delete confirm
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  // per-row edits (synced from server every time rows change)
  const [rowEdits, setRowEdits] = useState({});

  useEffect(() => {
    setRowEdits((prev) => {
      const next = { ...prev };
      rows.forEach((u) => {
        //  always refresh from server so changes reflect immediately after refetch
        next[u._id] = {
          showOnAbout: !!u?.team?.showOnAbout,
          title: u?.team?.title || "",
          order: Number(u?.team?.order ?? 0),
          avatarFile: null,
          avatarPreview: "",
        };
      });
      // remove edits for users no longer in list
      Object.keys(next).forEach((id) => {
        if (!rows.find((r) => String(r._id) === String(id))) {
          // ==== NEW LOGIC: revoke any leftover previews when pruning ====
          /* PRO: Prevents leaked object URLs if a user disappears from the list.
             Edge: ignore failures in case preview wasn't an object URL. */
          safeRevoke(prev?.[id]?.avatarPreview);
          delete next[id];
        }
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const setEdit = (id, patch) =>
    setRowEdits((s) => ({ ...s, [id]: { ...(s[id] || {}), ...patch } }));

  const isMe = (u) =>
    (u?._id && String(u._id) === String(myId)) ||
    ((u?.email || "").toLowerCase() === myEmail);

  const openDialog = (u) => {
    setTargetUser(u);
    const current = Array.isArray(u.permissions) ? u.permissions : [];
    setStaticSel(current.filter((p) => !p.startsWith("products:write:category:")));
    setCatSel(
      current
        .filter((p) => p.startsWith("products:write:category:"))
        .map((p) => p.split(":").slice(-1)[0])
        .filter(Boolean)
    );
    setDlgOpen(true);
  };
  const closeDialog = () => setDlgOpen(false);

  const onSavePerms = async () => {
    if (!targetUser) return;
    setPageErr(""); setPageMsg("");
    try {
      const catTokens = catSel.map((c) => `products:write:category:${c}`);
      const payload = [...new Set([...staticSel, ...catTokens])];
      await setPerms({ id: targetUser._id, permissions: payload }).unwrap();
      setPageMsg("Permissions updated.");
      setDlgOpen(false);
      refetch();
    } catch (e) {
      setPageErr(e?.data?.message || e?.error || e?.message || "Failed to update permissions");
    }
  };

  const onChangeRole = async (id, role) => {
    setPageErr(""); setPageMsg("");
    try {
      await setRole({ id, role, applyDefaults: false }).unwrap();
      setPageMsg("Role updated.");
      refetch();
    } catch (e) {
      setPageErr(e?.data?.message || e?.error || e?.message || "Failed to update role");
    }
  };

  const removeOnePerm = async (u, perm) => {
    setPageErr(""); setPageMsg("");
    try {
      const next = (u.permissions || []).filter((p) => p !== perm);
      await setPerms({ id: u._id, permissions: next }).unwrap();
      setPageMsg("Permission removed.");
      refetch();
    } catch (e) {
      setPageErr(e?.data?.message || e?.error || e?.message || "Failed to remove permission");
    }
  };

  const validateCreate = () => {
    if (!email.trim()) return "Email is required";
    // ==== NEW LOGIC: light email sanity check ====
    /* PRO: Catches obvious typos without being overly strict.
       Edge: still allows unusual but valid emails. */
    if (!/.+@.+\..+/.test(email.trim())) return "Please enter a valid email";
    if (!pwd || pwd.length < 8) return "Password must be at least 8 characters";
    if (pwd !== pwd2) return "Passwords do not match";
    return "";
  };

  const onCreateUser = async () => {
    setCreateError(""); setPageErr(""); setPageMsg("");
    const v = validateCreate();
    if (v) { setCreateError(v); return; }
    try {
      // 1) create user
      const created = await createUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: pwd,
        role,
        emailVerified: verifyNow,
        applyRoleDefaults: true,
      }).unwrap();

      // 2) discover new id
      let newId = getIdLoose(created);
      if (!newId) {
        const freshRes = await refetch();
        const list = freshRes?.data?.data || freshRes?.data || [];
        const found = list.find((u) => (u.email || "").toLowerCase() === email.trim().toLowerCase());
        newId = getIdLoose(found);
      }

      // 3) save About + avatar immediately (so About page shows right away)
      if (newId && (newAvatarFile || newShowOnAbout || newTeamTitle || Number(newTeamOrder) !== 0)) {
        const payload = {
          id: newId,
          showOnAbout: !!newShowOnAbout,
          title: newTeamTitle || "",
          order: Number(newTeamOrder) || 0,
        };
        if (newAvatarFile) payload.avatarImage = await fileToDataUrl(newAvatarFile);
        await setUserAbout(payload).unwrap(); // invalidates About + Users (tags defined in apiSlice)
      }

      // 4) reset + refresh
      setName(""); setEmail(""); setRoleSel("user"); setVerifyNow(true);
      setPwd(""); setPwd2(""); setNewShowOnAbout(false); setNewTeamTitle("");
      setNewTeamOrder(0); setNewAvatarFile(null);
      setPageMsg("User created.");
      refetch();
    } catch (e) {
      const msg = e?.data?.message || e?.error || e?.message || "Failed to create user";
      setCreateError(msg);
    }
  };

  const canDelete = (u) => {
    if (!u) return false;
    if (isMe(u)) return false;
    if ((u.role || "").toLowerCase() === "admin") return false;
    if ((u.email || "").toLowerCase() === PROTECTED_ADMIN_EMAIL) return false;
    return true;
  };

  const askDelete = (u) => { setPageErr(""); setPageMsg(""); setConfirmTarget(u); setConfirmOpen(true); };
  const closeDelete = () => { if (!confirmBusy) { setConfirmOpen(false); setConfirmTarget(null); } };

  const doDelete = async () => {
    if (!confirmTarget) return;
    setConfirmBusy(true); setPageErr(""); setPageMsg("");
    try {
      await deleteUser(confirmTarget._id).unwrap();
      setPageMsg("User deleted.");
      setConfirmBusy(false);
      setConfirmOpen(false);
      setConfirmTarget(null);
      refetch();
    } catch (e) {
      setConfirmBusy(false);
      setPageErr(e?.data?.message || e?.error || e?.message || "Delete failed");
    }
  };

  const busy = isFetching || creating || deleting || confirmBusy || savingAbout;

  // ---------- scroll container: allow both-axis scroll + drag-to-scroll ----------
  const tableRef = useRef(null);
  const drag = useRef({ active: false, x: 0, y: 0, sx: 0, sy: 0 });
  const onMouseDown = (e) => {
    const el = tableRef.current;
    if (!el) return;
    drag.current = { active: true, x: e.clientX, y: e.clientY, sx: el.scrollLeft, sy: el.scrollTop };
    el.style.cursor = "grabbing";
    e.preventDefault();
  };
  const onMouseMove = (e) => {
    if (!drag.current.active) return;
    const el = tableRef.current;
    if (!el) return;
    el.scrollLeft = drag.current.sx - (e.clientX - drag.current.x);
    el.scrollTop  = drag.current.sy - (e.clientY - drag.current.y);
  };
  const endDrag = () => {
    drag.current.active = false;
    if (tableRef.current) tableRef.current.style.cursor = "grab";
  };

  /* ==== NEW LOGIC: auto-hide success messages ====
     PRO: Keeps the page feedback fresh; avoids stale banners lingering.
     Edge: resets the timer per-new message and clears on unmount. */
  useEffect(() => {
    if (!pageMsg) return;
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    msgTimerRef.current = setTimeout(() => { setPageMsg(""); msgTimerRef.current = null; }, PAGE_MSG_HIDE_MS);
    return () => { if (msgTimerRef.current) { clearTimeout(msgTimerRef.current); msgTimerRef.current = null; } };
  }, [pageMsg]);

  /* ==== NEW LOGIC: revoke new-avatar preview on change/unmount ====
     PRO: Prevent object URL leaks when swapping avatar in the create form. */
  useEffect(() => {
    return () => safeRevoke(newAvatarPreview);
  }, [newAvatarPreview]);

  const saveRowAbout = async (u) => {
    const ed = rowEdits[u._id] || {};
    setPageErr(""); setPageMsg("");
    try {
      const body = {
        showOnAbout: !!ed.showOnAbout,
        title: ed.title || "",
        order: Number(ed.order || 0),
      };
      if (ed.avatarFile) body.avatarImage = await fileToDataUrl(ed.avatarFile);
      await setUserAbout({ id: u._id, ...body }).unwrap();
      setPageMsg("About settings saved.");
      // revoke and clear local preview after successful save
      safeRevoke(ed.avatarPreview);
      setEdit(u._id, { avatarFile: null, avatarPreview: "" });
      refetch();
    } catch (e) {
      setPageErr(e?.data?.message || e?.error || e?.message || "Failed to save About settings");
    }
  };

  return (
    <div className="p-4">
      <Typography variant="h5" gutterBottom>Users & Access</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Create users, manage roles/permissions, and control how members appear on the About page.
      </Typography>

      {(pageErr || listErr || createErr) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {pageErr || listErr?.data?.message || createErr?.data?.message || "Operation failed"}
        </Alert>
      )}
      {pageMsg && <Alert severity="success" sx={{ mb: 2 }}>{pageMsg}</Alert>}

      {/* Create user */}
      <Card sx={{ mb: 3, borderRadius: 2, boxShadow: "0 8px 24px rgba(0,0,0,.06)" }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>Create User</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField fullWidth label="Name" value={name} onChange={(e)=>setName(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={3}>
              {/* ==== NEW LOGIC: email input type ====
                 PRO: native keyboard/validation hints on mobile, small ergonomic win. */}
              <TextField fullWidth type="email" label="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth label="Password (8+)" type={showPwd ? "text" : "password"}
                value={pwd} onChange={(e)=>setPwd(e.target.value)}
                InputProps={{ endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={()=>setShowPwd(s=>!s)} size="small">
                      {showPwd ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )}}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth label="Confirm Password" type={showPwd ? "text" : "password"} value={pwd2} onChange={(e)=>setPwd2(e.target.value)} />
            </Grid>

            <Grid item xs={12} md={3}>
              <Select fullWidth value={role} onChange={(e)=>setRoleSel(e.target.value)}>
                <MenuItem value="user">user</MenuItem>
                <MenuItem value="manager">manager</MenuItem>
                <MenuItem value="admin">admin</MenuItem>
              </Select>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControlLabel control={<Switch checked={verifyNow} onChange={(e)=>setVerifyNow(e.target.checked)} />} label="Mark verified" />
            </Grid>

            <Grid item xs={12}><Divider textAlign="left">About page (optional)</Divider></Grid>

            <Grid item xs={12} md={3}>
              <FormControlLabel control={<Switch checked={newShowOnAbout} onChange={(e)=>setNewShowOnAbout(e.target.checked)} />} label="Show on About" />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth label="Team title (shown on About)" value={newTeamTitle} onChange={(e)=>setNewTeamTitle(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth label="Order" type="number"
                value={newTeamOrder}
                onChange={(e)=>setNewTeamOrder(e.target.value === "" ? 0 : Number(e.target.value))}
                InputProps={{ inputProps: { min: 0, step: 1 } }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Avatar src={newAvatarPreview || ""} alt="avatar" sx={{ width: 44, height: 44, border: `1px solid ${BORDER}` }} />
                <Button variant="outlined" size="small" component="label" startIcon={<PhotoCamera />}>
                  Upload avatar
                  <input hidden type="file" accept="image/png,image/jpeg" onChange={(e)=>setNewAvatarFile(e.target.files?.[0] || null)} />
                </Button>
              </Stack>
            </Grid>

            <Grid item xs={12}>
              {createError && <Alert severity="error" sx={{ mb: 1 }}>{createError}</Alert>}
              <Button variant="contained" onClick={onCreateUser} disabled={busy}>
                {creating ? "Creating…" : "Create"}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Users table */}
      <Card sx={{ borderRadius: 2, boxShadow: "0 8px 24px rgba(0,0,0,.06)" }}>
        <CardContent>
          <TableContainer
            ref={tableRef}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseLeave={endDrag}
            onMouseUp={endDrag}
            sx={{
              width: "100%",
              overflow: "auto",
              WebkitOverflowScrolling: "touch",
              cursor: "grab",
              maxHeight: { xs: 420, md: 560 },
              scrollbarGutter: "stable",
            }}
          >
            <Table size="small" stickyHeader sx={{ minWidth: 1200 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Avatar</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Permissions</TableCell>
                  <TableCell>About (show / title / order)</TableCell>
                  <TableCell width={120} align="center">Delete</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((u) => {
                  const ed = rowEdits[u._id] || {};
                  const deletable = canDelete(u);

                  return (
                    <TableRow key={u._id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Avatar src={ed.avatarPreview || u.avatarUrl || ""} alt={u.name || u.email} sx={{ width: 40, height: 40, border: `1px solid ${BORDER}` }} />
                          <Button size="small" variant="outlined" component="label" startIcon={<PhotoCamera />}>
                            Change
                            <input
                              hidden
                              type="file"
                              accept="image/png,image/jpeg"
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                // ==== NEW LOGIC: revoke old preview before setting a new one ====
                                /* PRO: Prevents memory leaks during repeated avatar changes. */
                                safeRevoke(ed.avatarPreview);
                                setEdit(u._id, { avatarFile: file, avatarPreview: file ? URL.createObjectURL(file) : "" });
                              }}
                            />
                          </Button>
                        </Stack>
                      </TableCell>

                      <TableCell>{u.name || u.fullName || u.displayName || "-"}</TableCell>
                      <TableCell>{u.email}</TableCell>

                      <TableCell>
                        <Select
                          size="small"
                          value={u.role || "user"}
                          onChange={(e) => onChangeRole(u._id, e.target.value)}
                          disabled={isMe(u) || (u.role || "").toLowerCase() === "admin"}
                        >
                          <MenuItem value="user">user</MenuItem>
                          <MenuItem value="manager">manager</MenuItem>
                          <MenuItem value="admin">admin</MenuItem>
                        </Select>
                      </TableCell>

                      <TableCell>
                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
                          {(u.permissions || []).length === 0 && <Typography variant="body2" color="text.secondary">(none)</Typography>}
                          {(u.permissions || []).map((p) => (
                            <Chip key={p} label={p} size="small" onDelete={() => removeOnePerm(u, p)} deleteIcon={<CloseIcon />} />
                          ))}
                          <Tooltip title="Edit permissions">
                            <span><IconButton onClick={() => openDialog(u)} size="small"><EditIcon /></IconButton></span>
                          </Tooltip>
                        </Stack>
                      </TableCell>

                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 360 }}>
                          <FormControlLabel control={<Switch checked={!!ed.showOnAbout} onChange={(e)=>setEdit(u._id, { showOnAbout: e.target.checked })} />} label="Show" />
                          <TextField
                            size="small"
                            label="Title"
                            value={ed.title ?? ""}
                            onChange={(e)=>setEdit(u._id, { title: e.target.value })}
                            sx={{ minWidth: 180 }}
                          />
                          <TextField
                            size="small"
                            type="number"
                            label="Order"
                            value={ed.order ?? 0}
                            onChange={(e)=>setEdit(u._id, { order: e.target.value === "" ? 0 : Number(e.target.value) })}
                            sx={{ width: 100 }}
                            InputProps={{ inputProps: { min: 0, step: 1 } }}
                          />
                          <Button variant="contained" size="small" onClick={() => saveRowAbout(u)} disabled={busy}>Save</Button>
                        </Stack>
                      </TableCell>

                      <TableCell align="center">
                        <Tooltip title={deletable ? "Delete user" : "Cannot delete (protected/self/admin)"}>
                          <span>
                            <IconButton size="small" color="error" onClick={() => askDelete(u)} disabled={!deletable || deleting}>
                              <DeleteForeverIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>No users.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Permission Editor */}
      <Dialog open={dlgOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Permissions {targetUser ? `— ${targetUser.email}` : ""}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ my: 1 }}>
            <Typography variant="subtitle2" gutterBottom>Static permissions</Typography>
            <Autocomplete multiple options={staticOptions} value={staticSel} onChange={(_e, val) => setStaticSel(val)}
              renderInput={(params) => <TextField {...params} label="Select static permissions" size="small" />} />
          </Box>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Category-scoped product writes</Typography>
            <Autocomplete multiple options={categories} value={catSel} onChange={(_e, val) => setCatSel(val)}
              renderInput={(params) => <TextField {...params} label="Categories" size="small" />} />
            <Typography variant="caption" color="text.secondary">
              Grants tokens like <code>products:write:category:&lt;Category&gt;</code>
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button variant="contained" onClick={onSavePerms}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={confirmOpen} onClose={closeDelete} maxWidth="xs" fullWidth>
        <DialogTitle>Delete user</DialogTitle>
        <DialogContent dividers>
          <Typography>Are you sure you want to permanently delete <b>{confirmTarget?.email}</b>?</Typography>
          <Typography variant="caption" color="text.secondary">This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDelete} disabled={confirmBusy}>Cancel</Button>
          <Button color="error" variant="contained" onClick={doDelete} disabled={confirmBusy}>
            {confirmBusy ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
