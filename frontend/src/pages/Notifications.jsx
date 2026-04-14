import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, CheckCheck, PlaySquare, MessageSquare, Users, Heart, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import Spinner from '../components/ui/Spinner';
import Button from '../components/ui/Button';
import { engagementService } from '../services/engagement.service';
import { formatDistanceToNow } from '../utils/date';

const TYPE_META = {
  new_video:          { icon: PlaySquare,    color: 'text-[#ff0000]',    bg: 'bg-[#ff0000]/10' },
  new_comment:        { icon: MessageSquare, color: 'text-[#3ea6ff]',    bg: 'bg-[#3ea6ff]/10' },
  new_reply:          { icon: MessageSquare, color: 'text-[#3ea6ff]',    bg: 'bg-[#3ea6ff]/10' },
  new_subscriber:     { icon: Users,         color: 'text-green-400',    bg: 'bg-green-900/20' },
  membership_purchase:{ icon: Star,          color: 'text-yellow-400',   bg: 'bg-yellow-900/20' },
};

const NotificationItem = ({ notification, onRead }) => {
  const meta = TYPE_META[notification.type] ?? { icon: Bell, color: 'text-[#aaaaaa]', bg: 'bg-[#272727]' };
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.18 }}
      onClick={() => !notification.isRead && onRead(notification._id)}
      className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-colors
        ${notification.isRead
          ? 'border-[#2a2a2a] bg-[#141414] hover:bg-[#1a1a1a]'
          : 'border-[#3ea6ff]/20 bg-[#1a1a1a] hover:bg-[#272727]'}`}
    >
      {/* Icon */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
        <Icon size={16} className={meta.color} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${notification.isRead ? 'text-[#aaaaaa]' : 'text-[#f1f1f1]'}`}>
          {notification.message}
        </p>
        <p className="text-xs text-[#606060] mt-1">
          {formatDistanceToNow(notification.createdAt)}
        </p>
      </div>

      {/* Unread dot */}
      {!notification.isRead && (
        <div className="w-2 h-2 rounded-full bg-[#3ea6ff] flex-shrink-0 mt-1.5" />
      )}
    </motion.div>
  );
};

const Notifications = () => {
  const queryClient = useQueryClient();
  const loaderRef = useRef(null);

  const {
    data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading,
  } = useInfiniteQuery({
    queryKey: ['notifications'],
    queryFn: ({ pageParam }) =>
      engagementService.getNotifications(pageParam).then((r) => r.data.data),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 30_000,
  });

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasNextPage) fetchNextPage(); },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, fetchNextPage]);

  const markReadMutation = useMutation({
    mutationFn: (id) => engagementService.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => engagementService.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications = data?.pages.flatMap((p) => p.notifications) ?? [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#272727] flex items-center justify-center">
            <Bell size={18} className="text-[#f1f1f1]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#f1f1f1]">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-xs text-[#aaaaaa]">{unreadCount} unread</p>
            )}
          </div>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => markAllMutation.mutate()}
            loading={markAllMutation.isPending}
          >
            <CheckCheck size={14} />
            Mark all read
          </Button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 p-4 bg-[#1a1a1a] rounded-xl">
              <div className="w-9 h-9 rounded-xl bg-[#272727] animate-pulse flex-shrink-0" />
              <div className="flex-1 flex flex-col gap-2">
                <div className="h-3 bg-[#272727] rounded animate-pulse w-full" />
                <div className="h-3 bg-[#272727] rounded animate-pulse w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Bell size={40} className="text-[#606060]" />
          <p className="text-[#f1f1f1] font-medium">No notifications yet</p>
          <p className="text-sm text-[#aaaaaa]">
            Subscribe to channels to get notified about new videos
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map((n) => (
            <NotificationItem
              key={n._id}
              notification={n}
              onRead={(id) => markReadMutation.mutate(id)}
            />
          ))}
        </div>
      )}

      <div ref={loaderRef} className="flex justify-center py-6">
        {isFetchingNextPage && <Spinner />}
      </div>
    </div>
  );
};

export default Notifications;
