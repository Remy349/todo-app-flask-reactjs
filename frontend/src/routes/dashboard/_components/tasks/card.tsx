import { Task } from "@/types/types";
import { TagBadge } from "../tags/tag-badge";
import { StatusBadge } from "./status-badge";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { ShowDialog } from "./show-dialog";

interface IProps {
  task: Task;
}

export const TaskCard = ({ task }: IProps) => {
  return (
    <div className="border rounded-md p-4 bg-background">
      <div className="pb-2 flex items-center">
        <ShowDialog task={task} />
        <Button className="size-8 ml-auto" variant="ghost" size="icon">
          <Pencil className="size-4" />
        </Button>
      </div>
      <div className="flex items-center gap-x-1">
        <TagBadge name={task.tagName} />
        <StatusBadge status={task.status} />
      </div>
    </div>
  );
};
