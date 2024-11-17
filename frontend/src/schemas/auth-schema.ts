import { z } from "zod";

const FormSchema = z.object({
  username: z
    .string()
    .min(1, { message: "Username is required" })
    .max(20, { message: "Max length is 20 characters" }),
  email: z
    .string()
    .min(1, { message: "Email is required" })
    .email({ message: "Not a valid email" }),
  password: z.string().min(1, { message: "Password is required" }),
});

export const SignInFormSchema = FormSchema.omit({ username: true });

export const CreateAccountFormSchema = FormSchema;

export type TSignInFormSchema = z.infer<typeof SignInFormSchema>;

export type TCreateAccountFormSchema = z.infer<typeof CreateAccountFormSchema>;
