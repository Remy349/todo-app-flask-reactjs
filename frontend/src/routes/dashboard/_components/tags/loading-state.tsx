import { Skeleton } from "@/components/ui/skeleton";

export const LoadingState = () => {
  return (
    <div className="flex flex-row flex-wrap gap-2 items-center md:justify-center">
      {[...Array(20)].map((_, index) => (
        <Skeleton
          key={index}
          style={{ width: `${Math.random() * (10 - 6) + 6}rem` }}
          className="rounded-md border bg-background h-[2rem]"
        />
      ))}
    </div>
  );
};
