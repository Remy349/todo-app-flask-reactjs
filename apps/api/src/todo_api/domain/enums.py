from enum import Enum


class TaskStatus(Enum):
    """Plain Enum on purpose (not StrEnum).

    The wire contract serializes ``str(TaskStatus.PENDING)`` as
    ``"TaskStatus.PENDING"``; a StrEnum would serialize as ``"PENDING"`` and
    break the frontend. Do not change this to StrEnum.
    """

    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
