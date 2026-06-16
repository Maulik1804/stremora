import { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Film,
  Users,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Trash2,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useDispatch } from "react-redux";
import { authService } from "../services/auth.service";
import { setCredentials, logout, logoutUser } from "../store/slices/authSlice";
import Avatar from "../components/ui/Avatar";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/videos", label: "Videos", icon: Film },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/deleted-videos", label: "Deleted Videos", icon: Trash2 },
];

// ── Sidebar content (shared between desktop + mobile drawer) ─────────────────
const SidebarContent = ({ user, onLogout, onClose }) => (
  <div className="flex flex-col h-full">
    {/* Logo */}
    <div className="px-4 py-4 border-b border-white/6 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-brand/15 flex items-center justify-center shrink-0">
          <ShieldCheck size={16} className="text-brand" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-text-primary">Admin Panel</p>
          <p className="text-[10px] text-[#555]">Streamora</p>
        </div>
      </div>
      {/* Close button — mobile only */}
      {onClose && (
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-[#555] hover:text-text-primary hover:bg-white/6 transition-colors md:hidden"
        >
          <X size={18} />
        </button>
      )}
    </div>

    {/* Nav */}
    <nav className="flex-1 p-2 flex flex-col gap-0.5 overflow-y-auto">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
             ${isActive ? "bg-brand/15 text-brand" : "text-[#666] hover:bg-white/5 hover:text-[#ccc]"}`
          }
        >
          {({ isActive }) => (
            <>
              <Icon
                size={16}
                className={isActive ? "text-brand" : "text-[#555]"}
              />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>

    {/* Footer */}
    <div className="p-2 border-t border-white/6">
      <button
        onClick={onLogout}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#666] hover:bg-red-500/10 hover:text-red-400 transition-all text-left"
      >
        <LogOut size={16} />
        Sign out
      </button>
      <div className="flex items-center gap-2.5 px-3 py-3 mt-1 border-t border-white/5">
        <Avatar src={user?.avatar} alt={user?.displayName} size="sm" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-text-primary truncate">
            {user?.displayName || user?.username}
          </p>
          <p className="text-[10px] text-[#555] truncate">Administrator</p>
        </div>
      </div>
    </div>
  </div>
);

// ── Layout ────────────────────────────────────────────────────────────────────
const AdminLayout = () => {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Verify admin role
  useEffect(() => {
    if (user?.role === "admin") return;
    authService
      .getMe()
      .then(({ data }) => {
        const freshUser = data?.data?.user;
        if (freshUser) {
          dispatch(setCredentials({ user: freshUser }));
          if (freshUser.role !== "admin") navigate("/login", { replace: true });
        }
      })
      .catch(() => navigate("/login", { replace: true }));
  }, []); // eslint-disable-line

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
    } catch (err) {
      // ignore — still proceed to clear local state
    }
    dispatch(logout());
    navigate("/login", { replace: true });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#080808] flex">
      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <aside className="hidden md:flex w-56 shrink-0 bg-surface border-r border-white/6 flex-col fixed left-0 top-0 bottom-0 z-40">
        <SidebarContent user={user} onLogout={handleLogout} />
      </aside>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            {/* Drawer */}
            <motion.aside
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              className="fixed left-0 top-0 bottom-0 z-60 w-64 bg-surface border-r border-white/6 md:hidden"
            >
              <SidebarContent
                user={user}
                onLogout={handleLogout}
                onClose={() => setMobileOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content ── */}
      <main className="flex-1 md:ml-56 min-h-screen overflow-x-hidden w-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-surface border-b border-white/6 sticky top-0 z-30">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-xl text-[#666] hover:text-text-primary hover:bg-white/6 transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-brand/15 flex items-center justify-center">
              <ShieldCheck size={12} className="text-brand" />
            </div>
            <span className="text-sm font-bold text-text-primary">
              Admin Panel
            </span>
          </div>
        </div>

        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="p-4 md:p-6 max-w-4xl mx-auto w-full"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
};

export default AdminLayout;
