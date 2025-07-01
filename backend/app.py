from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/')
def index():
    return "ESP32 Flask Server is Running!"

@app.route('/data', methods=['POST'])
def receive_data():
    data = request.get_json()
    if data and "message" in data:
        print("? Message from ESP32:", data["message"])
        return jsonify({"status": "received", "message": data["message"]}), 200
    return jsonify({"status": "error", "message": "No valid data"}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)

