import { Task } from "@/types/types";
import { TagBadge } from "../tags/tag-badge";
import { StatusBadge } from "./status-badge";
import { ShowDialog } from "./show-dialog";
import { EditDialog } from "./edit-dialog";
import { Calendar, AlertCircle } from "lucide-react";
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

  return (
    <div className="border rounded-md p-4 bg-background">
      <div className="pb-2 flex items-center">
        <ShowDialog task={task} />
        <EditDialog task={task} />
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
    </div>
  );
};
