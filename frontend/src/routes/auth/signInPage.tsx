import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForm } from 'react-hook-form'
import { Loader2 } from 'lucide-react'
import { zodResolver } from '@hookform/resolvers/zod'
import { cn } from '@/lib/utils'
import { SignInFormSchema, TSignInFormSchema } from '@/types/types'
import { ErrorMessageForm } from '@/components/ErrorMessageForm'
import { Link, useNavigate } from 'react-router-dom'
import { authenticateUser } from '@/services/api/authApi'
import axios from 'axios'
import { toast } from 'sonner'
import { useAuth } from '@/store/auth'

export const SignInPage = () => {
  const {
    formState: { errors, isSubmitting },
    register,
    handleSubmit,
  } = useForm<TSignInFormSchema>({ resolver: zodResolver(SignInFormSchema) })
  const { setAuthUser } = useAuth()
  const navigate = useNavigate()

  const onSubmit = async (formData: TSignInFormSchema) => {
    await authenticateUser(formData)
      .then((data) => {
        setAuthUser(data)

        navigate('/profile')
      })
      .catch((err) => {
        if (axios.isAxiosError(err)) {
          if (err.response?.status === 401) {
            toast.error('Invalid email or password.')
          }
        }
      })
  }

  return (
    <section className='pt-16 pb-10 lg:pt-[6rem] lg:pb-[4.5rem]'>
      <div className='container'>
        <div>
          <h1 className='text-center font-semibold text-3xl lg:text-4xl lg:max-w-3xl lg:mx-auto'>
            Welcome Back: Your{' '}
            <span className='text-primary'>Productivity</span> Journey Starts
            Here
          </h1>
          <div className='mt-8 md:flex md:justify-center md:mt-16'>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className='grid gap-y-6 w-full md:w-[468px]'
            >
              <div className='flex flex-col gap-y-2'>
                <Label
                  htmlFor='email'
                  className={cn(
                    'text-base',
                    errors.email ? 'text-red-500' : '',
                  )}
                >
                  Email
                </Label>
                <Input
                  {...register('email')}
                  type='text'
                  id='email'
                  autoComplete='off'
                  className={errors.email ? 'focus-visible:ring-red-500' : ''}
                />
                {errors.email && (
                  <ErrorMessageForm message={errors.email.message} />
                )}
              </div>
              <div className='flex flex-col gap-y-2'>
                <Label
                  htmlFor='password'
                  className={cn(
                    'text-base',
                    errors.password ? 'text-red-500' : '',
                  )}
                >
                  Password
                </Label>
                <Input
                  {...register('password')}
                  type='password'
                  id='password'
                  className={
                    errors.password ? 'focus-visible:ring-red-500' : ''
                  }
                />
                {errors.password && (
                  <ErrorMessageForm message={errors.password.message} />
                )}
              </div>
              <Button type='submit' disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className='mr-2 w-5 h-5 animate-spin' />
                )}
                Sign In
              </Button>
              <Link to='/auth/signup' className='text-center text-base'>
                Don't have an account yet?
                <br />
                Create one
              </Link>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
