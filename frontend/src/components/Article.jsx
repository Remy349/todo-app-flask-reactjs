import React from 'react'
import styled from 'styled-components'

const FormTask = styled.form``

const InputFormTask = styled.input``

const TextareaFormTask = styled.textarea``

const ButtonFormTask = styled.button``

export const Article = () => {
  return (
    <article className='article'>
      <section className='article__form'>
        <FormTask className='form'>
          <div className='form__container'>
            <InputFormTask
              type='text'
              name='title'
              placeholder='Title'
              className='form__input'
              autoComplete='off'
            />
          </div>
          <div className='form__container'>
            <TextareaFormTask
              name='description'
              className='form__textarea'
              rows='5'
            />
          </div>
          <div className='form__btn'>
            <ButtonFormTask className='form__btn-create' type='submit'>
              Create
            </ButtonFormTask>
          </div>
        </FormTask>
      </section>
      <section className='article__content'></section>
    </article>
  )
}
