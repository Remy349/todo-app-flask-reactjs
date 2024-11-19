import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { CreateTagDialog } from "./_components/tags/create-dialog";

export const DashboardHomePage = () => {
  return (
    <div>
      <div className="flex items-center gap-x-2">
        <CreateTagDialog />
        <Button size="sm" className="font-medium">
          <PlusCircle />
          Create new task
        </Button>
      </div>
    </div>
  );
};
