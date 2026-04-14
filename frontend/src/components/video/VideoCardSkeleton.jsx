const VideoCardSkeleton = ({ horizontal = false }) => {
  if (horizontal) {
    return (
      <div className="flex gap-3">
        <div className="skeleton w-40 aspect-video rounded-xl flex-shrink-0" />
        <div className="flex flex-col gap-2.5 flex-1 py-1">
          <div className="skeleton h-3 w-full rounded-full" />
          <div className="skeleton h-3 w-4/5 rounded-full" />
          <div className="skeleton h-2.5 w-1/2 rounded-full mt-1" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="skeleton aspect-video rounded-2xl" />
      <div className="flex gap-3">
        <div className="skeleton w-9 h-9 rounded-full flex-shrink-0" />
        <div className="flex flex-col gap-2 flex-1 pt-0.5">
          <div className="skeleton h-3.5 w-full rounded-full" />
          <div className="skeleton h-3 w-3/4 rounded-full" />
          <div className="skeleton h-2.5 w-1/2 rounded-full" />
        </div>
      </div>
    </div>
  );
};

export default VideoCardSkeleton;
