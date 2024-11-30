import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { EditFormSchema, TEditFormSchema } from "@/schemas/task-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth-store";
import { Status, Task } from "@/types/types";
import { useUpdateTaskMutation } from "@/services/mutations/tasks";

interface IProps {
  task: Task;
}

export const EditForm = ({ task }: IProps) => {
  const mutation = useUpdateTaskMutation();
  const { token } = useAuthStore();
  const allStatus: { value: string; name: string }[] = [
    { value: "PENDING", name: "Pending" },
    { value: "IN_PROGRESS", name: "In Progress" },
    { value: "COMPLETED", name: "Completed" },
  ];
  const currentStatus: Record<Status, string> = {
    "TaskStatus.PENDING": "PENDING",
    "TaskStatus.IN_PROGRESS": "IN_PROGRESS",
    "TaskStatus.COMPLETED": "COMPLETED",
  };
  const form = useForm<TEditFormSchema>({
    resolver: zodResolver(EditFormSchema),
    defaultValues: {
      title: task.title,
      content: task.content,
      status: currentStatus[task.status],
    },
  });

  const {
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = form;

  const onSubmit = async (formData: TEditFormSchema) => {
    await mutation.mutateAsync({ taskId: task.id, token, formData });

    toast.success("Task successfully updated");
  };

  return (
    <Form {...form}>
      <form className="grid gap-y-4" onSubmit={handleSubmit(onSubmit)}>
        <FormField
          control={control}
          name="title"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="text"
                  autoComplete="off"
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="content"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel>Content</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  autoComplete="off"
                  className="resize-none"
                  rows={4}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel>Status</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isSubmitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a status..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {allStatus.map((item) => (
                    <SelectItem
                      key={item.name}
                      className="md:cursor-pointer"
                      value={item.value}
                    >
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button className="font-medium" type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <LoaderCircle className="size-5 animate-spin" />
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};
