import { useQuery } from '@tanstack/react-query';
import { getPublicProfile, PublicUserProfile } from '../../api/users';
import { format } from 'date-fns';
import FollowButton from './FollowButton';

interface PublicProfileViewProps {
  userId: number;
  onClose?: () => void;
}

const PublicProfileView = ({ userId, onClose }: PublicProfileViewProps) => {
  const { data: profile, isLoading } = useQuery<PublicUserProfile>({
    queryKey: ['public-profile', userId],
    queryFn: () => getPublicProfile(userId)
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-8 animate-pulse">
        <div className="h-8 bg-white/10 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-white/10 rounded w-2/3"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-8 text-center">
        <p className="text-slate-400">User not found</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-6">
      {onClose && (
        <button
          onClick={onClose}
          className="mb-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      <div className="flex items-start gap-4 mb-6">
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt={profile.displayName}
            className="w-20 h-20 rounded-full object-cover border-2 border-emerald-400/30"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-emerald-400 flex items-center justify-center text-2xl font-bold text-slate-900">
            {profile.displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-2xl font-bold text-white">{profile.displayName}</h2>
            <FollowButton userId={profile.id} />
          </div>
          {profile.bio && <p className="text-slate-400 mb-2">{profile.bio}</p>}
          <p className="text-xs text-slate-500">
            Member since {format(new Date(profile.createdAt), 'MMMM yyyy')}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6 p-4 rounded-lg bg-white/5">
        <div>
          <p className="text-xs text-slate-400 mb-1">Posts</p>
          <p className="text-lg font-semibold text-white">{profile.stats.postsCount}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-1">Comments</p>
          <p className="text-lg font-semibold text-white">{profile.stats.commentsCount}</p>
        </div>
      </div>

      {/* Social Links */}
      {profile.socialLinks && Object.keys(profile.socialLinks).length > 0 && (
        <div>
          <p className="text-sm font-medium text-slate-300 mb-2">Links</p>
          <div className="flex gap-2">
            {profile.socialLinks.twitter && (
              <a
                href={profile.socialLinks.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-slate-300 transition"
              >
                Twitter
              </a>
            )}
            {profile.socialLinks.github && (
              <a
                href={profile.socialLinks.github}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-slate-300 transition"
              >
                GitHub
              </a>
            )}
            {profile.socialLinks.website && (
              <a
                href={profile.socialLinks.website}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-slate-300 transition"
              >
                Website
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicProfileView;

