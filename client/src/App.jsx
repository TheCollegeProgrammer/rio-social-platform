import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastProvider } from "./context/ToastContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppShell from "./components/layout/AppShell";
import Navbar from "./components/Navbar";
import AmbientNetworkBackground from "./components/AmbientNetworkBackground";
import PageTransition from "./components/PageTransition";
import BackendReady from "./components/BackendReady";
import "./styles/interactions.css";

// Route-level code splitting (E3)
const Register = lazy(() => import("./pages/Register"));
const Login = lazy(() => import("./pages/Login"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Home = lazy(() => import("./pages/Home"));
const Profile = lazy(() => import("./pages/Profile"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const PostDetail = lazy(() => import("./pages/PostDetail"));
const PostEdit = lazy(() => import("./pages/PostEdit"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const Search = lazy(() => import("./pages/Search"));
const Settings = lazy(() => import("./pages/Settings"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Messages = lazy(() => import("./pages/Messages"));

function RouteFallback() {
  return (
    <div className="route-loading" role="status" aria-live="polite">
      Loading…
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <BackendReady>
        <AmbientNetworkBackground />
        <Navbar />
        <PageTransition>
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<Home />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/edit" element={<EditProfile />} />
              <Route path="/posts/:id" element={<PostDetail />} />
              <Route path="/posts/:id/edit" element={<PostEdit />} />
              <Route path="/users/:id" element={<UserProfile />} />
              <Route path="/search" element={<Search />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/messages" element={<Messages />} />
            </Route>
          </Route>
        </Routes>
        </Suspense>
        </PageTransition>
        </BackendReady>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
