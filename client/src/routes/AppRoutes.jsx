/**
  AppRoutes
  Short: Central router with public site, user dashboard, and admin routes.
 
 .
 */

import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";

// site pages
import HomePage from "../pages/Home/HomePage";
import ProductListing from "../pages/ProductListing";
import Compare from "../pages/ComparePage";

import ProductDetail from "../pages/ProductDetail";
import TrackOrder from "../pages/TrackOrder";
import OrderTracking from "../pages/OrderTracking";

import CheckoutPage from "../pages/CheckoutPage";

import FAQPage from "../pages/FAQPage";
import AboutUsPage from "../pages/AboutUsPage";
import HelpCenterPage from "../pages/HelpCenterPage";
// blog
import BlogDetailPage from "../pages/Blog/BlogDetailPage";
import PostsPublic from "../pages/Blog/PostsPublic";

import WishlistTable from "../features/wishlist/WishlistTable";
import ShoppingCart from "../features/cart/ShoppingCart";

// modern auth pages
import AuthTabs from "../pages/auth/AuthTabs";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";
import VerifyEmail from "../pages/auth/VerifyEmail";
import OAuthCapture from "../pages/auth/OAuthCapture";

// user dashboard
import DashboardLayout from "../pages/Dashboard/DashboardLayout";
import DashboardHome from "../pages/Dashboard/DashboardHome";
import OrderHistory from "../pages/Dashboard/OrderHistory";
import OrderDetails from "../pages/Dashboard/OrderDetails";
import CardsAddress from "../pages/Dashboard/CardsAddress";
import BrowsingHistory from "../pages/Dashboard/BrowsingHistory";
import Settings from "../pages/Dashboard/Settings";
import CartPane from "../pages/Dashboard/CartPane";
import WishlistPane from "../pages/Dashboard/WishlistPane";
import ComparePane from "../pages/Dashboard/ComparePane";
import TrackPane from "../pages/Dashboard/TrackPane";

// admin pages
import AdminDashboard from "../pages/Admin/AdminDashboard";
import AdminProducts from "../pages/Admin/AdminProducts";
import AdminAnalytics from "../pages/Admin/AdminAnalytics";
import AdminPosts from "../pages/Admin/AdminPosts";
import AdminUsers from "../pages/Admin/AdminUsers";
import AdminOrders from "../pages/Admin/AdminOrders"; 
import AdminSupport from "../pages/Admin/AdminSupport";  
import AdminFaqs from "../pages/Admin/AdminFaqs";
import AdminCustomers from "../pages/Admin/AdminCustomers";  
import AdminStaff from "../pages/Admin/AdminStaff";

// guards
import RequireAdmin from "../routes/RequireAdmin";
import RequireUser from "../routes/RequireUser";
import RequirePerm from "../routes/RequirePerm";

// helper
function RedirectOrderDetails() {
  const { id } = useParams();
  return <Navigate to={`/account/dashboard/orders/${id}`} replace />;
}

export default function AppRoutes() {
  return (
    <Router>
      <Routes>
        {/* Public site routes */}
        <Route path="/" element={<MainLayout><HomePage/></MainLayout>} />
        <Route path="/shop" element={<MainLayout><ProductListing/></MainLayout>} />
        <Route path="/shop/:idOrSlug" element={<MainLayout><ProductListing/></MainLayout>} />

        {/* Product detail (slug/id) */}
        <Route path="/product/:idOrSlug" element={<MainLayout><ProductDetail/></MainLayout>} />
        {/* Legacy direct detail route (kept for backlinks) */}
        <Route path="/ProductDetail" element={<MainLayout><ProductDetail/></MainLayout>} />

        {/* Order tracking (public) */}
        <Route path="/track-order" element={<MainLayout><TrackOrder/></MainLayout>} />
        <Route path="/order-tracking/:id" element={<MainLayout><OrderTracking/></MainLayout>} />
        <Route path="/order-tracking" element={<MainLayout><TrackOrder/></MainLayout>} /> {/* fallback */}

        <Route path="/shopping-cart" element={<MainLayout><ShoppingCart/></MainLayout>} />

        {/* Checkout — verified regular users */}
        <Route
          path="/checkout"
          element={
            <RequireUser>
              <MainLayout><CheckoutPage/></MainLayout>
            </RequireUser>
          }
        />

        {/* FAQs / About / Help / Blog */}
        <Route path="/faq" element={<MainLayout><FAQPage/></MainLayout>} />
        <Route path="/about-us" element={<MainLayout><AboutUsPage/></MainLayout>} />
        <Route path="/help-center" element={<MainLayout><HelpCenterPage/></MainLayout>} />
        <Route path="/blog" element={<MainLayout><PostsPublic/></MainLayout>} />
        <Route path="/blog/:id" element={<MainLayout><BlogDetailPage/></MainLayout>} />

        <Route path="/compare" element={<MainLayout><Compare/></MainLayout>} />
        <Route path="/wishlist" element={<MainLayout><WishlistTable/></MainLayout>} />

        {/* Modern Auth */}
        <Route path="/auth" element={<MainLayout><AuthTabs/></MainLayout>} />
        <Route path="/forgot" element={<MainLayout><ForgotPassword/></MainLayout>} />
        <Route path="/reset" element={<MainLayout><ResetPassword/></MainLayout>} />
        <Route path="/verify-email" element={<MainLayout><VerifyEmail/></MainLayout>} />
        <Route path="/auth/callback" element={<MainLayout><OAuthCapture /></MainLayout>} />

        {/* USER DASHBOARD */}
        <Route
          path="/account/dashboard"
          element={
            <RequireUser>
              <MainLayout><DashboardLayout/></MainLayout>
            </RequireUser>
          }
        >
          <Route index element={<DashboardHome />} />
          <Route path="orders" element={<OrderHistory />} />
          <Route path="orders/:id" element={<OrderDetails />} />
          <Route path="cards-address" element={<CardsAddress />} />
          <Route path="browsing" element={<BrowsingHistory />} />
          <Route path="settings" element={<Settings />} />
          <Route path="cart" element={<CartPane />} />
          <Route path="wishlist" element={<WishlistPane />} />
          <Route path="compare" element={<ComparePane />} />
          <Route path="track" element={<TrackPane />} />
        </Route>

        {/* ADMIN entry */}
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <MainLayout><AdminDashboard /></MainLayout>
            </RequireAdmin>
          }
        />

        {/* ADMIN subpages */}
        <Route
          path="/admin/orders"
          element={
            <RequirePerm perms={["billing:view", "orders:update", "analytics:view"]}>
              <MainLayout><AdminOrders /></MainLayout>
            </RequirePerm>
          }
        />
        <Route
          path="/admin/products"
          element={
            <RequirePerm perms={["products:*", "products:write"]}>
              <MainLayout><AdminProducts /></MainLayout>
            </RequirePerm>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <RequirePerm perms={["analytics:view"]}>
              <MainLayout><AdminAnalytics /></MainLayout>
            </RequirePerm>
          }
        />
        <Route
          path="/admin/posts"
          element={
            <RequirePerm perms={["posts:*","posts:write","posts:read","posts:read:own","posts:write:own"]}>
              <MainLayout><AdminPosts /></MainLayout>
            </RequirePerm>
          }
        />
        <Route
          path="/admin/users"
          element={
            <RequireAdmin>
              <MainLayout><AdminUsers /></MainLayout>
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/support"
          element={
            <RequireAdmin>
              <MainLayout><AdminSupport /></MainLayout>
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/faqs"
          element={
            <RequireAdmin>
              <MainLayout><AdminFaqs /></MainLayout>
            </RequireAdmin>
          }
        />
        {/* NEW */}
        <Route
          path="/admin/customers"
          element={
            <RequireAdmin>
              <MainLayout><AdminCustomers /></MainLayout>
            </RequireAdmin>
          }
        />
        {/* NEW */}
        <Route
          path="/admin/staff"
          element={
            <RequireAdmin>
              <MainLayout><AdminStaff /></MainLayout>
            </RequireAdmin>
          }
        />

        {/* Short redirects */}
        <Route path="/account" element={<Navigate to="/account/dashboard" replace />} />
        <Route path="/account/orders" element={<Navigate to="/account/dashboard/orders" replace />} />
        <Route path="/account/orders/:id" element={<RedirectOrderDetails />} />
        <Route path="/account/cards-address" element={<Navigate to="/account/dashboard/cards-address" replace />} />
        <Route path="/account/browsing" element={<Navigate to="/account/dashboard/browsing" replace />} />
        <Route path="/account/settings" element={<Navigate to="/account/dashboard/settings" replace />} />
      </Routes>
    </Router>
  );
}
