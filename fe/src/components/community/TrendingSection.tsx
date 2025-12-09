import { useQuery } from '@tanstack/react-query';
import { 
  FireIcon, 
  HashtagIcon,
  ArrowTrendingUpIcon,
  EyeIcon,
  ChatBubbleLeftIcon
} from '@heroicons/react/24/outline';
import { getTrendingOverview } from '../../api/trending';
import { navigate } from '../../utils/navigation';

interface TrendingSectionProps {
  className?: string;
}

const TrendingSection = ({ className = '' }: TrendingSectionProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ['trending-overview'],
    queryFn: () => getTrendingOverview(5, 10, 7),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <aside className={`space-y-6 ${className}`}>
        {/* Skeleton */}
        <div className="bg-white/5 rounded-2xl p-5 animate-pulse">
          <div className="h-6 bg-white/10 rounded w-1/2 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-white/5 rounded" />
            ))}
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className={`space-y-6 ${className}`}>
      {/* Trending Hashtags */}
      <section className="bg-gradient-to-br from-white/5 to-white/[0.02] 
                        border border-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-rose-500 
                        flex items-center justify-center">
            <FireIcon className="w-4 h-4 text-white" />
          </div>
          <h2 className="font-semibold text-white">Trending</h2>
        </div>

        <div className="space-y-1">
          {data?.hashtags.slice(0, 8).map((tag, index) => (
            <button
              key={tag.id}
              onClick={() => navigate(`/community/hashtag/${tag.name}`)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                       hover:bg-white/5 transition-all group text-left"
            >
              <span className={`
                w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold
                ${index < 3 
                  ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white' 
                  : 'bg-white/10 text-slate-400'
                }
              `}>
                {index + 1}
              </span>
              
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white group-hover:text-emerald-400 
                            transition-colors truncate">
                  #{tag.name}
                </p>
                <p className="text-xs text-slate-500">
                  {tag.postCount} posts
                </p>
              </div>

              <ArrowTrendingUpIcon className="w-4 h-4 text-emerald-400 opacity-0 
                                            group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>

        <button
          onClick={() => navigate('/community/trending')}
          className="w-full mt-3 py-2 text-sm text-emerald-400 hover:text-emerald-300 
                   font-medium transition-colors"
        >
          View all →
        </button>
      </section>

      {/* Trending Posts */}
      <section className="bg-gradient-to-br from-white/5 to-white/[0.02] 
                        border border-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 
                        flex items-center justify-center">
            <ArrowTrendingUpIcon className="w-4 h-4 text-white" />
          </div>
          <h2 className="font-semibold text-white">Trending Posts</h2>
        </div>

        <div className="space-y-3">
          {data?.posts.slice(0, 5).map((post, index) => (
            <article
              key={post.id}
              onClick={() => navigate(`/community/post/${post.id}`)}
              className="group cursor-pointer"
            >
              <div className="flex items-start gap-3 p-2 -mx-2 rounded-xl 
                            hover:bg-white/5 transition-all">
                {/* Rank badge */}
                <span className={`
                  w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0
                  ${index === 0 
                    ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white' 
                    : index === 1
                    ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-slate-700'
                    : index === 2
                    ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white'
                    : 'bg-white/10 text-slate-400'
                  }
                `}>
                  {index + 1}
                </span>

                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-white line-clamp-2 
                               group-hover:text-emerald-400 transition-colors">
                    {post.title || post.content.slice(0, 60)}
                  </h3>
                  
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <EyeIcon className="w-3 h-3" />
                      {post.viewCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <ChatBubbleLeftIcon className="w-3 h-3" />
                      {post.commentsCount}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span>{post.authorName}</span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </aside>
  );
};

export default TrendingSection;

