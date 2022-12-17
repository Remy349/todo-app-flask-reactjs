import React, { useEffect, useState } from 'react'
import {
  FiChevronRight,
  FiChevronLeft,
  FiThumbsUp,
  FiThumbsDown,
} from 'react-icons/fi'
import { Card } from './articleComponents/Card'
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
    self: '',
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

  // -> Get all tasks : GET
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
      self: data.links.self,
    })
  }

  // -> Create a task : POST
  const createTask = async () => {
    const res = await fetch(`${API}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...inputs,
      }),
    })

    const data = await res.json()
    console.log(data)

    getTasks(pagination.self)
  }

  // -> Delete a task : DELETE
  const deleteTask = async (idTask) => {
    console.log(idTask)
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    createTask()

    setInputs({
      title: '',
      description: '',
    })
  }

  useEffect(() => {
    getTasks('/api/tasks')
  }, [])

  return (
    <article className='article'>
      <section className='article__confirm'>
        <div className='modalbox'>
          <h3 className='modalbox__title'>
            Are you sure you want to delete the task?
          </h3>
          <div className='modalbox__btns'>
            <button className='modalbox__btns-confirm' type='button'>
              <FiThumbsUp className='modalbox__btns-icon' />
            </button>
            <button className='modalbox__btns-cancel' type='button'>
              <FiThumbsDown className='modalbox__btns-icon' />
            </button>
          </div>
        </div>
      </section>
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
            <Card
              key={task.id_task}
              idTask={task.id_task}
              title={task.title}
              description={task.description}
              timestamp={task.timestamp}
              deleteTask={deleteTask}
            />
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
