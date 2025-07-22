// scripts.js

function smoothScrollTo(targetElement, duration = 1000) {
  const start = window.pageYOffset;
  const targetPosition = targetElement.getBoundingClientRect().top + start;
  const distance = targetPosition - start;
  let startTime = null;

  function easeInOutQuad(t, b, c, d) {
    t /= d/2;
    if (t < 1) return c/2*t*t + b;
    t--;
    return -c/2 * (t*(t-2) -1) + b;
  }

  function animation(currentTime) {
    if (!startTime) startTime = currentTime;
    const timeElapsed = currentTime - startTime;
    const run = easeInOutQuad(timeElapsed, start, distance, duration);
    window.scrollTo(0, run);
    if (timeElapsed < duration) {
      requestAnimationFrame(animation);
    }
  }

  requestAnimationFrame(animation);
}

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const targetID = this.getAttribute('href');
    const target = document.querySelector(targetID);
    if (target) {
      smoothScrollTo(target, 1500); // Duração em ms, ajuste para mais lento ou rápido ao clicar no botão e descer a tela
    }
  });
});

// modal que fala sobre o dezembro laranja //
document.addEventListener('DOMContentLoaded', function() {
  const modal = document.getElementById('myModal');
  const openModalBtn = document.getElementById('openModalBtn');
  const closeModalBtn = document.getElementById('closeModalBtn');

  openModalBtn.addEventListener('click', function(e) {
    e.preventDefault();
    modal.style.display = 'block';
  });

  closeModalBtn.addEventListener('click', function() {
    modal.style.display = 'none';
  });

  window.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });
});

// e-mail do cliente //

function enviarLocalizacao() {
  const email = document.getElementById('email').value.trim();

  if (!email) {
    mostrarMensagem('Por favor, preencha o e-mail.', true);
    return;
  }

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      const data = {
        email: email,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };

      fetch('/cadastro_email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      .then(response => response.json())
      .then(data => {
        mostrarMensagem(data.message, !data.success);
        document.getElementById('email').value = '';
      })
      .catch(() => mostrarMensagem('Erro ao enviar os dados.', true));
    }, function(error) {
      mostrarMensagem('Não foi possível obter a localização: ' + error.message, true);
    });
  } else {
    mostrarMensagem('Geolocalização não suportada no seu navegador.', true);
  }
}

function mostrarMensagem(texto, isError) {
  const div = document.getElementById('mensagem');
  div.textContent = texto;
  div.className = isError ? 'error' : 'msg';
}


// ajustes dos cards embaixo //

document.addEventListener("DOMContentLoaded", () => {
  const cards = document.querySelectorAll('.scroll-reveal');

  console.log("🔎 Total de cards encontrados:", cards.length);

  function revealOnScroll() {
    const windowHeight = window.innerHeight;
    cards.forEach(card => {
      const cardTop = card.getBoundingClientRect().top;

      if (cardTop < windowHeight - 50 && !card.classList.contains("visible")) {
        card.classList.add('visible');
        console.log("🟠 Card revelado:", card.querySelector('h3')?.textContent);
      }
    });
  }

  window.addEventListener('scroll', revealOnScroll);
});

// perguntas e respostas - teste de conhecimento //

// ========== Animação dos cards scroll-reveal ==========
const cards = document.querySelectorAll('.scroll-reveal');

function revealOnScroll() {
  const windowHeight = window.innerHeight;
  cards.forEach(card => {
    const cardTop = card.getBoundingClientRect().top;
    if (cardTop < windowHeight - 50) {
      card.classList.add('visible');
    }
  });
}

window.addEventListener('scroll', revealOnScroll);
window.addEventListener('load', revealOnScroll);

// ========== Lógica do Quiz ==========
document.addEventListener("DOMContentLoaded", () => {
  const perguntas = [
    {
      pergunta: "1. Qual o horário mais perigoso para se expor ao sol?",
      opcoes: [
        { texto: "Antes das 9h", valor: "a" },
        { texto: "Entre 10h e 16h", valor: "b" },
        { texto: "Após as 17h", valor: "c" }
      ],
      correta: "b"
    },
    {
      pergunta: "2. Qual o fator de proteção solar (FPS) mínimo recomendado?",
      opcoes: [
        { texto: "FPS 15", valor: "a" },
        { texto: "FPS 20", valor: "b" },
        { texto: "FPS 30", valor: "c" }
      ],
      correta: "c"
    },
    {
      pergunta: "3. Quais sinais na pele devem ser observados com atenção?",
      opcoes: [
        { texto: "Mudança de cor, forma ou sangramento", valor: "a" },
        { texto: "Pintas pequenas e claras", valor: "b" },
        { texto: "Pele ressecada", valor: "c" }
      ],
      correta: "a"
    },
    {
      pergunta: "4. Qual é o tipo de câncer mais comum no Brasil?",
      opcoes: [
        { texto: "Câncer de mama", valor: "a" },
        { texto: "Câncer de pele", valor: "b" },
        { texto: "Câncer de próstata", valor: "c" }
      ],
      correta: "b"
    },
    {
      pergunta: "5. Usar chapéu e óculos escuros ajuda na prevenção?",
      opcoes: [
        { texto: "Sim", valor: "a" },
        { texto: "Não", valor: "b" }
      ],
      correta: "a"
    }
  ];

  let perguntaAtual = 0;
  let respostas = [];

  const container = document.getElementById("pergunta-container");
  const botao = document.getElementById("botao-proximo");
  const resultadoDiv = document.getElementById("resultado-quiz");
  const barraProgresso = document.getElementById("barra-progresso");

  function exibirPergunta() {
    const p = perguntas[perguntaAtual];
    container.innerHTML = `
      <p>${p.pergunta}</p>
      ${p.opcoes.map(o => `
        <label>
          <input type="radio" name="resposta" value="${o.valor}"> ${o.texto}
        </label><br>
      `).join('')}
    `;
    atualizarProgresso(); // Atualiza a barra aqui
  }

  function atualizarProgresso() {
    const progresso = ((perguntaAtual) / perguntas.length) * 100;
    barraProgresso.style.width = `${progresso}%`;
  }

  botao.addEventListener("click", () => {
    const selecionada = document.querySelector('input[name="resposta"]:checked');
    if (!selecionada) {
      alert("Por favor, selecione uma resposta antes de continuar.");
      return;
    }

    respostas.push(selecionada.value);
    perguntaAtual++;

    if (perguntaAtual < perguntas.length) {
      exibirPergunta();
    } else {
      calcularResultado();
      botao.style.display = "none";
      barraProgresso.style.width = "100%"; // Completa ao final
    }
  });

  function calcularResultado() {
    let acertos = 0;
    respostas.forEach((r, i) => {
      if (r === perguntas[i].correta) acertos++;
    });

    resultadoDiv.innerHTML = `
      <h3>Resultado:</h3>
      <p>Você acertou <strong>${acertos} de ${perguntas.length}</strong> perguntas.</p>
    `;
  }

  exibirPergunta(); // Inicia com a primeira pergunta
});
