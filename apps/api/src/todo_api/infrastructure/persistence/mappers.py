from todo_api.domain.entities import Tag, Task, User
from todo_api.infrastructure.persistence.models import TagModel, TaskModel, UserModel


def user_to_domain(row: UserModel) -> User:
    return User(id=row.id, username=row.username, email=row.email, password_hash=row.password)


def user_to_model(user: User) -> UserModel:
    return UserModel(
        id=user.id,
        username=user.username,
        email=user.email,
        password=user.password_hash,
    )


def tag_to_domain(row: TagModel) -> Tag:
    return Tag(id=row.id, name=row.name)


def tag_to_model(tag: Tag) -> TagModel:
    return TagModel(id=tag.id, name=tag.name)


def task_to_domain(row: TaskModel, tag_name: str | None = None) -> Task:
    return Task(
        id=row.id,
        title=row.title,
        content=row.content,
        status=row.status,
        due_date=row.due_date,
        is_archived=row.is_archived,
        created_at=row.created_at,
        user_id=row.user_id,
        tag_id=row.tag_id,
        tag_name=tag_name,
    )


def task_to_model(task: Task) -> TaskModel:
    return TaskModel(
        id=task.id,
        title=task.title,
        content=task.content,
        status=task.status,
        due_date=task.due_date,
        is_archived=task.is_archived,
        created_at=task.created_at,
        user_id=task.user_id,
        tag_id=task.tag_id,
    )
