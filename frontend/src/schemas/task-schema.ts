import { z } from "zod";

const FormSchema = z.object({
  title: z
    .string()
    .min(1, { message: "Title is required" })
    .max(40, { message: "Max length is 40 characters" }),
  content: z
    .string()
    .min(1, { message: "Content is required" })
    .max(600, { message: "Max length is 600 characters" }),
  status: z.string().min(1, { message: "Status is required" }),
  tagId: z.string().min(1, { message: "Tag is required" }),
});

export const CreateFormSchema = FormSchema;

export const EditFormSchema = FormSchema.omit({ tagId: true });

export type TCreateFormSchema = z.infer<typeof CreateFormSchema>;

export type TEditFormSchema = z.infer<typeof EditFormSchema>;
