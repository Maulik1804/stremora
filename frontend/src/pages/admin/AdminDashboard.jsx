import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Users, Film, Eye, ShieldOff, Trash2 } from 'lucide-react';
import { adminService } from '../../services/admin.service';

const fmt = (n) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n/1_000).toFixed(1)}K` : String(n ?? 0);

const StatCard = ({ label, value, icon: Icon, color, loading }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
    className="bg-[#111] border border-white/6 rounded-2xl p-4 flex items-center gap-3"
  >
    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
      <Icon size={18} style={{ color }} />
    </div>
    <div className="min-w-0">
      {loading
        ? <><div className="h-6 w-14 bg-white/5 rounded animate-pulse mb-1" /><div className="h-3 w-16 bg-white/5 rounded animate-pulse" /></>
        : <><p className="text-xl font-bold text-[#e8e8e8] truncate">{fmt(value)}</p><p className="text-[11px] text-[#555] mt-0.5 truncate">{label}</p></>
      }
    </div>
  </motion.div>
);

const AdminDashboard = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminService.getStats().then((r) => r.data.data),
  });

  const stats = [
    { label: 'Total Users',     value: data?.totalUsers,     icon: Users,    color: '#6366f1' },
    { label: 'Total Videos',    value: data?.totalVideos,    icon: Film,     color: '#e50914' },
    { label: 'Total Views',     value: data?.totalViews,     icon: Eye,      color: '#10b981' },
    { label: 'Suspended Users', value: data?.suspendedUsers, icon: ShieldOff,color: '#f59e0b' },
    { label: 'Deleted Videos',  value: data?.deletedVideos,  icon: Trash2,   color: '#ef4444' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#e8e8e8]">Dashboard</h1>
        <p className="text-sm text-[#555] mt-0.5">Platform overview</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} transition={{ delay: i * 0.05 }}>
            <StatCard {...s} loading={isLoading} />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
