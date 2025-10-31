import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const uri = process.env.MONGO_URI || "mongodb://localhost:27017/clicon";

mongoose.set("strictQuery", true);

mongoose
  .connect(uri)
  .then(() => console.log("MongoDB connected"))
  .catch((e) => {
    console.error("Mongo error:", e);
    process.exit(1);
  });

export default mongoose;
