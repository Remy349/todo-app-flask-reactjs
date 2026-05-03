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
import { Button } from "@/components/ui/button";
import { useToggleArchiveMutation } from "@/services/mutations/tasks";
import { useAuthStore } from "@/stores/auth-store";
import { Archive, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";

interface IProps {
  task: Task;
}
export const ShowDialog = ({ task }: IProps) => {
  const mutation = useToggleArchiveMutation();
  const { token } = useAuthStore();

  const handleToggleArchive = async () => {
    await mutation.mutateAsync({ token, taskId: task.id });
    toast.success(
      task.isArchived
        ? "Task restored from archive"
        : "Task moved to archive",
    );
  };

  const isCompleted = task.status === "TaskStatus.COMPLETED";

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
              {task.isArchived && (
                <div className="px-3 py-2 rounded-md bg-muted">
                  <p className="text-xs font-medium">Archived</p>
                </div>
              )}
            </div>
          </div>
          <DialogDescription>{task.content}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-between items-center mt-6">
          {task.isArchived ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleArchive}
              disabled={mutation.isPending}
            >
              <ArchiveRestore className="mr-2 h-4 w-4" />
              Restore
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleArchive}
              disabled={mutation.isPending || !isCompleted}
            >
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </Button>
          )}
          <DeleteDialog taskId={task.id} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
