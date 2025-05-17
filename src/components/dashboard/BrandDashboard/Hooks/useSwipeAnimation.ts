import { useMotionValue, useTransform } from 'framer-motion';

export const useSwipeAnimation = (
  onLike: () => Promise<void>,
  onReject: () => void
) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const likeOpacity = useTransform(x, [0, 150], [0, 1]);
  const dislikeOpacity = useTransform(x, [-150, 0], [1, 0]);

  const handleDragEnd = async (event: any, info: any) => {
    const swipeThreshold = 100;

    if (Math.abs(info.offset.x) > swipeThreshold) {
      if (info.offset.x > swipeThreshold) {
        await onLike();
      } else if (info.offset.x < -swipeThreshold) {
        onReject();
      }
    } else {
      x.set(0, true);
    }
  };

  return { x, rotate, likeOpacity, dislikeOpacity, handleDragEnd };
};