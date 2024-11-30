import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil } from "lucide-react";
import { EditForm } from "./edit-form";
import { Task } from "@/types/types";

interface IProps {
  task: Task;
}

export const EditDialog = ({ task }: IProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="size-8 ml-auto" variant="ghost" size="icon">
          <Pencil className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="md:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit a task</DialogTitle>
          <DialogDescription>
            Make changes to your task effortlessly. Edit priorities, deadlines,
            or descriptions to keep everything on track.
          </DialogDescription>
        </DialogHeader>
        <EditForm task={task} />
      </DialogContent>
    </Dialog>
  );
};
