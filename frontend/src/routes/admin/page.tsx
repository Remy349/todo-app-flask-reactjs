import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { canManage, isAdminRole, roleLabel } from "@/lib/roles";
import { useDeleteTaskMutation } from "@/services/mutations/tasks";
import { useCreateTagMutation } from "@/services/mutations/tags";
import { useDeleteUserMutation } from "@/services/mutations/users";
import { useGetAdminTasksQuery } from "@/services/queries/admin-tasks";
import { useGetTagsQuery } from "@/services/queries/tags";
import { useGetUsersQuery } from "@/services/queries/users";
import { useAuthStore } from "@/stores/auth-store";
import { Status } from "@/types/types";
import { Shield, Trash } from "lucide-react";
import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

const statusLabel = (status: Status) => {
  const labels: Record<Status, string> = {
    "TaskStatus.PENDING": "Pending",
    "TaskStatus.IN_PROGRESS": "In Progress",
    "TaskStatus.COMPLETED": "Completed",
  };

  return labels[status];
};

export const AdminPage = () => {
  const { role, token, userId } = useAuthStore();
  const [tagName, setTagName] = useState("");
  const usersQuery = useGetUsersQuery();
  const tasksQuery = useGetAdminTasksQuery();
  const tagsQuery = useGetTagsQuery();
  const deleteUserMutation = useDeleteUserMutation();
  const deleteTaskMutation = useDeleteTaskMutation();
  const createTagMutation = useCreateTagMutation();
  const canManageData = canManage(role);

  if (!isAdminRole(role)) {
    return <Navigate to="/dashboard" />;
  }

  const handleCreateTag = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanName = tagName.trim();
    if (!cleanName) return;

    await createTagMutation.mutateAsync(cleanName);
    setTagName("");
    toast.success("Tag created");
  };

  const handleDeleteUser = async (userId: number) => {
    await deleteUserMutation.mutateAsync(userId);
    toast.success("User deleted");
  };

  const handleDeleteTask = async (taskId: number) => {
    await deleteTaskMutation.mutateAsync({ token, taskId });
    toast.success("Task deleted");
  };

  return (
    <div className="grid gap-6">
      <section className="border rounded-md bg-background p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="size-5" />
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Signed in as {role ? roleLabel(role) : "Admin"}
            </p>
          </div>
          <Button asChild variant="outline">
            <a href="/dashboard">User Dashboard</a>
          </Button>
        </div>
      </section>

      <section className="border rounded-md bg-background p-5">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Tags</h2>
            <p className="text-sm text-muted-foreground">
              Manager admins can create tags for task categorization.
            </p>
          </div>
          <form className="flex gap-2" onSubmit={handleCreateTag}>
            <Input
              className="w-48"
              disabled={!canManageData || createTagMutation.isPending}
              onChange={(event) => setTagName(event.target.value)}
              placeholder="Tag name"
              value={tagName}
            />
            <Button disabled={!canManageData || createTagMutation.isPending}>
              Add Tag
            </Button>
          </form>
        </div>
        <div className="flex flex-wrap gap-2">
          {(tagsQuery.data ?? []).map((tag) => (
            <span
              className="rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium"
              key={tag.id}
            >
              {tag.name}
            </span>
          ))}
        </div>
      </section>

      <section className="border rounded-md bg-background p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Users</h2>
          <p className="text-sm text-muted-foreground">
            Viewer admins can inspect users. Manager admins can delete accounts.
          </p>
        </div>
        <div className="grid gap-3">
          {(usersQuery.data ?? []).map((user) => (
            <div
              className="grid gap-3 rounded-md border p-4 md:grid-cols-[1fr_1fr_140px_auto] md:items-center"
              key={user.id}
            >
              <div>
                <p className="font-medium">{user.username}</p>
                <p className="text-xs text-muted-foreground">ID {user.id}</p>
              </div>
              <p className="text-sm">{user.email}</p>
              <span className="rounded-md bg-muted px-3 py-2 text-center text-xs font-medium">
                {roleLabel(user.role)}
              </span>
              {canManageData && user.id !== userId && user.role !== "admin" && user.role !== "admin_manager" ? (
                <DeleteConfirm
                  description={`This will permanently delete ${user.username} and all tasks owned by this account.`}
                  onConfirm={() => handleDeleteUser(user.id)}
                  title="Delete user?"
                />
              ) : (
                <Button disabled size="sm" variant="outline">
                  {canManageData ? "Protected" : "View only"}
                </Button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="border rounded-md bg-background p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Tasks</h2>
          <p className="text-sm text-muted-foreground">
            Viewer admins can inspect all tasks. Manager admins can delete any task.
          </p>
        </div>
        <div className="grid gap-3">
          {(tasksQuery.data ?? []).length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              No tasks found
            </div>
          ) : (
            (tasksQuery.data ?? []).map((task) => (
              <div
                className="grid gap-3 rounded-md border p-4 md:grid-cols-[1fr_1fr_120px_auto] md:items-center"
                key={task.id}
              >
                <div>
                  <p className="font-medium">{task.title}</p>
                  <p className="text-xs text-muted-foreground">{task.content}</p>
                </div>
                <div>
                  <p className="text-sm">{task.username}</p>
                  <p className="text-xs text-muted-foreground">{task.userEmail}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-md bg-muted px-3 py-2 text-xs font-medium">
                    {task.tagName}
                  </span>
                  <span className="rounded-md bg-muted px-3 py-2 text-xs font-medium">
                    {statusLabel(task.status)}
                  </span>
                </div>
                {canManageData ? (
                  <DeleteConfirm
                    description={`This will permanently delete "${task.title}".`}
                    onConfirm={() => handleDeleteTask(task.id)}
                    title="Delete task?"
                  />
                ) : (
                  <Button disabled size="sm" variant="outline">
                    View only
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

type DeleteConfirmProps = {
  description: string;
  onConfirm: () => void;
  title: string;
};

const DeleteConfirm = ({ description, onConfirm, title }: DeleteConfirmProps) => {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="destructive">
          <Trash />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: "destructive" })}
            onClick={onConfirm}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
