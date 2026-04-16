import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Search, Film, Trash2, User, Calendar, Clock, ShieldCheck } from 'lucide-react';
import { adminService } from '../../services/admin.service';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  : '—';

const fmtDateTime = (d) => d
  ? new Date(d).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  : '—';

// ── Single deleted video card ─────────────────────────────────────────────────
const DeletedVideoCard = ({ video, deletedByAdmin }) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-[#111] border border-white/6 rounded-xl overflow-hidden flex gap-0"
  >
    {/* Red left accent */}
    <div className={`w-1 flex-shrink-0 ${deletedByAdmin ? 'bg-red-500/60' : 'bg-orange-500/40'}`} />

    <div className="flex items-start gap-3 p-3 flex-1 min-w-0">
      {/* Thumbnail */}
      <div className="w-16 h-10 rounded-lg overflow-hidden bg-white/5 flex-shrink-0 relative">
        {video.thumbnailUrl
          ? <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover opacity-40" />
          : <div className="w-full h-full flex items-center justify-center"><Film size={12} className="text-[#333]" /></div>
        }
        <div className="absolute inset-0 flex items-center justify-center">
          <Trash2 size={10} className={deletedByAdmin ? 'text-red-400' : 'text-orange-400'} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#666] line-through truncate">{video.title}</p>

        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
          {/* Uploader */}
          {video.owner && (
            <div className="flex items-center gap-1 text-[11px] text-[#555]">
              <User size={10} />
              <Avatar src={video.owner.avatar} alt={video.owner.displayName} size="xs" />
              <span>{video.owner.displayName || video.owner.username}</span>
            </div>
          )}

          {/* Deleted by */}
          <div className={`flex items-center gap-1 text-[11px] ${deletedByAdmin ? 'text-red-400/70' : 'text-orange-400/70'}`}>
            {deletedByAdmin
              ? <><ShieldCheck size={10} /><span>Admin</span></>
              : <><User size={10} /><span>User</span></>
            }
          </div>

          {/* Upload date */}
          <div className="flex items-center gap-1 text-[11px] text-[#444]">
            <Calendar size={10} />
            <span>{fmtDate(video.createdAt)}</span>
          </div>

          {/* Deletion date */}
          <div className={`flex items-center gap-1 text-[11px] ${deletedByAdmin ? 'text-red-400/60' : 'text-orange-400/60'}`}>
            <Clock size={10} />
            <span>{fmtDateTime(video.deletedAt || video.updatedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  </motion.div>
);

// ── Section ───────────────────────────────────────────────────────────────────
const Section = ({ title, icon: Icon, iconColor, count, videos, deletedByAdmin, emptyText }) => (
  <div className="mb-8">
    <div className="flex items-center gap-2.5 mb-3">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center`}
        style={{ background: `${iconColor}18` }}>
        <Icon size={14} style={{ color: iconColor }} />
      </div>
      <h2 className="text-sm font-semibold text-[#e8e8e8]">{title}</h2>
      <span className="ml-auto text-xs text-[#555] bg-white/5 px-2 py-0.5 rounded-full">{count}</span>
    </div>

    {videos.length === 0 ? (
      <div className="bg-[#111] border border-white/5 rounded-xl py-8 text-center">
        <p className="text-sm text-[#444]">{emptyText}</p>
      </div>
    ) : (
      <div className="flex flex-col gap-2">
        {videos.map((v) => (
          <DeletedVideoCard key={v._id} video={v} deletedByAdmin={deletedByAdmin} />
        ))}
      </div>
    )}
  </div>
);

// ── Page ──────────────────────────────────────────────────────────────────────
const AdminDeletedVideos = () => {
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'deleted-videos', search],
    queryFn: () => adminService.getDeletedVideos({ search: search || undefined }).then((r) => r.data.data),
  });

  const allVideos = data?.videos ?? [];

  // Split into two groups
  const deletedByAdmin = allVideos.filter((v) => v.deletedBy !== null && v.deletedBy !== undefined);
  const deletedByUser  = allVideos.filter((v) => !v.deletedBy);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-[#e8e8e8]">Deleted Videos</h1>
          <p className="text-sm text-[#555] mt-0.5">
            {isLoading ? '…' : `${allVideos.length} total · ${deletedByAdmin.length} by admin · ${deletedByUser.length} by users`}
          </p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); }} className="flex gap-2">
          <div className="relative flex-1 sm:flex-none">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by title…"
              className="bg-[#111] border border-white/8 rounded-xl pl-9 pr-4 py-2 text-sm text-[#e8e8e8] placeholder-[#444] focus:outline-none focus:border-white/20 w-full sm:w-48"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">Search</Button>
          {search && (
            <Button type="button" variant="ghost" size="sm" onClick={() => { setSearch(''); setSearchInput(''); }}>
              Clear
            </Button>
          )}
        </form>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-[#111] border border-white/6 rounded-xl p-3 animate-pulse flex gap-3">
              <div className="w-16 h-10 rounded-lg bg-white/5 flex-shrink-0" />
              <div className="flex-1">
                <div className="h-4 w-3/4 bg-white/5 rounded mb-2" />
                <div className="h-3 w-1/2 bg-white/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : allVideos.length === 0 && !search ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/4 flex items-center justify-center">
            <Trash2 size={24} className="text-[#333]" />
          </div>
          <p className="text-[#555] text-sm">No deleted videos yet</p>
          <p className="text-[#333] text-xs">Videos removed by admin or users will appear here</p>
        </div>
      ) : (
        <>
          {/* Deleted by Admin */}
          <Section
            title="Deleted by Admin"
            icon={ShieldCheck}
            iconColor="#e50914"
            count={deletedByAdmin.length}
            videos={deletedByAdmin}
            deletedByAdmin={true}
            emptyText="No videos deleted by admin"
          />

          {/* Deleted by User */}
          <Section
            title="Deleted by User"
            icon={User}
            iconColor="#f59e0b"
            count={deletedByUser.length}
            videos={deletedByUser}
            deletedByAdmin={false}
            emptyText="No videos deleted by users"
          />
        </>
      )}
    </div>
  );
};

export default AdminDeletedVideos;
