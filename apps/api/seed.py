from todo_api.app import create_app
from todo_api.infrastructure.persistence.database import db
from todo_api.infrastructure.persistence.models import TagModel


def seed_tags():
    try:
        tag_names = [
            "Work",
            "Study",
            "Free Time",
            "Exercise",
            "Health",
            "Travel",
            "Hobbies",
            "Shopping",
            "Finances",
            "Family",
            "Chores",
            "Friends",
            "Meetings",
            "Goals",
            "Projects",
            "Learning",
            "Entertainment",
            "Relaxation",
            "Urgent",
            "Miscellaneous",
        ]

        app = create_app()

        with app.app_context():
            for tag_name in tag_names:
                data = {"name": tag_name}

                new_tag = TagModel(**data)

                db.session.add(new_tag)
                db.session.commit()

            print("Inserted new tags")
    except Exception as err:
        db.session.rollback()
        print(f"Error while seeding: {err}")


if __name__ == "__main__":
    seed_tags()
