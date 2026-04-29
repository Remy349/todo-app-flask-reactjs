import { ArchivedTasksSection } from "../_components/archived/section";

export const ArchivedPage = () => {
  return (
    <div>
      <h1 className="font-bold text-center text-2xl mb-4 md:mb-6">
        Archived Tasks
      </h1>
      <ArchivedTasksSection />
    </div>
  );
};
