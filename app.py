# =============================================================================
# Sistema de Monitoramento de Radiação UV com Flask
#
# Tecnologias envolvidas:
# - Flask (framework web)
# - Flask-Mail (envio de e-mails via Gmail)
# - SQLAlchemy (ORM para MySQL)
# - APScheduler (agendamento de tarefas diárias)
# - MJML (template de e-mail moderno e responsivo)
# =============================================================================


from flask import Flask, render_template, request, jsonify, render_template_string
from flask_sqlalchemy import SQLAlchemy
from flask_mail import Mail, Message
from apscheduler.schedulers.background import BackgroundScheduler
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)
app.secret_key = 'cadastro'
app.config['TEMPLATES_AUTO_RELOAD'] = True

# Configura a conexão com o banco de dados MySQL e desativa o rastreamento de modificações
# SQLALCHEMY_DATABASE_URI: define a URL do banco (usuário, senha, host e nome do banco)
# SQLALCHEMY_TRACK_MODIFICATIONS: desativa monitoramento automático para economizar recursos
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+mysqlconnector://root:%40Bruxado71@localhost/tcc_emails'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Configurações do Flask-Mail
app.config['MAIL_SERVER'] = 'smtp.gmail.com' # Servidor SMTP do Gmail
app.config['MAIL_PORT'] = 587   # Porta para envio com TLS
app.config['MAIL_USE_TLS'] = True  # Habilita criptografia TLS
app.config['MAIL_USERNAME'] = 'radiacaouv123@gmail.com'  # E-mail remetente usado para envio
app.config['MAIL_PASSWORD'] = 'hxauakmvbaaxlvfx'  # Senha de app gerada no Gmail

db = SQLAlchemy(app)  # Inicializa a extensão SQLAlchemy para gerenciar o banco de dados
mail = Mail(app)      # Inicializa o Flask-Mail para envio de e-mails

class Email(db.Model):                                       # Define o modelo Email vinculado ao banco de dados
    __tablename__ = 'emails_clientes'                        # Nome da tabela no banco
    id = db.Column(db.Integer, primary_key=True)             # ID único para cada registro (chave primária)
    email = db.Column(db.String(255), unique=True, nullable=False)  # E-mail do usuário (único e obrigatório)
    latitude = db.Column(db.Float)                           # Latitude da localização do usuário
    longitude = db.Column(db.Float)                          # Longitude da localização do usuário

@app.after_request                                 # Executa após cada requisição HTTP
def add_header(response):                         
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"  # Evita que o navegador armazene cache
    response.headers["Pragma"] = "no-cache"        # Compatibilidade com navegadores antigos
    response.headers["Expires"] = "0"              # Indica que o conteúdo expira imediatamente
    return response  

@app.route('/')                                 # Define a rota principal da aplicação (página inicial)
def home():                                     
    return render_template('index.html')        # Renderiza o template HTML chamado 'index.html'

@app.route('/cadastro_email', methods=['POST'])         # Rota que recebe os dados do e-mail via requisição POST
def cadastro_email():
    data = request.get_json()                           # Lê os dados enviados em formato JSON
    email = data.get('email')                           # Obtém o e-mail do JSON
    latitude = data.get('latitude')                     # Obtém a latitude do JSON
    longitude = data.get('longitude')                   # Obtém a longitude do JSON


     # Valida os dados recebidos:
# - Garante que e-mail, latitude e longitude foram informados;
# - Impede cadastro duplicado (e-mail já existente);
# - Salva o novo e-mail e localização no banco de dados.

    if not email or latitude is None or longitude is None:
        return jsonify({'success': False, 'message': 'Dados incompletos!'}), 400

    if Email.query.filter_by(email=email).first():
        return jsonify({'success': False, 'message': 'E-mail já cadastrado.'}), 409

    novo_email = Email(email=email, latitude=latitude, longitude=longitude)
    db.session.add(novo_email)
    db.session.commit()

        # Aqui permite que o usuario consiga se descadastrar para parar de receber os e-mails diarios 

    descadastro_link = f"http://localhost:5000/descadastrar?email={email}" 


    # Cria a mensagem de e-mail de confirmação de cadastro,
    # informando a localização aproximada do usuário e incluindo
    # o link para descadastro caso ele não queira mais receber alertas.


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

    # confirma que o cadastro do cliente foi feito

    return jsonify({'success': True, 'message': 'Cadastro feito com sucesso! Verifique seu e-mail.'})

# Consulta o índice UV atual com base na latitude e longitude do usuário
# usando a API do OpenWeatherMap. Retorna o valor do índice ou None em caso de erro.


def consulta_uv(latitude, longitude):
    api_key = '3f59fb330add1cfad36119abb1e4d8cb'
    url = f'https://api.openweathermap.org/data/2.5/uvi?lat={latitude}&lon={longitude}&appid={api_key}'

    try:
        response = requests.get(url)
        data = response.json()
        print("Resposta da API:", data)

        uv_index = data.get('value')
        if uv_index is None:
            print("Índice UV não encontrado na resposta")
            return None
        return uv_index

    except Exception as e:
        print(f'Erro ao consultar índice UV: {e}')
        return None
    
    # faz o envio dos e-mails para o cliente

def envia_emails_diarios():
    with app.app_context():
        emails = Email.query.all()
        for e in emails:
            uv = consulta_uv(e.latitude, e.longitude)
            if uv is None:
                continue

            if uv >= 11:
                nivel = """🌡️ Extremamente alto! O índice UV está perigosamente elevado.

⚠️ Riscos: Queimaduras em menos de 10 minutos, risco alto de câncer de pele e danos aos olhos.

📌 Cuidados essenciais:
- Evite sair ao sol entre 10h e 16h.
- Use protetor solar FPS 50+ e reaplique a cada 2 horas.
- Use chapéu de aba larga, óculos escuros com proteção UV e roupas com proteção solar.
- Busque sombra sempre que possível.
- Crianças e idosos devem evitar exposição direta.

🛑 Se puder, permaneça em locais cobertos durante esse período."""

            elif uv >= 8:
                nivel = """⚠️ Muito alto! O índice UV está elevado e pode causar danos sérios à pele e aos olhos.

📌 Cuidados recomendados:
- Evite exposição direta ao sol entre 10h e 16h.
- Use protetor solar com FPS 30+ e reaplique a cada 2 horas.
- Use chapéu, boné ou guarda-sol ao sair.
- Use óculos escuros com proteção UV.
- Prefira roupas de manga longa e tecidos leves.

🚸 Crianças, idosos e pessoas com pele clara devem redobrar os cuidados."""
            elif uv >= 6:
                nivel = """🌞 Alto! O índice UV pode causar danos à pele e aos olhos em exposições prolongadas.

📌 Dicas de proteção:
- Evite exposição direta ao sol entre 10h e 16h.
- Use protetor solar com FPS 30+ mesmo em dias nublados.
- Use boné, óculos escuros e roupas leves que cubram a pele.
- Prefira ambientes com sombra e mantenha-se hidratado.

📣 Fique atento(a): mesmo níveis altos podem causar danos cumulativos à pele com o tempo."""
            elif uv >= 3:
                nivel = """🧴 Moderado. O índice UV está dentro de níveis aceitáveis, mas ainda requer atenção.

📌 Dicas de proteção:
- Use protetor solar com FPS 15+ se for se expor ao sol por longos períodos.
- Prefira ficar na sombra entre 12h e 14h.
- Use óculos escuros e boné ou chapéu se for sair.

💡 Dica extra: mesmo em dias nublados, os raios UV continuam presentes!"""
            else:
                nivel = "✅ Baixo. Ainda assim, proteção nunca é demais!"

            descadastro_link = f"http://localhost:5000/descadastrar?email={e.email}"

            with open("email/email.html", "r", encoding="utf-8") as f:
                email_template = f.read()

                # 👇 Adicione os prints aqui para testar
            print("===== TEXTO ORIGINAL =====")
            print(repr(nivel))
            print("===== TEXTO COM <br> =====")
            print(nivel.replace('\n', '<br>'))

            email_html = render_template_string(
            email_template,
            uv=uv,
            nivel=nivel.replace('\n', '<br>'),
            descadastro_link=descadastro_link
            )

            email_html = render_template_string(
            email_template,
            uv=uv,
            nivel=nivel.replace('\n', '<br>'),
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
                print(f"Notificação enviada para {e.email}")
            except Exception as erro:
                print(f"Erro ao enviar e-mail para {e.email}: {erro}")

  # testa o envio de forma manual              

@app.route('/testar_envio')
def testar_envio():
    envia_emails_diarios()
    return 'Notificações enviadas com sucesso (teste manual)!'

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

# agenda um horário exato pra envio do e-mail

scheduler = BackgroundScheduler()
scheduler.add_job(func=envia_emails_diarios, trigger='cron', hour=12, minute=45)

if __name__ == '__main__':
    scheduler.start()
    app.run(debug=True, use_reloader=False)

