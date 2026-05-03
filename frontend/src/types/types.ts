export type Tag = {
  id: number;
  name: string;
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
  dueDate: string | null;
  createdAt: Date;
  tagName: string;
  isArchived: boolean;
};
