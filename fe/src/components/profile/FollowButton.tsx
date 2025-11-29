import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth';
import { followUser, unfollowUser, checkFollowStatus, FollowStatus } from '../../api/follow';

interface FollowButtonProps {
  userId: number;
  onStatusChange?: (status: FollowStatus) => void;
}

const FollowButton = ({ userId, onStatusChange }: FollowButtonProps) => {
  const { isAuthenticated, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);

  // Check if current user is viewing their own profile
  const isOwnProfile = isAuthenticated && user?.id === userId;

  // Get follow status
  const { data: followStatus } = useQuery<FollowStatus>({
    queryKey: ['follow-status', userId],
    queryFn: () => checkFollowStatus(userId),
    enabled: isAuthenticated && !isOwnProfile
  });

  // Update local state when query data changes (replaces deprecated onSuccess)
  useEffect(() => {
    if (followStatus) {
      setIsFollowing(followStatus.isFollowing);
    }
  }, [followStatus]);

  const followMutation = useMutation({
    mutationFn: () => followUser(userId),
    onSuccess: (data) => {
      setIsFollowing(true);
      queryClient.invalidateQueries({ queryKey: ['follow-status', userId] });
      queryClient.invalidateQueries({ queryKey: ['public-profile', userId] });
      onStatusChange?.(data);
    }
  });

  const unfollowMutation = useMutation({
    mutationFn: () => unfollowUser(userId),
    onSuccess: (data) => {
      setIsFollowing(false);
      queryClient.invalidateQueries({ queryKey: ['follow-status', userId] });
      queryClient.invalidateQueries({ queryKey: ['public-profile', userId] });
      onStatusChange?.(data);
    }
  });

  if (!isAuthenticated || isOwnProfile) {
    return null;
  }

  const currentIsFollowing = isFollowing ?? followStatus?.isFollowing ?? false;

  return (
    <button
      onClick={() => {
        if (currentIsFollowing) {
          unfollowMutation.mutate();
        } else {
          followMutation.mutate();
        }
      }}
      disabled={followMutation.isPending || unfollowMutation.isPending}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
        currentIsFollowing
          ? 'border border-white/20 bg-white/5 text-white hover:bg-white/10'
          : 'bg-emerald-400 text-slate-900 hover:bg-emerald-300'
      } disabled:opacity-50`}
    >
      {followMutation.isPending || unfollowMutation.isPending
        ? '...'
        : currentIsFollowing
        ? 'Following'
        : 'Follow'}
    </button>
  );
};

export default FollowButton;

