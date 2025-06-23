from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)



# from flask import Flask, request, jsonify
# import requests

# app = Flask(__name__)

# @app.route('/uv')
# def get_uv():
#     lat = request.args.get('lat')
#     lon = request.args.get('lon')
#     api_key = '3f59fb330add1cfad36119abb1e4d8cb'

#     response = requests.get(
#         f'https://api.openweathermap.org/data/2.5/uvi?lat={lat}&lon={lon}&appid={api_key}'
#     )
#     return jsonify(response.json())

# if __name__ == '__main__':
#     app.run(debug=True)
