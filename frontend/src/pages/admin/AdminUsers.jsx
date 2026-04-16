import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Trash2, ShieldOff, Shield, Crown, UserCheck,
  User as UserIcon, ChevronLeft, ChevronRight, X, AlertTriangle, Calendar,
} from 'lucide-react';
import { adminService } from '../../services/admin.service';
import { toast } from '../../components/ui/Toast';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const ROLE_COLORS = {
  admin:   'bg-red-500/15 text-red-400 border border-red-500/25',
  creator: 'bg-purple-500/15 text-purple-400 border border-purple-500/25',
  user:    'bg-white/6 text-[#888] border border-white/10',
};
const ROLE_ICONS = { admin: Crown, creator: UserCheck, user: UserIcon };

const DeleteModal = ({ user, onConfirm, onClose, loading }) => (
  <AnimatePresence>
    {user && (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }} transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#111] border border-red-500/25 rounded-2xl p-6 w-full max-w-sm"
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={18} className="text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-[#e8e8e8] font-semibold">Delete user?</h3>
              <p className="text-xs text-[#555] mt-0.5">@{user.username}</p>
            </div>
            <button onClick={onClose} className="text-[#555] hover:text-[#e8e8e8]"><X size={16} /></button>
          </div>
          <p className="text-sm text-[#888] mb-5">All their videos and content will be permanently deleted.</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button variant="danger" size="sm" className="flex-1" loading={loading} onClick={onConfirm}>Delete</Button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

const AdminUsers = () => {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', page, search],
    queryFn: () => adminService.getUsers({ page, limit: 20, search: search || undefined }).then((r) => r.data.data),
    keepPreviousData: true,
  });

  const suspendMut = useMutation({
    mutationFn: (id) => adminService.suspendUser(id),
    onSuccess: (res) => {
      toast.success(res.data.data.isSuspended ? 'User suspended' : 'User unsuspended');
      qc.invalidateQueries(['admin', 'users']);
      qc.invalidateQueries(['admin', 'stats']);
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed'),
  });

  const roleMut = useMutation({
    mutationFn: ({ id, role }) => adminService.changeRole(id, role),
    onSuccess: () => { toast.success('Role updated'); qc.invalidateQueries(['admin', 'users']); },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => adminService.deleteUser(id),
    onSuccess: () => {
      toast.success('User deleted');
      qc.invalidateQueries(['admin', 'users']);
      qc.invalidateQueries(['admin', 'stats']);
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed'),
  });

  const users = data?.users ?? [];
  const pagination = data?.pagination;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-[#e8e8e8]">Users</h1>
          <p className="text-sm text-[#555] mt-0.5">{pagination ? `${pagination.total} total` : '…'}</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); setPage(1); }} className="flex gap-2">
          <div className="relative flex-1 sm:flex-none">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search users…"
              className="bg-[#111] border border-white/8 rounded-xl pl-9 pr-4 py-2 text-sm text-[#e8e8e8] placeholder-[#444] focus:outline-none focus:border-white/20 w-full sm:w-48"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">Search</Button>
        </form>
      </div>

      {/* List */}
      <div className="bg-[#111] border border-white/6 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-white/4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-white/5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="h-4 w-28 bg-white/5 rounded mb-1.5" />
                  <div className="h-3 w-20 bg-white/5 rounded" />
                </div>
                <div className="h-7 w-20 bg-white/5 rounded-lg" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="py-14 text-center text-[#555] text-sm">No users found</div>
        ) : (
          <div className="divide-y divide-white/4">
            {users.map((u) => {
              const RoleIcon = ROLE_ICONS[u.role] ?? UserIcon;
              return (
                <motion.div
                  key={u._id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="px-4 py-3 hover:bg-white/2 transition-colors"
                >
                  {/* Top row: avatar + info + role badge */}
                  <div className="flex items-center gap-3">
                    <Avatar src={u.avatar} alt={u.displayName || u.username} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-[#e8e8e8] truncate">{u.displayName || u.username}</p>
                        {u.isSuspended && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-orange-500/15 text-orange-400 border border-orange-500/25">Suspended</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-[#555] flex-wrap">
                        <span>@{u.username}</span>
                        <span className="hidden sm:inline">· {u.email}</span>
                        <span className="flex items-center gap-1 ml-auto sm:ml-0"><Calendar size={10} />{fmtDate(u.createdAt)}</span>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs flex-shrink-0 ${ROLE_COLORS[u.role]}`}>
                      <RoleIcon size={10} />{u.role}
                    </span>
                  </div>

                  {/* Actions row (only for non-admin users) */}
                  {u.role !== 'admin' && (
                    <div className="flex items-center gap-2 mt-2.5 pl-12">
                      <button
                        onClick={() => suspendMut.mutate(u._id)}
                        title={u.isSuspended ? 'Unsuspend' : 'Suspend'}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          u.isSuspended
                            ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-white/5 text-[#aaa] hover:bg-orange-500/10 hover:text-orange-400'
                        }`}
                      >
                        {u.isSuspended ? <><Shield size={12} /> Unsuspend</> : <><ShieldOff size={12} /> Suspend</>}
                      </button>

                      <button
                        onClick={() => setDeleteTarget(u)}
                        className="p-1.5 rounded-lg bg-white/5 text-[#aaa] hover:bg-red-500/10 hover:text-red-400 transition-all ml-auto"
                        title="Delete user"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-5">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft size={14} />
          </Button>
          <span className="text-sm text-[#888]">Page {page} of {pagination.totalPages}</span>
          <Button variant="secondary" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>
            <ChevronRight size={14} />
          </Button>
        </div>
      )}

      <DeleteModal
        user={deleteTarget}
        onConfirm={() => deleteMut.mutate(deleteTarget._id)}
        onClose={() => setDeleteTarget(null)}
        loading={deleteMut.isPending}
      />
    </div>
  );
};

export default AdminUsers;
