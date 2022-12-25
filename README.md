# todo-app-flask-reactjs

This is a basic application with the objective of being able to save your notes and have them stored in a database. The user is able to perform basic actions such as create, read, update and delete this data, a basic CRUD.

## Table of contents

- [Built with](#built-with)
- [Project requirements and how to use it](#project-requirements-and-how-to-use-it)
  - [Frontend](#frontend)
  - [Backend](#backend)
- [Image gallery](#image-gallery)
  - [Desktop](#desktop)
  - [Mobile](#mobile)

## Built with

The project was developed from scratch with Frontend and Backend technologies, for the communication between the client and the server I implemented an REST API, which is responsible for returning the necessary data in JSON format to the client:

- Frontend:
  - ReactJS
  - SCSS
  - Styled Components

- Backend:
  - Python (Flask)
  - PostgreSQL (As database manager)
  - Flask Migrate (To perform migrations)
  - SQLAlchemy and Flask SQLAlchemy (Python SQL toolkit and ORM that gives application developers the full power and flexibility of SQL)
  - REST API (For communication between client and server)

## Project requirements and how to use it

For the project you must run both development environments at the same time, both the Frontend and the Backend. In the Frontend you will find JavaScript technologies (ReactJS) and in the Backend you will find Python technologies and tools (Flask), so you must have NodeJS and Python installed on your computer (As a reference this project was developed with version 3.9.6 of Python and 18.12.1 of NodeJS).

I leave you links to NodeJS and Python for installation:
  - [NodeJS website](https://nodejs.org/en/)
  - [Python website](https://www.python.org/)

First of all download the project to start using it, do it from the terminal:

```shell
$ git clone https://github.com/Remy349/todo-app-flask-reactjs.git

$ cd todo-app-flask-reactjs
```

If you did it correctly and there were no problems, you should see these folders in your terminal:

```shell
/backend
/frontend
/preview
README.md
```

### Frontend

If you already have NodeJS installed on your computer perform the following steps to run the Frontend (Remember that the Backend must be running):

1. Move to the `/frontend` folder and run the following command to install the necessary:

```shell
# This will install what you need for the Frontend (npm comes with NodeJS after installation)
$ npm install
```

2. Then you will need to run the following command to start running the Frontend:

```shell
$ npm run dev

# You will see something like this:
> frontend@0.0.0 dev
> vite

  VITE v3.2.4  ready in 2079 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

3. That's all for the Frontend, if you haven't run the Backend yet, continue with the next section (Backend)

### Backend

## Image gallery

### Desktop:

![PREVIEW](./preview/preview.png)
![PREVIEW](./preview/preview1.png)

### Mobile

<table>
  <tr>
    <td>
      <img src="./preview/preview-m.png" alt="Mobile" title="Mobile version" width="100%" />
    </td>
    <td>
      <img src="./preview/preview-m1.png" alt="Mobile" title="Mobile version" width="100%" />
    </td>
    <td>
      <img src="./preview/preview-m2.png" alt="Mobile" title="Mobile version" width="100%" />
    </td>
  </tr>
</table>

### Developed by Santiago de Jesús Moraga Caldera - Remy349(GitHub)
