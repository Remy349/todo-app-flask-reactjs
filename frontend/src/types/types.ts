import { z } from 'zod'

// -------> FORMS SCHEMA

export const SignInFormSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Email is required.' })
    .email({ message: 'Not a valid email.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
})

export const SignUpFormSchema = z
  .object({
    email: z
      .string()
      .min(1, { message: 'Email is required.' })
      .email({ message: 'Not a valid email.' }),
    password: z
      .string()
      .min(8, { message: 'Password must be at least 8 characters.' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

export const CreateCategoryFormSchema = z.object({
  category_name: z
    .string()
    .min(1, { message: 'Category name is required.' })
    .max(60, { message: 'Category name must have a max of 60 characters.' }),
})

// -------> FORMS TYPE

export type TSignInFormSchema = z.infer<typeof SignInFormSchema>

export type TSignUpFormSchema = z.infer<typeof SignUpFormSchema>

export type TCreateCategoryFormSchema = z.infer<typeof CreateCategoryFormSchema>

// -------> TYPES

export type TUser = {
  id: number
  email: string
  created_at: string
}

export type TAuthUser = {
  access_token: string
  email: string
}

export type TCategory = {
  id: number
  category_name: string
  created_at: string
}
