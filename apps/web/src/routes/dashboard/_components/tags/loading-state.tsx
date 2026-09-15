import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_KEYS = Array.from(
  { length: 20 },
  (_, index) => `tag-skeleton-${index}`,
);

export const LoadingState = () => {
  return (
    <div className="flex flex-row flex-wrap gap-2 items-center md:justify-center">
      {SKELETON_KEYS.map((key) => (
        <Skeleton
          key={key}
          style={{ width: `${Math.random() * (10 - 6) + 6}rem` }}
          className="rounded-md border bg-background h-[2rem]"
        />
      ))}
    </div>
  );
};
