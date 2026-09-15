import { Task } from "@/types/types";
import { TagBadge } from "../tags/tag-badge";
import { StatusBadge } from "./status-badge";
import { ShowDialog } from "./show-dialog";
import { EditDialog } from "./edit-dialog";
import { DeleteDialog } from "./delete-dialog";
import { useToggleArchiveMutation } from "@/services/mutations/tasks";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Calendar, AlertCircle, Archive, ArchiveRestore } from "lucide-react";
import { cn } from "@/lib/utils";

interface IProps {
  task: Task;
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const isOverdue = (dateString: string, status: Task["status"]): boolean => {
  if (status === "TaskStatus.COMPLETED") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);
  return date < today;
};

const isToday = (dateString: string): boolean => {
  const today = new Date();
  const date = new Date(dateString);
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
};

export const TaskCard = ({ task }: IProps) => {
  const overdue = task.dueDate ? isOverdue(task.dueDate, task.status) : false;
  const today = task.dueDate ? isToday(task.dueDate) : false;
  const isCompleted = task.status === "TaskStatus.COMPLETED";

  const archiveMutation = useToggleArchiveMutation();
  const { token } = useAuthStore();

  const handleToggleArchive = async () => {
    try {
      await archiveMutation.mutateAsync({ token, taskId: task.id });
      toast.success(
        task.isArchived
          ? "Task restored from archive"
          : "Task moved to archive",
      );
    } catch (error) {
      toast.error("Failed to update archive status");
      console.error(error);
    }
  };

  return (
    <div className="border rounded-md p-4 bg-background">
      <div className="pb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <ShowDialog task={task} />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={handleToggleArchive}
            disabled={archiveMutation.isPending || (!task.isArchived && !isCompleted)}
            title={
              !task.isArchived && !isCompleted
                ? "Set status to Completed first"
                : task.isArchived
                ? "Restore from archive"
                : "Archive"
            }
          >
            {task.isArchived ? (
              <ArchiveRestore className="size-4" />
            ) : (
              <Archive className="size-4" />
            )}
          </Button>
          <EditDialog task={task} />
        </div>
      </div>
      <div className="flex items-center gap-x-1 mb-2">
        <TagBadge name={task.tagName} />
        <StatusBadge status={task.status} />
      </div>
      {task.dueDate && (
        <div
          className={cn(
            "flex items-center gap-1 text-sm",
            overdue ? "text-destructive" : today ? "text-primary" : "text-muted-foreground"
          )}
        >
          {overdue ? (
            <AlertCircle className="w-4 h-4" />
          ) : (
            <Calendar className="w-4 h-4" />
          )}
          <span>
            {overdue ? "逾期: " : today ? "今天: " : "截止: "}
            {formatDate(task.dueDate)}
          </span>
        </div>
      )}
      <div className="mt-3 flex justify-end">
        <DeleteDialog taskId={task.id} />
      </div>
    </div>
  );
};
