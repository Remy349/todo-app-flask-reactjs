import { useGetArchivedTasksOnUserQuery } from "@/services/queries/tasks";
import { TaskCard } from "../tasks/card";

export const ArchivedEmptyState = () => {
  return (
    <div className="flex items-center flex-col justify-center text-center border border-dashed rounded-md w-full h-[12rem] md:max-w-xl md:mx-auto">
      <h1 className="font-semibold">No archived tasks</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Completed tasks will appear here after you archive them
      </p>
    </div>
  );
};

export const ArchivedTasksSection = () => {
  const { data: tasks = [] } = useGetArchivedTasksOnUserQuery();

  return (
    <div>
      {tasks.length === 0 ? (
        <ArchivedEmptyState />
      ) : (
        <div>
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
