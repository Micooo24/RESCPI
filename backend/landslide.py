from flask import Flask, request, jsonify

app = Flask(__name__)
data_from_esp = {}

@app.route('/')
def index():
    return "ESP32 Landslide Server is running!"

@app.route('/data', methods=['POST'])
def receive_data():
    global data_from_esp

    try:
        data_from_esp = request.get_json(force=True)

        if not data_from_esp:
            print("? Empty or invalid JSON received.")
            return jsonify({"status": "error", "message": "Invalid JSON"}), 400

        # Format the output like ESP32
        x = data_from_esp.get("x", 0)
        y = data_from_esp.get("y", 0)
        z = data_from_esp.get("z", 0)
        deviation = data_from_esp.get("deviation", 0)
        angle = data_from_esp.get("angle", 0)

        print("----- SENSOR REPORT -----")
        print(f"Accel X: {x:.2f} | Y: {y:.2f} | Z: {z:.2f} | Deviation: {deviation:.2f} | Servo Angle: {angle}�")

        if deviation > 1.0:
            print("?? Landslide Detected! Moving Servo...\n")
        else:
            print("? Stable: Normal Position\n")

        return jsonify({"status": "received"})

    except Exception as e:
        print("? Error processing POST:", str(e))
        print("Raw request body:", request.data.decode())
        return jsonify({"status": "error", "message": "Exception occurred"}), 500

@app.route('/data', methods=['GET'])
def send_data():
    return jsonify(data_from_esp)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
