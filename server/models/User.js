// server/models/User.js

/*
[PRO] Purpose: Core user profile, permissions, addresses, and auth fields.
Context: Used everywhere — profile pages, checkout, orders, support, reviews.
Edge cases: passwordHash must exist to login; verifyCode/resetCode cleared after use.
Notes: Team subdoc controls About Page display and ordering.
*/
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const AddressSchema = new mongoose.Schema(
  {
    firstName: String,
    lastName: String,
    company: String,
    line1: String,
    city: String,
    state: String,
    zip: String,
    country: String,
    email: String,
    phone: String,
  },
  { _id: false }
);

const DefaultCardSchema = new mongoose.Schema(
  {
    name: String,
    last4: String,
    exp: String, // MM/YY
  },
  { _id: false }
);

const TeamSchema = new mongoose.Schema(
  {
    showOnAbout: { type: Boolean, default: false },
    title:       { type: String,  default: "" },
    order:       { type: Number,  default: 0 },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    fullName: String,
    displayName: String,
    username: String,

    email: { type: String, unique: true, required: true, index: true, lowercase: true, trim: true },
    secondaryEmail: String,
    phone: String,

    country: String,
    state: String,
    city: String,
    zip: String,

    avatarUrl: { type: String, default: "" },
    team: { type: TeamSchema, default: () => ({}) },

    role: { type: String, enum: ["user", "manager", "admin"], default: "user" },
    permissions: { type: [String], default: [] },
    emailVerified: { type: Boolean, default: false },

    passwordHash: String,
    verifyCode: String,
    resetCode: String,

    billingAddress: AddressSchema,
    shippingAddress: AddressSchema,

    defaultPaymentMethod: { type: String, default: "card" },
    defaultCard: DefaultCardSchema,
  },
  { timestamps: true }
);

UserSchema.methods.setPassword = async function (raw) {
  this.passwordHash = await bcrypt.hash(String(raw), 10);
};
UserSchema.methods.checkPassword = async function (raw) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(String(raw), this.passwordHash);
};

export default mongoose.model("User", UserSchema);
