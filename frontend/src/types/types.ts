import { z } from 'zod'

export const SignInFormSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Email is required.' })
    .email({ message: 'Not a valid email.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
})

export type TSignInFormSchema = z.infer<typeof SignInFormSchema>

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

export type TSignUpFormSchema = z.infer<typeof SignUpFormSchema>

export type TUser = {
  id: number
  email: string
  created_at: string
}

export type TAuthUser = {
  access_token: string
  email: string
}
