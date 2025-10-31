// src/pages/account/AdminPosts.jsx
/**
 * AdminPosts – Manage blog/news posts with GrapesJS editor, media, tags, and audit history.
 
 */

import React, { useMemo, useRef, useEffect, useState } from "react";
import {
  useAdminGetPostsQuery,
  useAdminCreatePostMutation,
  useAdminUpdatePostMutation,
  useAdminDeletePostMutation,
  useAdminGetAuditLogsQuery,
  useMeQuery,
} from "../../store/api/apiSlice";
import {
  Typography, Card, CardContent, Grid, TextField, Button, Switch, FormControlLabel,
  Table, TableHead, TableRow, TableCell, TableBody, Chip, Stack, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, Box, Autocomplete
} from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { hasAnyPermission, hasRole } from "../../utils/acl";

import grapesjs from "grapesjs";
import gjsPresetWebpage from "grapesjs-preset-webpage";
import gjsBlocksBasic from "grapesjs-blocks-basic";

/* ---------- Theme / UI tokens ---------- */
const ORANGE = "#FA8232";
const BORDER = "#E5E7EB";

/* ---------- UX constants (avoid magic numbers) ---------- */
const ALERT_HIDE_MS = 2400;
const EDITOR_HEIGHT = "68vh";
const COVER_HEIGHT = 140;

/* ---------- Popular tag suggestions ---------- */
const POPULAR_TAGS = [
  "Game","iPhone","TV","Asus Laptops","Macbook","SSD","Graphics Card",
  "Power Bank","Smart TV","Speaker","Tablet","Microwave","Samsung"
];

/**
 * AdminPosts page component.
 *
 * @returns {JSX.Element} Admin posts management UI with editor, media, and audit history.
 */
export default function AdminPosts() {
  const { data: meData } = useMeQuery();
  const me = meData?.data ?? meData ?? {};
  const isAdminOrManager = hasRole(me, ["admin", "manager"]);
  const canWrite = isAdminOrManager || hasAnyPermission(me, ["posts:*", "posts:write", "posts:write:own"]);

  const { data, refetch } = useAdminGetPostsQuery();
  const posts = data?.data || [];

  const [createPost, { isLoading: creating }] = useAdminCreatePostMutation();
  const [updatePost, { isLoading: updating }] = useAdminUpdatePostMutation();
  const [deletePost] = useAdminDeletePostMutation();

  const [filterMine, setFilterMine] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState("");
  const [published, setPublished] = useState(true);

  // NEW: category + tags + cover + gallery(media)
  const categoryOptions = useMemo(() => {
    const set = new Set();
    posts.forEach(p => p.category && set.add(p.category));
    return Array.from(set);
  }, [posts]);

  const [category, setCategory] = useState("");
  const [tags, setTags] = useState([]);
  const [cover, setCover] = useState(null); // {url} | {data}
  const [media, setMedia] = useState([]);   // [{type:"image"|"video", url? data?}]

  const [alert, setAlert] = useState({ type: "", msg: "" });
  const alertTimerRef = useRef(null); // <-- NEW: single auto-hide timer

  const editorRef = useRef(null);
  const editorElRef = useRef(null);

  // ===== Audit dialog =====
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditPostId, setAuditPostId] = useState(null);

  /* ==== NEW LOGIC: Stabilize audit logs query args (use skip option) ====
     PRO: RTK Query's hook shouldn't receive arbitrary shapes like {skip:true} as "args".
     We pass stable args and rely on the `skip` option to prevent execution until needed.
     This avoids unexpected serialization/memo issues and keeps the cache predictable. */
  const { data: auditData } = useAdminGetAuditLogsQuery(
    { entity: "post", entityId: auditPostId },
    { skip: !auditOpen || !auditPostId }
  );
  const logs = auditData?.data || [];

  /* ==== NEW LOGIC: Single alert auto-hide timer ====
     PRO: Prevents multiple overlapping setTimeouts that can wipe a newer alert prematurely.
     We clear any existing timer before scheduling another and also clear on unmount. */
  const showAlert = (type, msg) => {
    if (alertTimerRef.current) {
      clearTimeout(alertTimerRef.current);
      alertTimerRef.current = null;
    }
    setAlert({ type, msg });
    alertTimerRef.current = setTimeout(() => {
      setAlert({ type: "", msg: "" });
      alertTimerRef.current = null;
    }, ALERT_HIDE_MS);
  };

  useEffect(() => {
    return () => {
      if (alertTimerRef.current) {
        clearTimeout(alertTimerRef.current);
      }
    };
  }, []);

  // ===== GrapesJS =====
  useEffect(() => {
    if (editorRef.current || !editorElRef.current) return;
    const ed = grapesjs.init({
      container: editorElRef.current,
      height: EDITOR_HEIGHT,
      storageManager: false,
      fromElement: false,
      plugins: [gjsPresetWebpage, gjsBlocksBasic],
      pluginsOpts: {
        [gjsPresetWebpage]: { useCustomTheme: true },
        [gjsBlocksBasic]: { flexGrid: true },
      },
    });
    ed.runCommand("open-blocks");
    if (!ed.getWrapper().components().length) {
      ed.addComponents(`
        <section class="section">
          <div class="container">
            <h1>New Post</h1>
            <p>Type here or drag blocks from the left.</p>
          </div>
        </section>
      `);
    }
    editorRef.current = ed;
    return () => {
      try { ed.destroy(); } catch {}
      editorRef.current = null;
    };
  }, []);

  const reset = () => {
    setEditingId(null);
    setTitle("");
    setPublished(true);
    setCategory("");
    setTags([]);
    setMedia([]);
    setCover(null);
    const ed = editorRef.current;
    if (ed) {
      ed.setComponents(`
        <section class="section">
          <div class="container">
            <h1>New Post</h1>
            <p>Type here or drag blocks from the left.</p>
          </div>
        </section>
      `);
      ed.setStyle("");
    }
  };

  // file helpers
  const readAsDataUrl = (file) => new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.readAsDataURL(file);
  });

  const handleCoverPick = async (file) => {
    if (!file) return;
    const data = await readAsDataUrl(file);
    setCover({ data }); // backend will persist and set coverUrl
  };

  const handleFiles = async (files, type) => {
    const arr = Array.from(files || []);
    const readers = await Promise.all(
      arr.map(async (f) => ({ type, data: await readAsDataUrl(f) }))
    );
    setMedia((m)=>[...m, ...readers]);
  };

  const removeMediaAt = (i) => setMedia((m) => m.filter((_, idx) => idx !== i));

  const grabEditorContent = () => {
    const ed = editorRef.current;
    if (!ed) return "";
    const html = ed.getHtml();
    const css = ed.getCss();
    return `${html}<style>${css}</style>`;
  };

  const onSubmit = async () => {
    if (!canWrite) return;
    try {
      const content = grabEditorContent();
      if (!title.trim()) { showAlert("error", "Title is required"); return; }

      const body = {
        title,
        content,
        published,
        media,
        cover,       // {data} or {url}
        category,    // string
        tags,        // array<string>
      };

      if (editingId) {
        await updatePost({ id: editingId, ...body }).unwrap();
        showAlert("success", "Post updated.");
      } else {
        await createPost(body).unwrap();
        showAlert("success", "Post created.");
      }
      reset();
      refetch();
    } catch (err) {
      const msg = err?.data?.message || err?.error || "Failed to save post";
      showAlert("error", msg);
      console.error(err);
    }
  };

  const onEdit = (p) => {
    setEditingId(p._id);
    setTitle(p.title || "");
    setPublished(!!p.published);
    setCategory(p.category || "");
    setTags(Array.isArray(p.tags) ? p.tags : []);
    setMedia((p.media || []).map(m => ({ type: m.type, url: m.url })));
    setCover(p.coverUrl ? { url: p.coverUrl } : null);
    const ed = editorRef.current;
    if (ed) {
      ed.setComponents(p.content || "");
      ed.setStyle("");
    }
  };

  /* ==== NEW LOGIC: Safer delete with error surface ====
     PRO: Users get clear feedback if deletion fails (permissions/network).
     We keep a simple confirm, then try/catch to show a user-safe alert on failure. */
  const onDelete = async (id) => {
    if (!window.confirm("Delete this post?")) return;
    try {
      await deletePost(id).unwrap();
      refetch();
    } catch (err) {
      const msg = err?.data?.message || err?.error || "Could not delete the post";
      showAlert("error", msg);
      console.error(err);
    }
  };

  const visiblePosts = useMemo(() => {
    if (!filterMine) return posts;
    return posts.filter((p) => String(p.authorId) === String(me?._id || me?.id));
  }, [filterMine, posts, me]);

  const openAudit = (postId) => { setAuditPostId(postId); setAuditOpen(true); };

  return (
    <div className="p-4">
      <Typography variant="h5" gutterBottom>Posts</Typography>
      {!canWrite && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You don’t have write permission. Become admin/manager or ask for <code>posts:write</code>/<code>posts:*</code>.
        </Alert>
      )}
      {alert.msg && <Alert severity={alert.type || "info"} sx={{ mb: 2 }}>{alert.msg}</Alert>}

      {/* ===== Editor / Form ===== */}
      <Card sx={{ mb: 3, overflow: "visible" }}>
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <Chip
              label="All"
              color={filterMine ? "default" : "primary"}
              variant={filterMine ? "outlined" : "filled"}
              onClick={() => setFilterMine(false)}
            />
            <Chip
              label="My posts"
              color={filterMine ? "primary" : "default"}
              variant={filterMine ? "filled" : "outlined"}
              onClick={() => setFilterMine(true)}
            />
            <span style={{ flex: 1 }} />
            <Button variant="contained" onClick={() => reset()} disabled={!canWrite}>
              New Post
            </Button>
          </Stack>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Title" value={title} onChange={(e)=>setTitle(e.target.value)} disabled={!canWrite} />
            </Grid>

            <Grid item xs={12} md={3}>
              {/* Category: freeSolo + options from existing posts */}
              <Autocomplete
                freeSolo
                options={categoryOptions}
                value={category}
                onInputChange={(_e, val)=>setCategory(val)}
                onChange={(_e, val)=>setCategory(val || "")}
                renderInput={(params)=>(<TextField {...params} label="Category" />)}
                disabled={!canWrite}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControlLabel
                control={<Switch checked={published} onChange={(e)=>setPublished(e.target.checked)} disabled={!canWrite} />}
                label="Published (show on site)"
              />
            </Grid>

            <Grid item xs={12} md={9}>
              {/* Tags: multi select with popular suggestions */}
              <Autocomplete
                multiple
                freeSolo
                options={POPULAR_TAGS}
                value={tags}
                onChange={(_e, val)=>setTags(val)}
                renderInput={(params)=>(<TextField {...params} label="Tags" placeholder="Add tags…" />)}
                disabled={!canWrite}
              />
              <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 1 }}>
                {POPULAR_TAGS.map(t => {
                  const active = tags.includes(t);
                  return (
                    <Chip
                      key={t}
                      label={t}
                      onClick={()=> setTags((prev)=> active ? prev.filter(x=>x!==t) : [...prev, t])}
                      sx={{
                        height: 28,
                        px: 1.25,
                        borderRadius: "8px",
                        border: active ? `1.5px solid ${ORANGE}` : `1.5px solid ${BORDER}`,
                        bgcolor: active ? "rgba(250,130,50,.08)" : "#fff",
                        color: active ? ORANGE : "#344054",
                        fontWeight: active ? 700 : 500,
                        "&:hover": { borderColor: ORANGE },
                      }}
                    />
                  );
                })}
              </Box>
            </Grid>

            {/* COVER */}
            <Grid item xs={12} md={3}>
              <Typography sx={{ fontWeight: 700, mb: .5 }}>Cover Image</Typography>
              <Box
                sx={{
                  border: `1px dashed ${BORDER}`, borderRadius: 2, p: 1,
                  display: "grid", placeItems: "center", minHeight: COVER_HEIGHT, bgcolor: "#fff"
                }}
              >
                {(cover?.url || cover?.data) ? (
                  <Box sx={{ position: "relative", width: "100%" }}>
                    <img
                      src={cover.url || cover.data}
                      alt=""
                      style={{ width: "100%", height: COVER_HEIGHT, objectFit: "cover", borderRadius: 8 }}
                    />
                    <IconButton
                      size="small"
                      onClick={()=>setCover(null)}
                      sx={{ position: "absolute", top: 6, right: 6, bgcolor: "#fff" }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ) : (
                  <Button component="label" variant="outlined" size="small" disabled={!canWrite}>
                    Pick Cover
                    <input type="file" accept="image/*" hidden onChange={(e)=>handleCoverPick(e.target.files?.[0])} />
                  </Button>
                )}
              </Box>
            </Grid>

            {/* EDITOR */}
            <Grid item xs={12}>
              <div
                ref={editorElRef}
                style={{ border: "1px solid #ddd", borderRadius: 6, minHeight: "60vh", background: "#fff" }}
              />
            </Grid>

            {/* GALLERY / MEDIA */}
            <Grid item xs={12} md={6}>
              <Button component="label" variant="outlined" disabled={!canWrite}>Add Images
                <input type="file" accept="image/*" multiple hidden onChange={(e)=>handleFiles(e.target.files,"image")} />
              </Button>
            </Grid>
            <Grid item xs={12} md={6}>
              <Button component="label" variant="outlined" disabled={!canWrite}>Add Videos
                <input type="file" accept="video/*" multiple hidden onChange={(e)=>handleFiles(e.target.files,"video")} />
              </Button>
            </Grid>

            <Grid item xs={12}>
              <Typography sx={{ fontWeight: 700, mb: .5 }}>Gallery</Typography>
              <div className="flex flex-wrap gap-8">
                {media.map((m, idx)=>(
                  <Box key={idx} sx={{ border: `1px solid ${BORDER}`, p: 1, borderRadius: 1 }}>
                    <Typography variant="caption" sx={{ display: "block", mb: .5 }}>{m.type}</Typography>
                    {m.url && m.type==="image" && <img src={m.url} alt="" style={{ height: 76, objectFit: "cover" }}/>}
                    {m.data && m.type==="image" && <img src={m.data} alt="" style={{ height: 76, objectFit: "cover" }}/>}
                    <Box>
                      <Button size="small" onClick={()=>removeMediaAt(idx)} disabled={!canWrite}>Remove</Button>
                    </Box>
                  </Box>
                ))}
                {!media.length && <Typography sx={{ color: "#9aa4ab" }}>No gallery items yet.</Typography>}
              </div>
            </Grid>

            <Grid item xs={12}>
              <Button variant="contained" onClick={onSubmit} disabled={(!canWrite) || creating || updating}>
                {editingId ? "Update Post" : "Create Post"}
              </Button>
              {editingId && <Button sx={{ ml: 1 }} onClick={reset}>Cancel</Button>}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ===== Posts table ===== */}
      <Card>
        <CardContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Published</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Tags</TableCell>
                <TableCell>Media</TableCell>
                <TableCell width={240}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visiblePosts.map(p=>(
                <TableRow key={p._id}>
                  <TableCell>{p.title}</TableCell>
                  <TableCell>{p.published ? "Yes" : "No"}</TableCell>
                  <TableCell>{p.category || "-"}</TableCell>
                  <TableCell>
                    {(p.tags || []).slice(0,5).map(t=>(
                      <Chip key={t} size="small" label={t} sx={{ mr:.5, mb:.5 }} />
                    ))}
                  </TableCell>
                  <TableCell>{(p.media||[]).length}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" onClick={()=>onEdit(p)} disabled={!canWrite}>Edit</Button>
                      <Button size="small" color="error" onClick={()=>onDelete(p._id)} disabled={!canWrite}>Delete</Button>
                      <IconButton size="small" onClick={()=>openAudit(p._id)} title="History">
                        <HistoryIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {visiblePosts.length===0 && <TableRow><TableCell colSpan={6}>No posts.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ===== Audit dialog ===== */}
      <Dialog open={auditOpen} onClose={()=>setAuditOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Change History</DialogTitle>
        <DialogContent dividers>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>When</TableCell>
                <TableCell>Actor</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Summary</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((l)=>(
                <TableRow key={l._id}>
                  <TableCell>{new Date(l.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{l.userEmail || l.userId}</TableCell>
                  <TableCell>{l.action}</TableCell>
                  <TableCell>{l.summary || "-"}</TableCell>
                </TableRow>
              ))}
              {logs.length===0 && <TableRow><TableCell colSpan={4}>No history.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setAuditOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
