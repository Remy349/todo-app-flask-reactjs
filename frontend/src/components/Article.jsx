import React, { useEffect, useState } from 'react'
import { FiEdit, FiTrash2 } from 'react-icons/fi'
import {
  FormTask,
  InputFormTask,
  TextareaFormTask,
  ButtonFormTask,
} from './styled/FormStyled'

const API = import.meta.env.VITE_API_URL

export const Article = () => {
  const [tasks, setTasks] = useState([])
  const [inputs, setInputs] = useState({
    title: '',
    description: '',
  })

  const handleInputChange = (e) => {
    const value = e.target.value
    const name = e.target.name

    setInputs({
      ...inputs,
      [name]: value,
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
  }

  const getTasks = async () => {
    const res = await fetch(`${API}/api/tasks`, {
      method: 'GET',
    })

    const data = await res.json()

    console.log(data)
    setTasks(data.items)
  }

  useEffect(() => {
    getTasks()
  }, [])

  return (
    <article className='article'>
      <section className='article__form'>
        <FormTask className='form' onSubmit={handleSubmit}>
          <div className='form__container'>
            <InputFormTask
              type='text'
              name='title'
              placeholder='Title'
              className='form__input'
              autoComplete='off'
              value={inputs.title}
              onChange={handleInputChange}
            />
          </div>
          <div className='form__container'>
            <TextareaFormTask
              name='description'
              className='form__textarea'
              rows='4'
              placeholder='Description'
              value={inputs.description}
              onChange={handleInputChange}
            />
          </div>
          <div className='form__btn'>
            <ButtonFormTask className='form__btn-create' type='submit'>
              Create
            </ButtonFormTask>
          </div>
        </FormTask>
      </section>
      <section className='article__content'>
        <div className='article__content-cards'>
          {tasks.map((task) => (
            <div className='article__content-card' key={task.id_task}>
              <h2 className='article__content-card_title'>{task.title}</h2>
              <p className='article__content-card_description'>
                {task.description}
              </p>
              <div className='article__content-card_btns'>
                <button
                  className='article__content-card_btns_edit'
                  type='button'
                >
                  <FiEdit className='article__content-card_btns_icon' />
                </button>
                <button
                  className='article__content-card_btns_delete'
                  type='button'
                >
                  <FiTrash2 className='article__content-card_btns_icon' />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </article>
  )
}
