import { Task } from "@/types/types";
import { TagBadge } from "../tags/tag-badge";
import { StatusBadge } from "./status-badge";
import { ShowDialog } from "./show-dialog";
import { EditDialog } from "./edit-dialog";

interface IProps {
  task: Task;
}

export const TaskCard = ({ task }: IProps) => {
  return (
    <div className="border rounded-md p-4 bg-background">
      <div className="pb-2 flex items-center">
        <ShowDialog task={task} />
        <EditDialog task={task} />
      </div>
      <div className="flex items-center gap-x-1">
        <TagBadge name={task.tagName} />
        <StatusBadge status={task.status} />
      </div>
    </div>
  );
};
