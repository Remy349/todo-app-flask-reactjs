type TEmptyDataProps = {
  title: string
}

export const EmptyData = ({ title }: TEmptyDataProps) => {
  return (
    <div className='mt-8 md:mt-16'>
      <h3 className='font-medium text-center text-2xl md:text-3xl'>{title}</h3>
    </div>
  )
}
