
# Sistema de Monitoramento de Radiação UV com Flask

from flask import Flask, render_template, request, jsonify, render_template_string
from flask_sqlalchemy import SQLAlchemy
from flask_mail import Mail, Message
from apscheduler.schedulers.background import BackgroundScheduler
from flask_cors import CORS
from datetime import datetime, timedelta
import requests
import re
import os
import mysql.connector
from mysql.connector import pooling
import pandas as pd
import numpy as np

# --------------------- App/Base ---------------------
app = Flask(__name__)
CORS(app)
app.secret_key = 'cadastro'
app.config['TEMPLATES_AUTO_RELOAD'] = True

# --------------------- Banco de Dados ---------------------
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+mysqlconnector://root:%40Bruxado71@localhost/tcc_emails'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --------------------- E-mail 
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'radiacaouv123@gmail.com'
app.config['MAIL_PASSWORD'] = 'hxauakmvbaaxlvfx'
mail = Mail(app)

# --------------------- Modelo 
class Email(db.Model):
    __tablename__ = 'emails_clientes'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)

with app.app_context():
    db.create_all()

# --------------------- Headers de Cache ---------------------
@app.after_request
def add_header(response):
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

# --------------------- Rotas básicas ---------------------
@app.route('/')
def home():
    return render_template('index.html')

# --------------------- Helpers ---------------------
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

def render_email(uv, nivel, descadastro_link):
    """Renderiza o HTML do e-mail a partir do arquivo 'email/email.html' (fora de templates)."""
    with open("email/email.html", "r", encoding="utf-8") as f:
        template_str = f.read()
    return render_template_string(
        template_str,
        uv=uv,
        nivel=nivel.replace('\n', '<br>'),  # quebra de linha bonitinha no HTML
        descadastro_link=descadastro_link
    )

def consulta_uv(latitude, longitude):
    """Consulta UV no OpenWeather. Retorna float ou None."""
    api_key = '3f59fb330add1cfad36119abb1e4d8cb'
    url = f'https://api.openweathermap.org/data/2.5/uvi?lat={latitude}&lon={longitude}&appid={api_key}'
    try:
        r = requests.get(url, timeout=10)
        r.raise_for_status()
        data = r.json()
        return data.get('value')
    except Exception as e:
        print(f'[consulta_uv] erro: {e}')
        return None

def texto_nivel(uv):
    """Retorna o texto de orientação conforme o valor do UV."""
    if uv is None:
        return "⚠️ Não foi possível consultar o índice UV no momento. Continue se protegendo!"

    if uv >= 11:
        return """🌡️ Extremamente alto! O índice UV está perigosamente elevado.

⚠️ Riscos: Queimaduras em menos de 10 minutos, risco alto de câncer de pele e danos aos olhos.

📌 Cuidados essenciais:
- Evite sair ao sol entre 10h e 16h.
- Use protetor solar FPS 50+ e reaplique a cada 2 horas.
- Use chapéu de aba larga, óculos escuros com proteção UV e roupas com proteção solar.
- Busque sombra sempre que possível.
- Crianças e idosos devem evitar exposição direta.

🛑 Se puder, permaneça em locais cobertos durante esse período."""
    if uv >= 8:
        return """⚠️ Muito alto! O índice UV está elevado e pode causar danos sérios à pele e aos olhos.

📌 Cuidados recomendados:
- Evite exposição direta ao sol entre 10h e 16h.
- Use protetor solar com FPS 30+ e reaplique a cada 2 horas.
- Use chapéu, boné ou guarda-sol ao sair.
- Use óculos escuros com proteção UV.
- Prefira roupas de manga longa e tecidos leves.

🚸 Crianças, idosos e pessoas com pele clara devem redobrar os cuidados."""
    if uv >= 6:
        return """🌞 Alto! O índice UV pode causar danos à pele e aos olhos em exposições prolongadas.

📌 Dicas de proteção:
- Evite exposição direta ao sol entre 10h e 16h.
- Use protetor solar com FPS 30+ mesmo em dias nublados.
- Use boné, óculos escuros e roupas leves que cubram a pele.
- Prefira ambientes com sombra e mantenha-se hidratado.

📣 Fique atento(a): mesmo níveis altos podem causar danos cumulativos à pele com o tempo."""
    if uv >= 3:
        return """🧴 Moderado. O índice UV está dentro de níveis aceitáveis, mas ainda requer atenção.

📌 Dicas de proteção:
- Use protetor solar com FPS 15+ se for se expor ao sol por longos períodos.
- Prefira ficar na sombra entre 10h e 16h.
- Use óculos escuros e boné ou chapéu se for sair.

💡 Dica extra: mesmo em dias nublados, os raios UV continuam presentes!"""
    return "✅ Baixo. Ainda assim, proteção nunca é demais!"

# ------------------ Cadastro de e-mail ---------------------
@app.route('/cadastro_email', methods=['POST'])
def cadastro_email():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip()
    latitude = data.get('latitude')
    longitude = data.get('longitude')

    if not email or latitude is None or longitude is None:
        return jsonify({'success': False, 'message': 'Dados incompletos!'}), 400
    if not EMAIL_RE.match(email):
        return jsonify({'success': False, 'message': 'E-mail inválido.'}), 400
    if Email.query.filter_by(email=email).first():
        return jsonify({'success': False, 'message': 'E-mail já cadastrado.'}), 409

    novo_email = Email(email=email, latitude=latitude, longitude=longitude)
    db.session.add(novo_email)
    db.session.commit()

    descadastro_link = f"http://localhost:5000/descadastrar?email={email}"

    msg = Message(
        subject='Cadastro confirmado - Monitoramento UV',
        sender=app.config['MAIL_USERNAME'],
        recipients=[email],
        body=(
            "Olá! Seu e-mail foi cadastrado com sucesso para receber notificações UV.\n\n"
            f"Sua localização aproximada: {latitude}, {longitude}.\n\n"
            "Se quiser parar de receber notificações, clique no link abaixo:\n"
            f"{descadastro_link}"
        )
    )
    try:
        mail.send(msg)
    except Exception as e:
        db.session.delete(novo_email)
        db.session.commit()
        return jsonify({'success': False, 'message': f'Falha ao enviar e-mail: {e}'}), 500

    return jsonify({'success': True, 'message': 'Cadastro feito com sucesso! Verifique seu e-mail.'}), 200

# --------------------- Rota de Descadastro ---------------------
@app.route('/descadastrar')
def descadastrar():
    email = (request.args.get('email') or '').strip()
    if not email:
        return "E-mail não informado.", 400
    registro = Email.query.filter_by(email=email).first()
    if not registro:
        return "E-mail não encontrado ou já descadastrado.", 404
    db.session.delete(registro)
    db.session.commit()
    return "Você foi descadastrado com sucesso. ✅"

# --------------------- Envio diário ---------------------
def envia_emails_diarios():
    with app.app_context():
        emails = Email.query.all()
        total_enviados = 0
        total_falhas = 0
        print(f"[envio] Iniciando envio para {len(emails)} emails...")

        for e in emails:
            uv = consulta_uv(e.latitude, e.longitude)
            nivel = texto_nivel(uv)  # já trata uv=None com texto

            descadastro_link = f"http://localhost:5000/descadastrar?email={e.email}"
            email_html = render_email(
                uv=uv if uv is not None else "Indisponível",
                nivel=nivel,
                descadastro_link=descadastro_link
            )

            msg = Message(
                subject='☀️ Alerta Diário - Índice UV',
                sender=app.config['MAIL_USERNAME'],
                recipients=[e.email],
                html=email_html
            )
            try:
                mail.send(msg)
                total_enviados += 1
                print(f"[envio] ✅ Enviado para {e.email} (UV={uv})")
            except Exception as erro:
                total_falhas += 1
                print(f"[envio] ❌ Falha para {e.email}: {erro}")

        print(f"[envio] Finalizado: {total_enviados} enviados, {total_falhas} falhas.")

# --------------------- Rotas utilitárias ---------------------
@app.route('/testar_envio')
def testar_envio():
    envia_emails_diarios()
    return 'Notificações enviadas com sucesso (teste manual)!'

# --------------------- Scheduler/Boot ---------------------
scheduler = BackgroundScheduler(daemon=True, timezone="America/Sao_Paulo")
# dispara todo dia às 8:30 no fuso de SP
scheduler.add_job(envia_emails_diarios, 'cron', hour=8, minute=30, id='envio_diario_uv')

def log_next_runs():
    for job in scheduler.get_jobs():
      print(f"[scheduler] Job {job.id} -> próximo disparo: {job.next_run_time}")

if __name__ == '__main__':
    scheduler.start()
    log_next_runs()
    app.run(debug=True, use_reloader=False)  

    # graficos sobre o cancer #



    from flask import Flask, jsonify, render_template, request
import mysql.connector
import pandas as pd


app = Flask(__name__)
app.url_map.strict_slashes = False  # evita 404 por "/" no fim


# Conexão MySQL 

def get_db():
    return mysql.connector.connect(
        host="localhost",
        port=3306,
        user="root",
        password="@Bruxado71",
        database="tcc"
    )


# Rotas básicas

@app.route("/ping")
def ping():
    return "pong", 200

@app.route("/")
def index():
   
    try:
        return render_template("index.html")
    except Exception:
        return "<h1>Flask OK</h1><p>Crie templates/index.html para carregar o site completo.</p>"


# 1) Histórico de incidências por ano (2000–2023)
# Tabela: incidencia_clima_unificado_stage
# Coluna do ano: ano_cmpt (varchar) -> CAST para número

@app.route("/api/incidencia/anual")
def incidencia_anual():
    start = int(request.args.get("start", 2000))
    end   = int(request.args.get("end", 2023))
    conn = get_db()
    try:
        df = pd.read_sql(f"""
            SELECT CAST(ano_cmpt AS UNSIGNED) AS ano, COUNT(*) AS casos
            FROM incidencia_clima_unificado_stage
            WHERE CAST(ano_cmpt AS UNSIGNED) BETWEEN {start} AND {end}
            GROUP BY ano
            ORDER BY ano
        """, conn)
    finally:
        conn.close()
    return jsonify(df.to_dict(orient="records"))


# 2) Preditivo até 2033 (modelo selecionável)
# Tabela: resultadosprevisoes_cancer_pele
# Colunas: year, model, point, lo95, hi95

@app.route("/api/preditivo/anual")
def preditivo_anual():
    modelo = request.args.get("modelo", "Prophet")  # ARIMA | ETS
    conn = get_db()
    try:
        df = pd.read_sql("""
            SELECT year AS ano, model AS modelo, point, lo95, hi95
            FROM resultadosprevisoes_cancer_pele
            ORDER BY ano
        """, conn)
    finally:
        conn.close()

    # Filtra pelo modelo solicitado 
    df = df[df["modelo"].str.upper() == modelo.upper()]
    return jsonify(df.to_dict(orient="records"))


# 3) Correlação UV x Casos (média anual de UV + total anual de casos)
# Casos/ano: incidencia_clima_unificado_stage (ano_cmpt)
# UV: resultadosprevisoes_cancer_pele (indice_uv como varchar -> CAST p/ DECIMAL)

@app.route("/api/correlacao/uv-incidencia")
def correlacao_uv():
    start = int(request.args.get("start", 2000))
    end   = int(request.args.get("end", 2023))
    conn = get_db()
    try:
        query = f"""
            SELECT 
                i.ano,
                COUNT(*) AS casos,
                AVG(CAST(r.indice_uv AS DECIMAL(10,2))) AS uv_medio
            FROM (
                SELECT CAST(ano_cmpt AS UNSIGNED) AS ano
                FROM incidencia_clima_unificado_stage
                WHERE CAST(ano_cmpt AS UNSIGNED) BETWEEN {start} AND {end}
            ) i
            LEFT JOIN resultadosprevisoes_cancer_pele r
                ON CAST(r.ano AS UNSIGNED) = i.ano  -- r.ano é varchar(50) na sua tabela
            GROUP BY i.ano
            ORDER BY i.ano
        """
        df = pd.read_sql(query, conn)
    finally:
        conn.close()
    return jsonify(df.to_dict(orient="records"))


# Start

if __name__ == "__main__":
    # imprime as rotas registradas ao iniciar (
    with app.app_context():
        print("\n=== URL MAP ===")
        print(app.url_map)
        print("===============\n")

    # força host/porta explícitos
    app.run(host="127.0.0.1", port=5000, debug=True)
