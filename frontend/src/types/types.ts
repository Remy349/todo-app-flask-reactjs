import { z } from 'zod'

export const SignInFormSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Email is required.' })
    .email({ message: 'Not a valid email.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
})

export type TSignInFormSchema = z.infer<typeof SignInFormSchema>
