import React, { useEffect, useState } from 'react'
import { Card } from './articleComponents/Card'
import { FiChevronRight, FiChevronLeft, FiAlertCircle } from 'react-icons/fi'
import {
  FormTask,
  InputFormTask,
  TextareaFormTask,
  ButtonFormTask,
} from './styled/FormStyled'

import emptyImg from '../img/bubble-gum-signing-the-contract.png'

const API = import.meta.env.VITE_API_URL

export const Article = () => {
  const [tasks, setTasks] = useState([])
  const [isEdit, setIsEdit] = useState(false)
  const [currentId, setCurrentId] = useState(null)
  const [errorInputs, setErrorInputs] = useState({
    title: false,
    description: false,
  })
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

  const handleOnClickCancel = () => {
    setIsEdit(false)
    setCurrentId(null)
    setInputs({
      title: '',
      description: '',
    })
  }

  // ==> Get all tasks : GET
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

  // ==> Get a single task : GET
  const getTask = async (idTask) => {
    const res = await fetch(`${API}/api/tasks/${idTask}`, {
      method: 'GET',
    })

    const data = await res.json()
    console.log(data)

    setIsEdit(true)
    setCurrentId(data.id_task)
    setInputs({
      title: data.title,
      description: data.description,
    })
  }

  // ==> Create a task : POST
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

    await getTasks(pagination.self)
  }

  // ==> Update a task : PUT
  const updateTask = async () => {
    const res = await fetch(`${API}/api/tasks/${currentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...inputs,
      }),
    })

    const data = await res.json()
    console.log(data)

    setIsEdit(false)
    setCurrentId(null)

    await getTasks(pagination.self)
  }

  // ==> Delete a task : DELETE
  const deleteTask = async (idTask) => {
    const confirm = window.confirm('Are you sure you want to delete the task?')

    if (confirm) {
      await fetch(`${API}/api/tasks/${idTask}`, {
        method: 'DELETE',
      })

      await getTasks(pagination.self)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    // ==> Validate form fields
    if (inputs.title === '') {
      setErrorInputs({ title: true })
      return
    } else {
      setErrorInputs({ title: false })
    }

    if (inputs.description === '') {
      setErrorInputs({ description: true })
      return
    } else {
      setErrorInputs({ description: false })
    }

    if (!isEdit) {
      createTask()
    } else {
      updateTask()
    }

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
      <section className='article__form'>
        <FormTask className='form' onSubmit={handleSubmit}>
          <div className='form__container'>
            <InputFormTask
              type='text'
              name='title'
              placeholder={errorInputs.title ? 'Please enter a value' : 'Title'}
              className={
                errorInputs.title ? 'form__input error-input' : 'form__input'
              }
              autoComplete='off'
              value={inputs.title}
              onChange={handleInputChange}
            />
            <FiAlertCircle
              style={
                errorInputs.title ? { display: 'block' } : { display: 'none' }
              }
              className='form__alerticon'
            />
          </div>
          <div className='form__container'>
            <TextareaFormTask
              name='description'
              className={
                errorInputs.description
                  ? 'form__textarea error-input'
                  : 'form__textarea'
              }
              rows='4'
              placeholder={
                errorInputs.description ? 'Please enter a value' : 'Description'
              }
              value={inputs.description}
              onChange={handleInputChange}
            />
          </div>
          <div className='form__btn'>
            <ButtonFormTask type='submit'>
              {!isEdit ? 'Create' : 'Update'}
            </ButtonFormTask>
            <ButtonFormTask
              style={!isEdit ? { display: 'none' } : { display: 'block' }}
              cancel
              type='button'
              onClick={handleOnClickCancel}
            >
              Cancel
            </ButtonFormTask>
          </div>
        </FormTask>
      </section>
      {tasks.length === 0 ? (
        <section className='article__empty'>
          <img src={emptyImg} alt='Empty Image' />
        </section>
      ) : (
        <section className='article__content'>
          <div className='cards'>
            {tasks.map((task) => (
              <Card
                key={task.id_task}
                idTask={task.id_task}
                title={task.title}
                description={task.description}
                timestamp={task.timestamp}
                getTask={getTask}
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
      )}
    </article>
  )
}
