import styled from 'styled-components'

export const FormTask = styled.form`
  width: 100%;
  display: grid;
  row-gap: 1rem;
`

export const InputFormTask = styled.input`
  font-family: inherit;
  width: 100%;
  border: none;
  outline: none;
  border-radius: 1rem;
  padding: 1rem 3rem 1rem 1.2rem;
  font-size: 1.25rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  font-weight: 700;
`

export const TextareaFormTask = styled.textarea`
  font-family: inherit;
  width: 100%;
  border: none;
  outline: none;
  border-radius: 1rem;
  font-size: 1.25rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  font-weight: 700;
  padding: 1.2rem;
  resize: none;
`

export const ButtonFormTask = styled.button`
  font-family: inherit;
  width: 100%;
  border-radius: 1rem;
  border: none;
  outline: none;
  cursor: pointer;
  padding: 0.7rem;
  font-size: 1.5rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  font-weight: 700;
`
