export type Tag = {
  id: number;
  name: string;
};

export type Role = "user" | "admin" | "admin_viewer" | "admin_manager";

export type User = {
  id: number;
  username: string;
  email: string;
  role: Role;
};

export type Status =
  | "TaskStatus.PENDING"
  | "TaskStatus.IN_PROGRESS"
  | "TaskStatus.COMPLETED";

export type Task = {
  id: number;
  title: string;
  content: string;
  status: Status;
  createdAt: Date;
  tagName: string;
};

export type AdminTask = Task & {
  userId: number;
  username: string;
  userEmail: string;
};
