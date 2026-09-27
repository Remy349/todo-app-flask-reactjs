from flaskr import create_app

app = create_app()

# for rule in app.url_map.iter_rules():
#     print(rule)

@app.route("/")
def index():
    return {"message": "Welcome to Todo App API"}

if __name__ == "__main__":
    # 0.0.0.0 makes Flask accessible outside the container
    app.run(host="0.0.0.0", port=5000, debug=True)