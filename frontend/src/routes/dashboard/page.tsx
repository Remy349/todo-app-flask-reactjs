import { TagsSection } from "./_components/tags/tags-section";

export const DashboardHomePage = () => {
  return (
    <div>
      <h1 className="font-bold text-center text-2xl mb-2 md:mb-4">
        Tags currently available
      </h1>
      <TagsSection />
    </div>
  );
};
