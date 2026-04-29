import { useState } from "react";
import { useGetTasksOnUserQuery } from "@/services/queries/tasks";
import { EmptyState } from "./empty-state";
import { CreateDialog } from "./create-dialog";
import { TaskCard } from "./card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Task } from "@/types/types";

type FilterType = "all" | "today" | "overdue";

const isToday = (dateString: string): boolean => {
  const today = new Date();
  const date = new Date(dateString);
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
};

const isOverdue = (dateString: string, status: Task["status"]): boolean => {
  if (status === "TaskStatus.COMPLETED") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);
  return date < today;
};

const filterTasks = (tasks: Task[], filter: FilterType): Task[] => {
  return tasks.filter((task) => {
    if (filter === "all") return true;
    if (!task.dueDate) return false;
    if (filter === "today") return isToday(task.dueDate);
    if (filter === "overdue") return isOverdue(task.dueDate, task.status);
    return true;
  });
};

export const TasksSection = () => {
  const { data: tasks = [] } = useGetTasksOnUserQuery();
  const [filter, setFilter] = useState<FilterType>("all");
  const filteredTasks = filterTasks(tasks, filter);

  return (
    <div>
      <div className="flex justify-center mb-4 md:mb-6 lg:mb-8">
        <CreateDialog />
      </div>
      <div className="flex justify-center mb-4">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as FilterType)}>
          <TabsList>
            <TabsTrigger value="all">全部</TabsTrigger>
            <TabsTrigger value="today">今天</TabsTrigger>
            <TabsTrigger value="overdue">逾期</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {filteredTasks.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
};
