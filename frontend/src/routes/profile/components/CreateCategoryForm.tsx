import { ErrorMessageForm } from '@/components/ErrorMessageForm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { createCategory } from '@/services/api/categoryApi'
import {
  CreateCategoryFormSchema,
  TCreateCategoryFormSchema,
} from '@/types/types'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

export const CreateCategoryForm = () => {
  const {
    handleSubmit,
    formState: { isSubmitting, errors },
    register,
  } = useForm<TCreateCategoryFormSchema>({
    resolver: zodResolver(CreateCategoryFormSchema),
  })

  const onSubmit = async (formData: TCreateCategoryFormSchema) => {
    await createCategory(formData)
      .then(() => {
        toast.success('Category  successfully created.')
      })
      .catch((err) => {
        console.log(err)
      })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='grid w-full gap-y-6'>
      <div className='flex flex-col gap-y-2'>
        <Label
          htmlFor='categoryName'
          className={cn(
            'text-base',
            errors.category_name ? 'text-red-500' : '',
          )}
        >
          Category name
        </Label>
        <Input
          {...register('category_name')}
          className={errors.category_name ? 'focus-visible:ring-red-500' : ''}
          type='text'
          id='categoryName'
          autoComplete='off'
        />
        {errors.category_name && (
          <ErrorMessageForm message={errors.category_name.message} />
        )}
      </div>
      <Button type='submit' disabled={isSubmitting}>
        {isSubmitting && <Loader2 className='mr-2 w-5 h-5 animate-spin' />}
        Confirm
      </Button>
    </form>
  )
}
