import StarIcon from "@mui/icons-material/Star";
import { Box, Typography } from "@mui/material";

export default function RatingStars({ value = 0, count = 0 }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }} aria-label={`rating ${value} out of 5 from ${count} reviews`}>
      <Typography sx={{ color: "#FFAA00", fontSize: 12, fontWeight: 700 }}>
        <StarIcon sx={{ fontSize: 16, verticalAlign: "middle" }} /> {Number(value).toFixed(1)}
      </Typography>
      <Typography sx={{ fontSize: 12, color: "#7A7A7A" }}>({count})</Typography>
    </Box>
  );
}
