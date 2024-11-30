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
import { useGetTagsQuery } from "@/services/queries/tags";
import { CreateFormSchema, TCreateFormSchema } from "@/schemas/task-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth-store";
import { useCreateTaskMutation } from "@/services/mutations/tasks";

export const CreateForm = () => {
  const { data: tags = [] } = useGetTagsQuery();
  const { token } = useAuthStore();
  const mutation = useCreateTaskMutation();
  const form = useForm<TCreateFormSchema>({
    resolver: zodResolver(CreateFormSchema),
    defaultValues: { title: "", content: "", tagId: "", status: "" },
  });

  const {
    handleSubmit,
    control,
    reset,
    formState: { isSubmitting },
  } = form;

  const onSubmit = async (formData: TCreateFormSchema) => {
    await mutation.mutateAsync({ token, formData });

    toast.success("Task successfully created");

    reset();
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
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="tagId"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel>Tag</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a tag..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {tags.map((tag) => (
                      <SelectItem
                        className="md:cursor-pointer"
                        key={tag.id}
                        value={`${tag.id}`}
                      >
                        {tag.name}
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
                    <SelectItem className="md:cursor-pointer" value="PENDING">
                      Pending
                    </SelectItem>
                    <SelectItem
                      className="md:cursor-pointer"
                      value="IN_PROGRESS"
                    >
                      In Progress
                    </SelectItem>
                    <SelectItem className="md:cursor-pointer" value="COMPLETED">
                      Completed
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
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
