import { CreateDialog } from "./create-dialog";

export const EmptyState = () => {
  return (
    <div className="flex items-center flex-col justify-center text-center border border-dashed rounded-md w-full h-[12rem] md:max-w-xl md:mx-auto">
      <h1 className="font-semibold">No tasks have been added yet</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Add some to get started
      </p>
      <CreateDialog />
    </div>
  );
};
