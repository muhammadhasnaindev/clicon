/**
 * FAQPage
 * Short: Displays FAQs (server-driven, with fallbacks) and a support contact form.
 
 */

import React, { useMemo, useState } from "react";
import {
  Box, Typography, Accordion, AccordionSummary, AccordionDetails, TextField, Button,
  Grid, Snackbar, Alert, CircularProgress, Stack
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useGetFaqsQuery } from "../store/api/apiSlice";
import { useSendSupportMessageMutation } from "../store/api/helpApi";

const ORANGE = "#FA8232";
const BORDER = "#E5E7EB";
const YELLOW = "#FFF9DB";

const FALLBACK_FAQS = [
  { question: "Suspendisse ultrices pharetra libero sed interdum.", answer:
`Nulla malesuada iaculis nisi, vitae sagittis lacus laoreet in. Morbi aliquet pulvinar orci non vulputate. Donec aliquet ullamcorper gravida. Integer et malesuada fames ac ante ipsum primis in faucibus. Sed molestie accumsan odio, non iaculis magna mattis id. Ut consectetur massa vel viverra euismod. Integer et malesuada fames ac ante ipsum primis in faucibus. Praesent eget sem purus.

• Vivamus sed est non arcu porta aliquet ut vitae nulla.
• Integer et lacus vitae justo imperdiet fermentum in eu urna.
• Proin blandit nunc risus, sit amet turpis sagittis nec.
• Quisque ut dolor erat.` },
  { question: "Quisque quis nunc quis urna tempor lobortis vel non orci.", answer: "Cras in massa dui..." },
  { question: "Donec rutrum ultrices ante nec malesuada. In accumsan eget nisi a rhoncus.", answer: "Sed fringilla tellus..." },
  { question: "Nulla sed sapien maximus, faucibus massa vitae.", answer: "Etiam a auctor nibh..." },
];

function PlusMinus({ open }) {
  return (
    <Box sx={{
      width: 24, height: 24, borderRadius: 1,
      border: `1px solid ${open ? ORANGE : BORDER}`,
      bgcolor: open ? ORANGE : "#fff", color: open ? "#fff" : "#111",
      display: "grid", placeItems: "center", ml: 1,
    }}>
      {open ? <RemoveIcon sx={{ fontSize: 16 }} /> : <AddIcon sx={{ fontSize: 16 }} />}
    </Box>
  );
}

/**
 * FAQPage
 * Lists questions and optional support contact.
 */
export default function FAQPage() {
  const { data, isFetching, isError } = useGetFaqsQuery();
  const faqs = useMemo(() => {
    const rows = data?.data || [];
    // === [NEW LOGIC - 2025-10-25]: defensive normalization
    // PRO: Prevents crashes if backend sends incomplete rows.
    const normalized = rows.map((r) => ({ question: r?.question || "", answer: r?.answer || "", _id: r?._id }));
    return normalized.length ? normalized : FALLBACK_FAQS;
  }, [data]);

  const [openSet, setOpenSet] = useState(() => new Set());
  const toggle = (i) => setOpenSet(prev => {
    const next = new Set(prev);
    next.has(i) ? next.delete(i) : next.add(i);
    return next;
  });

  // support form
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState({ open: false, msg: "", type: "success" });
  const [sendSupport, { isLoading: sending }] = useSendSupportMessageMutation();

  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setToast({ open: true, msg: "Please enter a valid email.", type: "warning" }); return;
    }
    if (!subject.trim()) {
      setToast({ open: true, msg: "Please enter a subject.", type: "warning" }); return;
    }
    try {
      await sendSupport({ email, subject, message }).unwrap();
      setEmail(""); setSubject(""); setMessage("");
      setToast({ open: true, msg: "Thanks! We’ll get back to you shortly.", type: "success" });
    } catch (e) {
      setToast({ open: true, msg: e?.data?.message || "Failed to send message", type: "error" });
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, md: 0 }, py: 3 }}>
      <Grid container spacing={4}>
        <Grid item xs={12} md={8}>
          <Typography sx={{ fontWeight: 800, fontSize: 22, mb: 2 }}>Frequently Asked Questions</Typography>

          {isFetching && (
            <Stack direction="row" alignItems="center" spacing={1} sx={{ color: "#6b7280", mb: 2 }}>
              <CircularProgress size={18} /><Typography>Loading FAQs…</Typography>
            </Stack>
          )}
          {isError && <Alert severity="error" sx={{ mb: 2 }}>Failed to load FAQs. Showing defaults.</Alert>}

          {faqs.map((row, i) => {
            const open = openSet.has(i);
            return (
              <Accordion key={row._id || `${row.question}-${i}`} expanded={open} onChange={() => toggle(i)}
                sx={{ mb: 1.5, border: `1px solid ${open ? ORANGE : BORDER}`, borderRadius: 1.5,
                      boxShadow: open ? "0 8px 20px rgba(0,0,0,.07)" : "none", overflow: "hidden",
                      "&:before": { display: "none" } }}>
                <AccordionSummary
                  expandIcon={<PlusMinus open={open} />}
                  sx={{ fontWeight: 700, bgcolor: open ? ORANGE : "#f9fafb",
                        color: open ? "#fff" : "#111827",
                        "& .MuiAccordionSummary-content": { my: 0.75 } }}>
                  {row.question}
                </AccordionSummary>
                <AccordionDetails sx={{ bgcolor: "#fff", color: "#374151", borderTop: `1px solid ${open ? ORANGE : BORDER}` }}>
                  <Typography sx={{ whiteSpace: "pre-line" }}>{row.answer}</Typography>
                </AccordionDetails>
              </Accordion>
            );
          })}

          {!isFetching && !faqs.length && !isError && <Alert severity="info">No FAQs yet.</Alert>}
        </Grid>

        <Grid item xs={12} md={4}>
          <Box sx={{ bgcolor: YELLOW, p: 2.5, borderRadius: 2, border: `1px solid ${BORDER}` }}>
            <Typography sx={{ fontWeight: 800, mb: 0.5 }}>Don’t find your answer? Ask for support.</Typography>
            <Typography sx={{ color: "#6b7280", fontSize: 13.5, mb: 2 }}>
              Tell us what you need help with and we’ll email you back.
            </Typography>

            <TextField size="small" label="Email address" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth sx={{ mb: 1.5, bgcolor: "#fff" }} />
            <TextField size="small" label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} fullWidth sx={{ mb: 1.5, bgcolor: "#fff" }} />
            <TextField size="small" label="Message (Optional)" value={message} onChange={(e) => setMessage(e.target.value)} fullWidth multiline minRows={3} sx={{ mb: 2, bgcolor: "#fff" }} />

            <Button onClick={submit} disabled={sending} variant="contained" fullWidth endIcon={<ArrowForwardIcon />}
              sx={{ bgcolor: ORANGE, fontWeight: 800, textTransform: "none", "&:hover": { bgcolor: "#E7712F" } }}>
              {sending ? "Sending…" : "Send Message"}
            </Button>
          </Box>
        </Grid>
      </Grid>

      <Snackbar open={toast.open} autoHideDuration={1800} onClose={() => setToast((t) => ({ ...t, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert onClose={() => setToast((t) => ({ ...t, open: false }))} severity={toast.type} variant="filled">
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
