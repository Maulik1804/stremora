import { lazy, Suspense, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { useDispatch } from "react-redux";
import { initializeAuth } from "./store/slices/authSlice";
import MainLayout from "./layouts/MainLayout";
import AuthLayout from "./layouts/AuthLayout";
import AdminLayout from "./layouts/AdminLayout";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Spinner from "./components/ui/Spinner";

// ── All pages are lazy-loaded to keep the initial bundle lean ────────────────
const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Logout = lazy(() => import("./pages/Logout"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Watch = lazy(() => import("./pages/Watch"));
const Search = lazy(() => import("./pages/Search"));
const Channel = lazy(() => import("./pages/Channel"));
const Trending = lazy(() => import("./pages/Trending"));
const Explore = lazy(() => import("./pages/Explore"));
const Category = lazy(() => import("./pages/Category"));
const Subscriptions = lazy(() => import("./pages/Subscriptions"));
const History = lazy(() => import("./pages/History"));
const LikedVideos = lazy(() => import("./pages/LikedVideos"));
const Playlists = lazy(() => import("./pages/Playlists"));
const PlaylistDetail = lazy(() => import("./pages/PlaylistDetail"));
const Goals = lazy(() => import("./pages/Goals"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Settings = lazy(() => import("./pages/Settings"));
const Studio = lazy(() => import("./pages/Studio"));
const Upload = lazy(() => import("./pages/Upload"));
const EditVideo = lazy(() => import("./pages/EditVideo"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Series = lazy(() => import("./pages/Series"));
const ChannelPlaylistDetail = lazy(
  () => import("./pages/ChannelPlaylistDetail"),
);
const CollabInvites = lazy(() => import("./pages/CollabInvites"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminVideos = lazy(() => import("./pages/admin/AdminVideos"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminDeletedVideos = lazy(
  () => import("./pages/admin/AdminDeletedVideos"),
);

const PageLoader = () => (
  <div className="flex justify-center items-center min-h-[60vh]">
    <Spinner size="lg" />
  </div>
);

const App = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Auth pages */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>

        {/* Logout */}
        <Route path="/logout" element={<Logout />} />

        {/* Admin — isolated layout, no navbar/sidebar */}
        <Route
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/videos" element={<AdminVideos />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route
            path="/admin/deleted-videos"
            element={<AdminDeletedVideos />}
          />
        </Route>

        {/* Main app */}
        <Route element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="/watch/:id" element={<Watch />} />
          <Route path="/search" element={<Search />} />
          <Route path="/channel/:username" element={<Channel />} />
          <Route
            path="/channel-playlist/:id"
            element={<ChannelPlaylistDetail />}
          />
          <Route path="/trending" element={<Trending />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/category/:slug" element={<Category />} />
          <Route
            path="/subscriptions"
            element={
              <ProtectedRoute>
                <Subscriptions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <History />
              </ProtectedRoute>
            }
          />
          <Route
            path="/liked"
            element={
              <ProtectedRoute>
                <LikedVideos />
              </ProtectedRoute>
            }
          />
          <Route
            path="/playlists"
            element={
              <ProtectedRoute>
                <Playlists />
              </ProtectedRoute>
            }
          />
          <Route
            path="/playlists/:id"
            element={
              <ProtectedRoute>
                <PlaylistDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/goals"
            element={
              <ProtectedRoute>
                <Goals />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/studio/*"
            element={
              <ProtectedRoute>
                <Studio />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upload"
            element={
              <ProtectedRoute>
                <Upload />
              </ProtectedRoute>
            }
          />
          <Route
            path="/studio/edit/:id"
            element={
              <ProtectedRoute>
                <EditVideo />
              </ProtectedRoute>
            }
          />
          <Route
            path="/series"
            element={
              <ProtectedRoute>
                <Series />
              </ProtectedRoute>
            }
          />
          <Route
            path="/collab-invites"
            element={
              <ProtectedRoute>
                <CollabInvites />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default App;
