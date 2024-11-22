import { useGetTagsQuery } from "@/services/queries/tags";
import { TagBadge } from "./tag-badge";
import { LoadingState } from "./loading-state";

export const TagsSection = () => {
  const { data: tags = [], isLoading } = useGetTagsQuery();

  if (isLoading) return <LoadingState />;

  return (
    <div className="flex flex-row flex-wrap gap-2 items-center md:justify-center">
      {tags.map((tag) => (
        <TagBadge key={tag.id} name={tag.name} />
      ))}
    </div>
  );
};
