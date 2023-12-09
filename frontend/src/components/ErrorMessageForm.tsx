type TErrorMessageForm = {
  message: string | undefined
}

export const ErrorMessageForm = ({ message }: TErrorMessageForm) => {
  return (
    <p className='bg-red-200 rounded-lg py-2 text-base px-3 text-red-500'>
      {message}
    </p>
  )
}
