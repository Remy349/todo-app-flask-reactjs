import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Task } from "@/types/types";
import { TagBadge } from "../tags/tag-badge";
import { StatusBadge } from "./status-badge";
import { DeleteDialog } from "./delete-dialog";

interface IProps {
  task: Task;
}
export const ShowDialog = ({ task }: IProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <h3 className="font-semibold line-clamp-1 text-sm md:cursor-pointer md:hover:underline">
          {task.title}
        </h3>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader className="space-y-4">
          <div>
            <DialogTitle className="text-base mb-2">{task.title}</DialogTitle>
            <div className="flex items-center gap-x-1">
              <TagBadge name={task.tagName} />
              <StatusBadge status={task.status} />
            </div>
          </div>
          <DialogDescription>{task.content}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end mt-6">
          <DeleteDialog taskId={task.id} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
