import { TagsSection } from "./_components/tags/section";
import { TasksSection } from "./_components/tasks/section";

export const DashboardHomePage = () => {
  return (
    <div>
      <h1 className="font-bold text-center text-2xl mb-2 md:mb-4">
        Tags currently available
      </h1>
      <div className="mb-4 md:mb-6 lg:mb-8">
        <TagsSection />
      </div>
      <TasksSection />
    </div>
  );
};
