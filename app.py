from flask import Flask, render_template

app = Flask(__name__)
app.config['TEMPLATES_AUTO_RELOAD'] = True  # Recarrega HTML automaticamente

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

if __name__ == '__main__':
    app.run(debug=True, use_reloader=True)


# requisição para buscar o cep da pessoa, para envio do e-mail

from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_mail import Mail, Message

app = Flask(__name__)
app.secret_key = 'cadastro'

# Configurações do banco (MySQL)
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+mysqlconnector://root:senha@localhost/tcc_emails'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Configurações do Flask-Mail
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'radiacaouv123@gmail.com'  # Seu email
app.config['MAIL_PASSWORD'] = 'senha_de_app_google'      # Senha de app Google

db = SQLAlchemy(app)
mail = Mail(app)

class Email(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    cep = db.Column(db.String(20))

@app.route('/')
def home():
    return app.send_static_file('index.html')  # Serve o seu HTML estático, ou render_template se preferir

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

    # Enviar confirmação por e-mail
    msg = Message(
        subject='Cadastro confirmado - Monitoramento UV',
        sender=app.config['MAIL_USERNAME'],
        recipients=[email],
        body=f'Olá! Seu e-mail foi cadastrado com sucesso para receber notificações UV.\n\nSua localização aproximada: {latitude}, {longitude}.'
    )
    mail.send(msg)

    return jsonify({'success': True, 'message': 'Cadastro feito com sucesso! Verifique seu e-mail.'})

if __name__ == '__main__':
    app.run(debug=True)







