# app.py (teste de rotas, sem banco)
from flask import Flask, jsonify
app = Flask(__name__)

@app.route("/api/incidencia/anual")
def incidencia_anual():
    return jsonify([{"ano": 2000, "casos": 123}, {"ano": 2001, "casos": 150}])

@app.route("/api/preditivo/anual")
def preditivo_anual():
    return jsonify([{"ano": 2000, "observado": 123, "previsto": 123},
                    {"ano": 2024, "observado": None, "previsto": 300}])

@app.route("/api/correlacao/uv-incidencia")
def correlacao():
    return jsonify([{"ano": 2000, "casos": 123, "uv_medio": 7.2}])

@app.route("/")
def root():
    # imprime o mapa de rotas pra conferência
    return jsonify({"status":"ok", "routes":[str(r) for r in app.url_map.iter_rules()]})

if __name__ == "__main__":
    print("URL MAP:", app.url_map)  # também no terminal
    app.run(host="0.0.0.0", port=5000, debug=True)