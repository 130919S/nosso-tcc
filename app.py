from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_mail import Mail, Message
from apscheduler.schedulers.background import BackgroundScheduler
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)  # Permite requisições externas (do frontend)
app.secret_key = 'cadastro'
app.config['TEMPLATES_AUTO_RELOAD'] = True  # recarrega template no dev

# Configurações do banco (MySQL)
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+mysqlconnector://root:%40Bruxado71@localhost/tcc_emails'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Configurações do Flask-Mail
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'radiacaouv123@gmail.com'
app.config['MAIL_PASSWORD'] = 'hxauakmvbaaxlvfx'  # senha de app Google

db = SQLAlchemy(app)
mail = Mail(app)

class Email(db.Model):
    __tablename__ = 'emails_clientes'  # nome correto da tabela no banco
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)

@app.after_request
def add_header(response):
    # Evita cache durante o desenvolvimento
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/cadastro_email', methods=['POST'])
def cadastro_email():
    data = request.get_json()
    email = data.get('email')
    latitude = data.get('latitude')
    longitude = data.get('longitude')

    if not email or latitude is None or longitude is None:
        return jsonify({'success': False, 'message': 'Dados incompletos!'}), 400

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
        body=f"Olá! Seu e-mail foi cadastrado com sucesso para receber notificações UV.\n\n"
        f"Sua localização aproximada: {latitude}, {longitude}.\n\n"
        f"Se quiser parar de receber notificações, clique no link abaixo:\n"
        f"{descadastro_link}"
    )
    mail.send(msg)

    return jsonify({'success': True, 'message': 'Cadastro feito com sucesso! Verifique seu e-mail.'})

def consulta_uv(latitude, longitude):
    api_key = '3f59fb330add1cfad36119abb1e4d8cb'
    url = f'https://api.openweathermap.org/data/2.5/onecall?lat={latitude}&lon={longitude}&exclude=minutely,hourly,daily,alerts&appid={api_key}'

    try:
        response = requests.get(url)
        data = response.json()
        print("Resposta da API:", data)  # para debug
        
        # Pega diretamente o valor do índice UV que está no campo "value"
        uv_index = data.get('value')
        if uv_index is None:
            print("Índice UV não encontrado na resposta")
            return None
        return uv_index

    except Exception as e:
        print(f'Erro ao consultar índice UV: {e}')
        return None

def envia_emails_diarios():
    with app.app_context():
        emails = Email.query.all()
        for e in emails:
            uv = consulta_uv(e.latitude, e.longitude)
            if uv is None:
                continue

            if uv >= 11:
                nivel = "🌡️ Extremamente alto! Evite exposição total ao sol!"
            elif uv >= 8:
                nivel = "⚠️ Muito alto! Evite exposição ao sol das 10h às 16h."
            elif uv >= 6:
                nivel = "🌞 Alto! Use protetor solar e evite longas exposições."
            elif uv >= 3:
                nivel = "🧴 Moderado. Use proteção, principalmente em horários de pico."
            else:
                nivel = "✅ Baixo. Ainda assim, proteção nunca é demais!"

            descadastro_link = f"http://localhost:5000/descadastrar?email={e.email}"
            corpo = (
                f"Olá!\n"
                f"O índice UV da sua região hoje é: {uv}\n\n"
                f"{nivel}"
                f"Se quiser parar de receber essas notificações, clique aqui:\n{descadastro_link}"
            )

            msg = Message(
                subject='☀️ Alerta Diário - Índice UV',
                sender=app.config['MAIL_USERNAME'],
                recipients=[e.email],
                body=corpo
            )

            try:
                mail.send(msg)
                print(f"Notificação enviada para {e.email}")
            except Exception as erro:
                print(f"Erro ao enviar e-mail para {e.email}: {erro}")

@app.route('/testar_envio')
def testar_envio():
    envia_emails_diarios()
    return 'Notificações enviadas com sucesso (teste manual)!'

scheduler = BackgroundScheduler()
scheduler.add_job(func=envia_emails_diarios, trigger='cron', hour=8)
scheduler.start()

if __name__ == '__main__':
    app.run(debug=True)

@app.route('/descadastrar')
def descadastrar():
    email = request.args.get('email')
    if not email:
        return "E-mail não informado.", 400

    registro = Email.query.filter_by(email=email).first()
    if not registro:
        return "E-mail não encontrado.", 404

    db.session.delete(registro)
    db.session.commit()
    return f"O e-mail {email} foi descadastrado com sucesso!"

