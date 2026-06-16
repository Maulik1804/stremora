import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Save,
  Lock,
  User,
  Shield,
  Palette,
  Trash2,
  AlertTriangle,
  X,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { userService } from "../services/user.service";
import { setCredentials, logout, logoutUser } from "../store/slices/authSlice";
import { useAuth } from "../hooks/useAuth";
import Avatar from "../components/ui/Avatar";
import FormField from "../components/ui/FormField";
import Button from "../components/ui/Button";
import ImageCropper from "../components/ui/ImageCropper";
import { toast } from "../components/ui/Toast";

const profileSchema = z.object({
  displayName: z.string().max(50, "Max 50 characters").optional(),
  bio: z.string().max(1000, "Max 1000 characters").optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "Include an uppercase letter")
      .regex(/[0-9]/, "Include a number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// ── Image upload trigger ──────────────────────────────────────────────────────
const ImageUploadTrigger = ({ label, onSelect, children }) => {
  const ref = useRef(null);
  return (
    <>
      <div onClick={() => ref.current?.click()} className="cursor-pointer">
        {children}
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onSelect(f);
          e.target.value = "";
        }}
      />
    </>
  );
};

// ── Section card ──────────────────────────────────────────────────────────────
const Section = ({ title, icon: Icon, children, index = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.07, duration: 0.25 }}
    className="bg-[#0f0f0f] border border-white/6 rounded-2xl overflow-hidden"
  >
    <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
      {Icon && (
        <div className="w-8 h-8 rounded-xl bg-white/4 flex items-center justify-center">
          <Icon size={15} className="text-[#888]" />
        </div>
      )}
      <h2 className="text-sm font-semibold text-[#e0e0e0]">{title}</h2>
    </div>
    <div className="px-6 py-5">{children}</div>
  </motion.div>
);

const Settings = () => {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [showAvatarCropper, setShowAvatarCropper] = useState(false);
  const [showBannerCropper, setShowBannerCropper] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [cropType, setCropType] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user?.displayName ?? "",
      bio: user?.bio ?? "",
    },
  });

  const profileMutation = useMutation({
    mutationFn: (data) => userService.updateProfile(data),
    onSuccess: (res) => {
      dispatch(setCredentials({ user: res.data.data.user }));
      queryClient.invalidateQueries({ queryKey: ["channel", user?.username] });
      toast.success("Profile updated");
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Update failed"),
  });

  const passwordForm = useForm({ resolver: zodResolver(passwordSchema) });

  const passwordMutation = useMutation({
    mutationFn: (data) => userService.changePassword(data),
    onSuccess: () => {
      passwordForm.reset();
      toast.success("Password changed");
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Password change failed"),
  });

  const avatarMutation = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append("avatar", file);
      return userService.uploadAvatar(fd);
    },
    onSuccess: (res) => {
      dispatch(
        setCredentials({ user: { ...user, avatar: res.data.data.avatar } }),
      );
      queryClient.invalidateQueries({ queryKey: ["channel", user?.username] });
      toast.success("Avatar updated");
    },
    onError: () => toast.error("Avatar upload failed"),
  });

  const bannerMutation = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append("banner", file);
      return userService.uploadBanner(fd);
    },
    onSuccess: (res) => {
      dispatch(
        setCredentials({ user: { ...user, banner: res.data.data.banner } }),
      );
      queryClient.invalidateQueries({ queryKey: ["channel", user?.username] });
      toast.success("Banner updated");
    },
    onError: () => toast.error("Banner upload failed"),
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (password) => userService.deleteAccount(password),
    onSuccess: async () => {
      try {
        await dispatch(logoutUser()).unwrap();
      } catch (e) {
        /* ignore */
      }
      dispatch(logout());
      toast.success("Account deleted");
      navigate("/login", { replace: true });
    },
    onError: (err) => {
      setDeleteError(err.response?.data?.message || "Incorrect password");
    },
  });

  const handleImageSelect = (file, type) => {
    // Validate image
    const validMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validMimes.includes(file.type)) {
      toast.error("Invalid image type. Accepted: JPEG, PNG, WebP, GIF");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image exceeds 5 MB limit");
      return;
    }

    // Show cropper
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageToCrop(e.target.result);
      setCropType(type);
      if (type === "avatar") {
        setShowAvatarCropper(true);
      } else {
        setShowBannerCropper(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedBlob) => {
    if (cropType === "avatar") {
      setShowAvatarCropper(false);
      setAvatarPreview(URL.createObjectURL(croppedBlob));
      avatarMutation.mutate(croppedBlob);
    } else {
      setShowBannerCropper(false);
      setBannerPreview(URL.createObjectURL(croppedBlob));
      bannerMutation.mutate(croppedBlob);
    }
    setImageToCrop(null);
    setCropType(null);
  };

  const bioValue = profileForm.watch("bio") ?? "";

  return (
    <>
      <AnimatePresence>
        {showAvatarCropper && imageToCrop && (
          <ImageCropper
            imageSrc={imageToCrop}
            aspect={1 / 1}
            title="Adjust Profile Photo"
            onCropComplete={handleCropComplete}
            onCancel={() => {
              setShowAvatarCropper(false);
              setImageToCrop(null);
              setCropType(null);
            }}
          />
        )}
        {showBannerCropper && imageToCrop && (
          <ImageCropper
            imageSrc={imageToCrop}
            aspect={16 / 9}
            title="Adjust Banner"
            onCropComplete={handleCropComplete}
            onCancel={() => {
              setShowBannerCropper(false);
              setImageToCrop(null);
              setCropType(null);
            }}
          />
        )}
      </AnimatePresence>

      <div className="min-h-screen px-4 md:px-8 py-8 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
          <p className="text-sm text-[#555] mt-1">
            Manage your account and channel
          </p>
        </motion.div>

        <div className="flex flex-col gap-4">
          {/* Channel art */}
          <Section title="Channel art" icon={Palette} index={0}>
            {/* Banner */}
            <div className="mb-6">
              <p className="text-xs font-medium text-[#666] uppercase tracking-widest mb-3">
                Banner
              </p>
              <ImageUploadTrigger
                onSelect={(f) => handleImageSelect(f, "banner")}
              >
                <div className="relative h-28 rounded-2xl overflow-hidden bg-[#111] border border-white/6 group cursor-pointer">
                  {bannerPreview || user?.banner ? (
                    <img
                      src={bannerPreview || user.banner}
                      alt="Banner"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full"
                      style={{
                        background:
                          "radial-gradient(ellipse at 30% 50%, rgba(229,9,20,0.08) 0%, transparent 60%), #111",
                      }}
                    />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <Camera size={16} className="text-white" />
                    <span className="text-white text-sm font-medium">
                      Change banner
                    </span>
                  </div>
                  {bannerMutation.isPending && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              </ImageUploadTrigger>
            </div>

            {/* Avatar */}
            <div>
              <p className="text-xs font-medium text-[#666] uppercase tracking-widest mb-3">
                Profile photo
              </p>
              <div className="flex items-center gap-5">
                <ImageUploadTrigger
                  onSelect={(f) => handleImageSelect(f, "avatar")}
                >
                  <div className="relative group cursor-pointer">
                    <Avatar
                      src={avatarPreview || user?.avatar}
                      alt={user?.displayName || ""}
                      size="xl"
                      className="w-20 h-20"
                    />
                    <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/55 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Camera size={18} className="text-white" />
                    </div>
                    {avatarMutation.isPending && (
                      <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                </ImageUploadTrigger>
                <div>
                  <p className="text-sm font-semibold text-[#e0e0e0]">
                    {user?.displayName}
                  </p>
                  <p className="text-xs text-[#555] mt-0.5">
                    @{user?.username}
                  </p>
                  <p className="text-xs text-[#444] mt-2">
                    Click photo to change
                  </p>
                </div>
              </div>
            </div>
          </Section>

          {/* Profile info */}
          <Section title="Profile information" icon={User} index={1}>
            <form
              onSubmit={profileForm.handleSubmit((d) =>
                profileMutation.mutate(d),
              )}
              className="flex flex-col gap-4"
            >
              <FormField
                label="Display name"
                placeholder="Your name"
                error={profileForm.formState.errors.displayName?.message}
                {...profileForm.register("displayName")}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#888]">Bio</label>
                <textarea
                  rows={4}
                  placeholder="Tell viewers about your channel…"
                  className="w-full bg-[#111] border border-white/8 rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-[#444] outline-none resize-none focus:border-white/18 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.04)] transition-all"
                  {...profileForm.register("bio")}
                />
                <p className="text-xs text-[#444] text-right">
                  {bioValue.length}/1000
                </p>
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={profileMutation.isPending}
                >
                  <Save size={14} /> Save changes
                </Button>
              </div>
            </form>
          </Section>

          {/* Account info */}
          <Section title="Account" icon={Shield} index={2}>
            <div className="flex flex-col">
              {[
                { label: "Username", value: `@${user?.username}` },
                { label: "Email", value: user?.email },
                {
                  label: "Member since",
                  value: user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                      })
                    : "—",
                },
              ].map(({ label, value }, i, arr) => (
                <div
                  key={label}
                  className={`flex items-center justify-between py-3 ${i < arr.length - 1 ? "border-b border-white/5" : ""}`}
                >
                  <span className="text-sm text-[#666]">{label}</span>
                  <span className="text-sm text-[#e0e0e0] font-medium">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </Section>

          {/* Change password */}
          <Section title="Change password" icon={Lock} index={3}>
            <form
              onSubmit={passwordForm.handleSubmit((d) =>
                passwordMutation.mutate(d),
              )}
              className="flex flex-col gap-4"
            >
              <FormField
                label="Current password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                error={passwordForm.formState.errors.currentPassword?.message}
                {...passwordForm.register("currentPassword")}
              />
              <FormField
                label="New password"
                type="password"
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                error={passwordForm.formState.errors.newPassword?.message}
                {...passwordForm.register("newPassword")}
              />
              <FormField
                label="Confirm new password"
                type="password"
                placeholder="Re-enter new password"
                autoComplete="new-password"
                error={passwordForm.formState.errors.confirmPassword?.message}
                {...passwordForm.register("confirmPassword")}
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="secondary"
                  size="md"
                  loading={passwordMutation.isPending}
                >
                  <Lock size={14} /> Update password
                </Button>
              </div>
            </form>
          </Section>

          {/* Danger zone — Delete account */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.25 }}
            className="bg-[#0f0f0f] border border-red-500/20 rounded-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-red-500/10 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center">
                <AlertTriangle size={15} className="text-red-400" />
              </div>
              <h2 className="text-sm font-semibold text-red-400">
                Danger zone
              </h2>
            </div>
            <div className="px-6 py-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[#e0e0e0]">
                  Delete account
                </p>
                <p className="text-xs text-[#555] mt-0.5">
                  Permanently delete your account and all your videos. This
                  cannot be undone.
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  setShowDeleteModal(true);
                  setDeleteError("");
                  setDeletePassword("");
                }}
                className="shrink-0"
              >
                <Trash2 size={14} /> Delete
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Delete account confirmation modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 12 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#111] border border-red-500/25 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
                    <Trash2 size={18} className="text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-text-primary font-semibold">
                      Delete your account?
                    </h3>
                    <p className="text-xs text-[#555] mt-0.5">
                      This will permanently delete everything
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="text-[#555] hover:text-text-primary transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="bg-red-500/8 border border-red-500/15 rounded-xl p-3 mb-4">
                <p className="text-xs text-red-300 leading-relaxed">
                  This will permanently delete your account, all your videos,
                  comments, and data from our servers.{" "}
                  <strong>This action cannot be undone.</strong>
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs font-medium text-[#888] block mb-1.5">
                    Enter your password to confirm
                  </label>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => {
                      setDeletePassword(e.target.value);
                      setDeleteError("");
                    }}
                    placeholder="Your current password"
                    className="w-full bg-surface border border-white/8 rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-[#444] outline-none focus:border-red-500/40 transition-colors"
                    autoComplete="current-password"
                  />
                  {deleteError && (
                    <p className="text-xs text-red-400 mt-1.5">{deleteError}</p>
                  )}
                </div>

                <div className="flex gap-2 mt-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => setShowDeleteModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    className="flex-1"
                    disabled={!deletePassword}
                    loading={deleteAccountMutation.isPending}
                    onClick={() => deleteAccountMutation.mutate(deletePassword)}
                  >
                    <Trash2 size={14} /> Delete account
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Settings;
