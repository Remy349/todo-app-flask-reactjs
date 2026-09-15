import { Tag } from "lucide-react";

interface IProps {
  name: string;
}

export const TagBadge = ({ name }: IProps) => {
  return (
    <div className="flex items-center border px-3 py-2 bg-background rounded-md">
      <Tag className="size-4 mr-2" />
      <p className="text-xs font-medium">{name}</p>
    </div>
  );
};
