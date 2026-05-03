import { Task } from "@/types/types";
import { TagBadge } from "../tags/tag-badge";
import { StatusBadge } from "./status-badge";
import { ShowDialog } from "./show-dialog";
import { EditDialog } from "./edit-dialog";
import { DeleteDialog } from "./delete-dialog";

interface IProps {
  task: Task;
}

export const TaskCard = ({ task }: IProps) => {
  return (
    <div className="border rounded-md p-4 bg-background">
      <div className="pb-2 flex items-center justify-between gap-2">
        <ShowDialog task={task} />
        <div className="flex items-center gap-2">
          <EditDialog task={task} />
          <DeleteDialog taskId={task.id} />
        </div>
      </div>
      <div className="flex items-center gap-x-1">
        <TagBadge name={task.tagName} />
        <StatusBadge status={task.status} />
      </div>
    </div>
  );
};
