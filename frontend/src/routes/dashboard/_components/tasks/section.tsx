import { useGetTasksOnUserQuery } from "@/services/queries/tasks";
import { EmptyState } from "./empty-state";
import { CreateDialog } from "./create-dialog";
import { TaskCard } from "./card";

export const TasksSection = () => {
  const { data: tasks = [] } = useGetTasksOnUserQuery();

  return (
    <div>
      {tasks.length === 0 ? (
        <EmptyState />
      ) : (
        <div>
          <div className="flex justify-center mb-4 md:mb-6 lg:mb-8">
            <CreateDialog />
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
