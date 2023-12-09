import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForm } from 'react-hook-form'
import { Loader2 } from 'lucide-react'
import { zodResolver } from '@hookform/resolvers/zod'
import { cn } from '@/lib/utils'
import { SignInFormSchema, TSignInFormSchema } from '@/types/types'
import { ErrorMessageForm } from '@/components/ErrorMessageForm'
import { Link } from 'react-router-dom'

export const SignInPage = () => {
  const {
    formState: { errors, isSubmitting },
    register,
    handleSubmit,
  } = useForm<TSignInFormSchema>({ resolver: zodResolver(SignInFormSchema) })

  const onSubmit = async (data: TSignInFormSchema) => {
    console.log(data)

    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  return (
    <section className='pt-16 pb-10'>
      <div className='container'>
        <div>
          <h1 className='text-center font-semibold text-3xl'>
            Welcome Back: Your{' '}
            <span className='text-primary'>Productivity</span> Journey Starts
            Here
          </h1>
          <div className='mt-8'>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className='grid gap-y-6 w-full'
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
