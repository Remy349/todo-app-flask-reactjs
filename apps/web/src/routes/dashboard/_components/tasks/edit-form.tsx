import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EditFormSchema, type TEditFormSchema } from "@/schemas/task-schema";
import { useUpdateTaskMutation } from "@/services/mutations/tasks";
import { useAuthStore } from "@/stores/auth-store";
import type { Status, Task } from "@/types/types";

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
      dueDate: task.dueDate || null,
    },
  });

  const {
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = form;

  const onSubmit = async (formData: TEditFormSchema) => {
    try {
      // Normalize dueDate to full ISO DateTime for the backend.
      // - When editing a task with existing date, form holds "YYYY-MM-DDTHH:MM:SS"
      // - When user types a new date, <input type="date"> gives "YYYY-MM-DD"
      // Either way, send a full ISO DateTime; if already ISO, use as-is.
      const normalizeDueDate = (
        v: string | null | undefined,
      ): string | null => {
        if (!v) return null;
        if (v.includes("T")) return v;
        return `${v}T00:00:00`;
      };

      const payload = {
        ...formData,
        dueDate: normalizeDueDate(formData.dueDate),
      };

      await mutation.mutateAsync({ taskId: task.id, token, formData: payload });

      toast.success("Task successfully updated");
    } catch (error) {
      toast.error("Failed to update task");
      console.error(error);
    }
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
        <FormField
          control={form.control}
          name="dueDate"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel>Due Date (Optional)</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  value={field.value ? String(field.value).slice(0, 10) : ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                  disabled={isSubmitting}
                />
              </FormControl>
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
