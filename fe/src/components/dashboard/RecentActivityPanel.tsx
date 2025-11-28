import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth';
import { getRecentActivity, Activity } from '../../api/activity';
import { formatDistanceToNow } from 'date-fns';

const RecentActivityPanel = () => {
  const { isAuthenticated } = useAuthStore();

  const { data: activities, isLoading } = useQuery<Activity[]>({
    queryKey: ['recent-activity'],
    queryFn: () => getRecentActivity({ limit: 10 }),
    enabled: isAuthenticated,
    refetchInterval: 60_000
  });

  if (!isAuthenticated) {
    return null;
  }

  const getActivityIcon = (type: Activity['type']) => {
    const iconClass = "w-4 h-4";
    switch (type) {
      case 'post':
        return <DocumentTextIcon className={iconClass} />;
      case 'comment':
        return <ChatBubbleLeftRightIcon className={iconClass} />;
      case 'watchlist':
        return <StarIcon className={iconClass} />;
      case 'alert':
        return <BellIcon className={iconClass} />;
      default:
        return <BookmarkIcon className={iconClass} />;
    }
  };

  const handleActivityClick = (activity: Activity) => {
    const { navigate } = require('../../utils/navigation');
    if (activity.metadata?.postId) {
      navigate(`/posts/${activity.metadata.postId}`);
    } else if (activity.metadata?.symbol) {
      navigate(`/coin/${activity.metadata.symbol}`);
    } else if (activity.metadata?.alertId) {
      navigate('/alerts');
    }
  };

  return (
    <section className="rounded-3xl border border-white/5 bg-slate-900/60 p-5 shadow-2xl shadow-black/50">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Activity</p>
        <h3 className="text-xl font-semibold text-white">Recent Activity</h3>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-white/5" />
          ))}
        </div>
      ) : activities && activities.length > 0 ? (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {activities.map((activity) => (
            <button
              key={`${activity.type}-${activity.id}`}
              onClick={() => handleActivityClick(activity)}
              className="flex w-full items-start gap-3 rounded-xl border border-white/5 bg-white/5 p-3 text-left transition hover:border-emerald-300 hover:bg-white/10"
            >
              <span className="flex-shrink-0">{getActivityIcon(activity.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{activity.title}</p>
                {activity.description && (
                  <p className="text-xs text-slate-400 line-clamp-1">{activity.description}</p>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                </p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500 text-center py-4">No recent activity</p>
      )}
    </section>
  );
};

export default RecentActivityPanel;

