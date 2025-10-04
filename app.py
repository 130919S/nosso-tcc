
# Sistema de Monitoramento de Radiação UV com Flask (unificado)

from flask import Flask, render_template, request, jsonify, render_template_string
from flask_sqlalchemy import SQLAlchemy
from flask_mail import Mail, Message
from apscheduler.schedulers.background import BackgroundScheduler
from flask_cors import CORS
from datetime import datetime, timedelta
import requests
import re
import os
import pandas as pd
from sqlalchemy import create_engine, text

# ===================== Build / Diagnóstico =====================
APP_BUILD = "build-2025-10-04-16h15"

# ===================== App/Base =====================
app = Flask(__name__, static_folder="static", static_url_path="/static")
app.url_map.strict_slashes = False
CORS(app)
app.secret_key = "cadastro"
app.config["TEMPLATES_AUTO_RELOAD"] = True

# ===================== Banco (SQLAlchemy - e-mails) =====================
app.config["SQLALCHEMY_DATABASE_URI"] = "mysql+mysqlconnector://root:%40Bruxado71@localhost/tcc_emails"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db = SQLAlchemy(app)

# ===================== Engine (SQLAlchemy - gráficos TCC) =====================
ENGINE_TCC = create_engine(
    "mysql+mysqlconnector://root:%40Bruxado71@localhost/tcc",
    pool_pre_ping=True,
)

# ===================== E-mail =====================
app.config["MAIL_SERVER"] = "smtp.gmail.com"
app.config["MAIL_PORT"] = 587
app.config["MAIL_USE_TLS"] = True
app.config["MAIL_USERNAME"] = "radiacaouv123@gmail.com"
app.config["MAIL_PASSWORD"] = "hxauakmvbaaxlvfx"
mail = Mail(app)

# ===================== Modelo =====================
class Email(db.Model):
    __tablename__ = "emails_clientes"
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)

with app.app_context():
    db.create_all()

# ===================== Headers de Cache =====================
@app.after_request
def add_header(response):
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

# ===================== Rotas básicas =====================
@app.get("/")
def home():
    return render_template("index.html")

@app.get("/ping")
def ping():
    return "pong", 200

@app.get("/__routes")
def __routes():
    return {"routes": [str(r) for r in app.url_map.iter_rules()]}, 200

@app.get("/__whoami")
def __whoami():
    return f"OK | file={os.path.abspath(__file__)} | build={APP_BUILD}", 200

@app.get("/__versions")
def __versions():
    import sqlalchemy, pandas
    return jsonify({
        "build": APP_BUILD,
        "pandas": pandas.__version__,
        "sqlalchemy": sqlalchemy.__version__
    }), 200

# ===================== Helpers =====================
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

def render_email(uv, nivel, descadastro_link):
    with open("email/email.html", "r", encoding="utf-8") as f:
        template_str = f.read()
    return render_template_string(
        template_str,
        uv=uv,
        nivel=nivel.replace("\n", "<br>"),
        descadastro_link=descadastro_link,
    )

def consulta_uv(latitude, longitude):
    api_key = "3f59fb330add1cfad36119abb1e4d8cb"
    url = f"https://api.openweathermap.org/data/2.5/uvi?lat={latitude}&lon={longitude}&appid={api_key}"
    try:
        r = requests.get(url, timeout=10)
        r.raise_for_status()
        data = r.json()
        return data.get("value")
    except Exception as e:
        print(f"[consulta_uv] erro: {e}")
        return None

def texto_nivel(uv):
    if uv is None:
        return "⚠️ Não foi possível consultar o índice UV no momento. Continue se protegendo!"
    if uv >= 11:
        return ("🌡️ Extremamente alto! ...")
    if uv >= 8:
        return ("⚠️ Muito alto! ...")
    if uv >= 6:
        return ("🌞 Alto! ...")
    if uv >= 3:
        return ("🧴 Moderado. ...")
    return "✅ Baixo. Ainda assim, proteção nunca é demais!"

# ---------- SQL helper (SEM pandas.read_sql_query) ----------
def run_query(sql: str, params: dict | None = None) -> pd.DataFrame:
    """Executa SQL (SQLAlchemy text) e retorna DataFrame."""
    with ENGINE_TCC.connect() as conn:
        result = conn.execute(text(sql), params or {})
        rows = result.fetchall()
        cols = result.keys()
    return pd.DataFrame(rows, columns=cols)

# ===================== Cadastro / Descadastro =====================
@app.post("/cadastro_email")
def cadastro_email():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip()
    latitude = data.get("latitude")
    longitude = data.get("longitude")

    if not email or latitude is None or longitude is None:
        return jsonify({"success": False, "message": "Dados incompletos!"}), 400
    if not EMAIL_RE.match(email):
        return jsonify({"success": False, "message": "E-mail inválido."}), 400
    if Email.query.filter_by(email=email).first():
        return jsonify({"success": False, "message": "E-mail já cadastrado."}), 409

    novo_email = Email(email=email, latitude=latitude, longitude=longitude)
    db.session.add(novo_email)
    db.session.commit()

    descadastro_link = f"http://localhost:5051/descadastrar?email={email}"

    msg = Message(
        subject="Cadastro confirmado - Monitoramento UV",
        sender=app.config["MAIL_USERNAME"],
        recipients=[email],
        body=(
            "Olá! Seu e-mail foi cadastrado com sucesso para receber notificações UV.\n\n"
            f"Sua localização aproximada: {latitude}, {longitude}.\n\n"
            "Se quiser parar de receber notificações, clique no link abaixo:\n"
            f"{descadastro_link}"
        ),
    )
    try:
        mail.send(msg)
    except Exception as e:
        db.session.delete(novo_email)
        db.session.commit()
        return jsonify({"success": False, "message": f"Falha ao enviar e-mail: {e}"}), 500

    return jsonify({"success": True, "message": "Cadastro feito com sucesso! Verifique seu e-mail."}), 200

@app.get("/descadastrar")
def descadastrar():
    email = (request.args.get("email") or "").strip()
    if not email:
        return "E-mail não informado.", 400
    registro = Email.query.filter_by(email=email).first()
    if not registro:
        return "E-mail não encontrado ou já descadastrado.", 404
    db.session.delete(registro)
    db.session.commit()
    return "Você foi descadastrado com sucesso. ✅"

# ===================== Envio diário =====================
def envia_emails_diarios():
    with app.app_context():
        emails = Email.query.all()
        total_enviados = 0
        total_falhas = 0
        print(f"[envio] Iniciando envio para {len(emails)} emails...")

        for e in emails:
            uv = consulta_uv(e.latitude, e.longitude)
            nivel = texto_nivel(uv)
            descadastro_link = f"http://localhost:5051/descadastrar?email={e.email}"
            email_html = render_email(
                uv=uv if uv is not None else "Indisponível",
                nivel=nivel,
                descadastro_link=descadastro_link,
            )

            msg = Message(
                subject="☀️ Alerta Diário - Índice UV",
                sender=app.config["MAIL_USERNAME"],
                recipients=[e.email],
                html=email_html,
            )
            try:
                mail.send(msg)
                total_enviados += 1
                print(f"[envio] ✅ Enviado para {e.email} (UV={uv})")
            except Exception as erro:
                total_falhas += 1
                print(f"[envio] ❌ Falha para {e.email}: {erro}")

        print(f"[envio] Finalizado: {total_enviados} enviados, {total_falhas} falhas.")

@app.get("/testar_envio")
def testar_envio():
    envia_emails_diarios()
    return "Notificações enviadas com sucesso (teste manual)!"

# ===================== APIs de Gráficos (TCC) =====================
# 1) Histórico de incidências por ano (2000–2023)
@app.get("/api/incidencia/anual")
def incidencia_anual():
    print("[ROUTE] /api/incidencia/anual", APP_BUILD)
    start = int(request.args.get("start", 2000))
    end = int(request.args.get("end", 2023))
    sql = """
        SELECT t.ano, COUNT(*) AS casos
        FROM (
            SELECT CAST(ano_cmpt AS UNSIGNED) AS ano
            FROM incidencia_clima_unificado_stage
            WHERE CAST(ano_cmpt AS UNSIGNED) BETWEEN :start AND :end
        ) t
        GROUP BY t.ano
        ORDER BY t.ano
    """
    df = run_query(sql, {"start": start, "end": end})
    return jsonify(df.to_dict(orient="records")), 200

# 2) Preditivo até 2033 (ARIMA | ETS)
@app.get("/api/preditivo/anual")
def preditivo_anual():
    print("[ROUTE] /api/preditivo/anual", APP_BUILD)
    modelo = (request.args.get("modelo", "ARIMA") or "ARIMA").upper()
    if modelo not in {"ARIMA", "ETS"}:
        modelo = "ARIMA"
    sql = """
        SELECT CAST(year AS UNSIGNED) AS ano, UPPER(model) AS modelo, point, lo95, hi95
        FROM resultadosprevisoes_cancer_pele
        WHERE UPPER(model) = :modelo
        ORDER BY ano
    """
    df = run_query(sql, {"modelo": modelo})
    return jsonify(df.to_dict(orient="records")), 200

# 3) Correlação UV x Casos (sem UV médio por enquanto)
@app.get("/api/correlacao/uv-incidencia")
def correlacao_uv():
    print("[ROUTE] /api/correlacao/uv-incidencia", APP_BUILD)
    start = int(request.args.get("start", 2000))
    end = int(request.args.get("end", 2023))
    sql = """
        SELECT 
            t.ano,
            COUNT(*) AS casos,
            NULL AS uv_medio
        FROM (
            SELECT CAST(ano_cmpt AS UNSIGNED) AS ano
            FROM incidencia_clima_unificado_stage
            WHERE CAST(ano_cmpt AS UNSIGNED) BETWEEN :start AND :end
        ) t
        GROUP BY t.ano
        ORDER BY t.ano
    """
    df = run_query(sql, {"start": start, "end": end})
    return jsonify(df.to_dict(orient="records")), 200

# 4) Rota agregadora
@app.get("/api/graficos")
def api_graficos():
    print("[ROUTE] /api/graficos", APP_BUILD)
    start = int(request.args.get("start", 2000))
    end = int(request.args.get("end", 2023))

    incidencia_df = run_query(
        """
        SELECT t.ano, COUNT(*) AS casos
        FROM (
            SELECT CAST(ano_cmpt AS UNSIGNED) AS ano
            FROM incidencia_clima_unificado_stage
            WHERE CAST(ano_cmpt AS UNSIGNED) BETWEEN :start AND :end
        ) t
        GROUP BY t.ano
        ORDER BY t.ano
        """,
        {"start": start, "end": end},
    )

    arima_df = run_query(
        """
        SELECT CAST(year AS UNSIGNED) AS ano, UPPER(model) AS modelo, point, lo95, hi95
        FROM resultadosprevisoes_cancer_pele
        WHERE UPPER(model) = 'ARIMA'
        ORDER BY ano
        """,
        {},
    )

    ets_df = run_query(
        """
        SELECT CAST(year AS UNSIGNED) AS ano, UPPER(model) AS modelo, point, lo95, hi95
        FROM resultadosprevisoes_cancer_pele
        WHERE UPPER(model) = 'ETS'
        ORDER BY ano
        """,
        {},
    )

    corr_df = run_query(
        """
        SELECT 
            t.ano,
            COUNT(*) AS casos,
            NULL AS uv_medio
        FROM (
            SELECT CAST(ano_cmpt AS UNSIGNED) AS ano
            FROM incidencia_clima_unificado_stage
            WHERE CAST(ano_cmpt AS UNSIGNED) BETWEEN :start AND :end
        ) t
        GROUP BY t.ano
        ORDER BY t.ano
        """,
        {"start": start, "end": end},
    )

    return jsonify(
        {
            "incidencia": incidencia_df.to_dict(orient="records"),
            "preditivo": {
                "ARIMA": arima_df.to_dict(orient="records"),
                "ETS": ets_df.to_dict(orient="records"),
            },
            "correlacao": corr_df.to_dict(orient="records"),
        }
    ), 200

# (Opcional) Compat
@app.get("/api/graficos/historico")
def api_graficos_historico():
    with app.test_request_context(f"/api/incidencia/anual?start=2000&end=2023"):
        return incidencia_anual()

# ===================== Scheduler/Boot =====================
scheduler = BackgroundScheduler(daemon=True, timezone="America/Sao_Paulo")
scheduler.add_job(envia_emails_diarios, "cron", hour=8, minute=30, id="envio_diario_uv")

def log_next_runs():
    for job in scheduler.get_jobs():
        print(f"[scheduler] Job {job.id} -> próximo disparo: {job.next_run_time}")

if __name__ == "__main__":
    print(f"[BOOT] app.py em: {os.path.abspath(__file__)} | build={APP_BUILD}")
    scheduler.start()
    log_next_runs()
    # usa 5051 para garantir que não conflita com nada que sobrou na 5000
    app.run(host="127.0.0.1", port=5051, debug=True, use_reloader=False)
