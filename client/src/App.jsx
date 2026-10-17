import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastProvider } from "./context/ToastContext";
import Register from "./pages/Register";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Navbar from "./components/Navbar";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import PostDetail from "./pages/PostDetail";
import PostEdit from "./pages/PostEdit";
import UserProfile from "./pages/UserProfile";
import Search from "./pages/Search";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import Messages from "./pages/Messages";
import AmbientNetworkBackground from "./components/AmbientNetworkBackground";
import PageTransition from "./components/PageTransition";
import "./styles/interactions.css";

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <AmbientNetworkBackground />
        <Navbar />
        <PageTransition>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route element={<ProtectedRoute />}>
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
        </Routes>
        </PageTransition>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
