export type Tag = {
  id: number;
  name: string;
};

export type Status = "PENDING" | "IN_PROGRESS" | "COMPLETED";

export type Task = {
  id: number;
  title: string;
  content: string;
  status: Status;
  createdAt: string;
};
