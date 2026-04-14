import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, Plus, X, CheckCircle2, Clock, Trash2, Trophy, AlertCircle,
} from 'lucide-react';
import { goalService } from '../services/goal.service';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { toast } from '../components/ui/Toast';

// ── Create goal modal ─────────────────────────────────────────────────────────
const CreateGoalModal = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ title: '', targetVideos: 10, endDate: '' });

  const mutation = useMutation({
    mutationFn: () => goalService.create({
      title: form.title.trim(),
      targetVideos: Number(form.targetVideos),
      endDate: form.endDate,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['active-goal'] });
      toast.success('Goal created!');
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create goal'),
  });

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  const valid = form.title.trim() && form.targetVideos >= 1 && form.endDate;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 12 }}
        transition={{ duration: 0.15 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#1a1a1a] border border-[#3f3f3f] rounded-2xl p-6 w-full max-w-sm"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-[#3ea6ff]" />
            <h3 className="text-base font-semibold text-[#f1f1f1]">New Goal</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-[#272727] text-[#aaaaaa]">
            <X size={15} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-[#aaaaaa] mb-1.5 block">Goal title</label>
            <input
              autoFocus
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Learn React in 7 days"
              maxLength={150}
              className="w-full bg-[#0f0f0f] border border-[#3f3f3f] rounded-xl px-4 py-3 text-sm text-[#f1f1f1] outline-none focus:border-[#606060] placeholder:text-[#606060]"
            />
          </div>

          <div>
            <label className="text-xs text-[#aaaaaa] mb-1.5 block">Target videos</label>
            <input
              type="number"
              min={1}
              max={10000}
              value={form.targetVideos}
              onChange={(e) => setForm((f) => ({ ...f, targetVideos: e.target.value }))}
              className="w-full bg-[#0f0f0f] border border-[#3f3f3f] rounded-xl px-4 py-3 text-sm text-[#f1f1f1] outline-none focus:border-[#606060]"
            />
          </div>

          <div>
            <label className="text-xs text-[#aaaaaa] mb-1.5 block">Deadline</label>
            <input
              type="date"
              min={minDateStr}
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              className="w-full bg-[#0f0f0f] border border-[#3f3f3f] rounded-xl px-4 py-3 text-sm text-[#f1f1f1] outline-none focus:border-[#606060]"
            />
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => valid && mutation.mutate()}
            disabled={!valid}
            loading={mutation.isPending}
            className="w-full rounded-xl"
          >
            Create Goal
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Goal card ─────────────────────────────────────────────────────────────────
const GoalCard = ({ goal }) => {
  const queryClient = useQueryClient();

  const pct = Math.min(Math.round((goal.completedVideos / goal.targetVideos) * 100), 100);
  const remaining = goal.targetVideos - goal.completedVideos;
  const daysLeft = Math.max(0, Math.ceil((new Date(goal.endDate) - new Date()) / (1000 * 60 * 60 * 24)));
  const isActive = goal.status === 'active';
  const isCompleted = goal.status === 'completed';
  const isExpired = goal.status === 'expired';

  const completeMutation = useMutation({
    mutationFn: () => goalService.complete(goal._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['active-goal'] });
      toast.success('Goal completed! 🎉');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => goalService.delete(goal._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['active-goal'] });
    },
    onError: () => toast.error('Failed to delete goal'),
  });

  const statusColor = isCompleted
    ? 'border-green-500/30 bg-green-500/5'
    : isExpired
      ? 'border-red-500/20 bg-red-500/5'
      : 'border-[#2a2a2a] bg-[#1a1a1a]';

  const barColor = isCompleted ? 'bg-green-500' : isExpired ? 'bg-red-400' : 'bg-[#3ea6ff]';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border rounded-2xl p-5 ${statusColor}`}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0
            ${isCompleted ? 'bg-green-500/20' : isExpired ? 'bg-red-500/20' : 'bg-[#3ea6ff]/10'}`}>
            {isCompleted
              ? <Trophy size={15} className="text-green-400" />
              : isExpired
                ? <AlertCircle size={15} className="text-red-400" />
                : <Target size={15} className="text-[#3ea6ff]" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#f1f1f1] truncate">{goal.title}</p>
            <p className="text-xs text-[#606060] capitalize">{goal.status}</p>
          </div>
        </div>
        <button
          onClick={() => deleteMutation.mutate()}
          disabled={deleteMutation.isPending}
          className="p-1.5 rounded-lg hover:bg-red-900/30 text-[#606060] hover:text-red-400 transition-colors flex-shrink-0"
          aria-label="Delete goal"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-[#aaaaaa]">
            {goal.completedVideos} / {goal.targetVideos} videos
          </span>
          <span className={`text-xs font-bold ${isCompleted ? 'text-green-400' : 'text-[#3ea6ff]'}`}>
            {pct}%
          </span>
        </div>
        <div className="w-full bg-[#272727] rounded-full h-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className={`h-2 rounded-full ${barColor}`}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-[#606060]">
        {isActive && (
          <>
            <span className="flex items-center gap-1">
              <Target size={11} />
              {remaining} remaining
            </span>
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
            </span>
          </>
        )}
        {isCompleted && (
          <span className="flex items-center gap-1 text-green-400">
            <CheckCircle2 size={11} />
            Completed
          </span>
        )}
        {isExpired && (
          <span className="flex items-center gap-1 text-red-400">
            <AlertCircle size={11} />
            Expired — {goal.completedVideos}/{goal.targetVideos} done
          </span>
        )}
      </div>

      {/* Mark complete button */}
      {isActive && pct >= 100 && (
        <Button
          variant="primary"
          size="sm"
          onClick={() => completeMutation.mutate()}
          loading={completeMutation.isPending}
          className="mt-3 w-full rounded-xl bg-green-600 hover:bg-green-500"
        >
          <CheckCircle2 size={13} />
          Mark as Completed
        </Button>
      )}
    </motion.div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────
const Goals = () => {
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: () => goalService.getGoals().then((r) => r.data.data.goals),
    staleTime: 30_000,
  });

  const goals = data ?? [];
  const active = goals.filter((g) => g.status === 'active');
  const completed = goals.filter((g) => g.status === 'completed');
  const expired = goals.filter((g) => g.status === 'expired');

  return (
    <>
      <AnimatePresence>
        {showCreate && <CreateGoalModal onClose={() => setShowCreate(false)} />}
      </AnimatePresence>

      <div className="px-4 py-6 max-w-screen-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#3ea6ff]/10 flex items-center justify-center">
              <Target size={18} className="text-[#3ea6ff]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#f1f1f1]">Watching Goals</h1>
              <p className="text-xs text-[#606060]">Track your learning progress</p>
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
            <Plus size={14} />
            New Goal
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : goals.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <Target size={40} className="text-[#606060]" />
            <p className="text-[#f1f1f1] font-medium">No goals yet</p>
            <p className="text-sm text-[#aaaaaa]">Set a watching goal to track your learning progress</p>
            <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
              <Plus size={14} />
              Create your first goal
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {active.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-[#aaaaaa] uppercase tracking-wider mb-3">
                  Active ({active.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {active.map((g) => <GoalCard key={g._id} goal={g} />)}
                </div>
              </section>
            )}

            {completed.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-[#aaaaaa] uppercase tracking-wider mb-3">
                  Completed ({completed.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {completed.map((g) => <GoalCard key={g._id} goal={g} />)}
                </div>
              </section>
            )}

            {expired.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-[#aaaaaa] uppercase tracking-wider mb-3">
                  Expired ({expired.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {expired.map((g) => <GoalCard key={g._id} goal={g} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default Goals;
