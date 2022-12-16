import React, { useEffect, useState } from 'react'
import moment from 'moment'
import { FiEdit, FiTrash2, FiChevronRight, FiChevronLeft } from 'react-icons/fi'
import {
  FormTask,
  InputFormTask,
  TextareaFormTask,
  ButtonFormTask,
} from './styled/FormStyled'

const API = import.meta.env.VITE_API_URL

export const Article = () => {
  const [tasks, setTasks] = useState([])
  const [pagination, setPagination] = useState({
    next: '',
    prev: '',
  })
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

  const getTasks = async (linkCall) => {
    if (linkCall === null) return

    const res = await fetch(`${API}${linkCall}`, {
      method: 'GET',
    })

    const data = await res.json()

    setTasks(data.items)
    setPagination({
      next: data.links.next,
      prev: data.links.prev,
    })
  }

  useEffect(() => {
    getTasks('/api/tasks')
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
        <div className='cards'>
          {tasks.map((task) => (
            <div className='cards__card' key={task.id_task}>
              <h2 className='cards__card-title'>{task.title}</h2>
              <p className='cards__card-description'>{task.description}</p>
              <p className='cards__card-timestamp'>
                Created: {moment(task.timestamp).fromNow()}
              </p>
              <div className='cards__card-btns'>
                <button className='cards__card-btns_edit' type='button'>
                  <FiEdit className='cards__card-btns_icon' />
                </button>
                <button className='cards__card-btns_delete' type='button'>
                  <FiTrash2 className='cards__card-btns_icon' />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className='pagination'>
          <button
            className='pagination__left'
            type='button'
            onClick={() => getTasks(pagination.prev)}
          >
            <FiChevronLeft className='pagination__left-icon' />
          </button>
          <button
            className='pagination__right'
            type='button'
            onClick={() => getTasks(pagination.next)}
          >
            <FiChevronRight className='pagination__right-icon' />
          </button>
        </div>
      </section>
    </article>
  )
}
