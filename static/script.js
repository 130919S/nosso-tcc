// scripts.js

// ===== Smooth scroll robusto com offset e cancelamento =====
(() => {
  const HEADER_HEIGHT =
    document.querySelector('.site-header')?.offsetHeight || 0; // ajuste se tiver header fixo
  const DURATION = 800; // ms (reduzir ajuda a tirar “travadinhas”)
  let rafId = null;

  const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  function cancelScroll() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    window.removeEventListener('wheel', cancelScroll, { passive: true });
    window.removeEventListener('touchstart', cancelScroll, { passive: true });
  }

  function smoothScrollToY(targetY, duration = DURATION) {
    cancelScroll();
    if (prefersReduced || duration <= 0) {
      window.scrollTo(0, targetY);
      return;
    }

    const startY = window.pageYOffset;
    const dist = targetY - startY;
    const startTime = performance.now();

    // cancelar se usuário rolar manualmente
    window.addEventListener('wheel', cancelScroll, { passive: true, once: true });
    window.addEventListener('touchstart', cancelScroll, { passive: true, once: true });

    function step(now) {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(t);
      const y = startY + dist * eased;

      window.scrollTo(0, Math.round(y));

      if (t < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        cancelScroll();
      }
    }

    rafId = requestAnimationFrame(step);
  }

  function getTargetY(el) {
    const rect = el.getBoundingClientRect();
    return Math.max(0, rect.top + window.pageYOffset - HEADER_HEIGHT);
  }

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const id = anchor.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;

      e.preventDefault();
      const y = getTargetY(target);
      smoothScrollToY(y);
    });
  });
})();


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

document.addEventListener('DOMContentLoaded', () => {
  const emailEl = document.getElementById('email');
  const msgEl   = document.getElementById('mensagem');
  const btn     = document.getElementById('btn-cadastrar');

  if (!emailEl || !btn) {
    console.error('IDs não encontrados (email / btn-cadastrar). Confira o HTML.');
    return;
  }

  // 🔹 modo recomendado (sem onclick no HTML)
  btn.addEventListener('click', enviarLocalizacao);

  // 🔹 compatibilidade: se ainda existir onclick="enviarLocalizacao()", funciona
  window.enviarLocalizacao = enviarLocalizacao;

  function enviarLocalizacao() {
    const email = (emailEl.value || '').trim();

    if (!msgEl) console.warn('Elemento #mensagem não encontrado (mensagens não serão exibidas).');

    if (!email) {
      mostrarMensagem('Por favor, preencha o e-mail.', true);
      return;
    }

    if (!navigator.geolocation) {
      mostrarMensagem('Geolocalização não suportada no seu navegador.', true);
      return;
    }

    mostrarMensagem('Coletando localização…');

    navigator.geolocation.getCurrentPosition(async (position) => {
      mostrarMensagem('Enviando…');

      try {
        const resp = await fetch('/cadastro_email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        });

        // trata erros HTTP (400/409/500) mostrando a mensagem do servidor
        if (!resp.ok) {
          const txt = await resp.text().catch(() => '');
          throw new Error(txt || `Falha no cadastro (HTTP ${resp.status})`);
        }

        const data = await resp.json().catch(() => ({}));
        mostrarMensagem(data.message || 'Cadastro realizado! ✅', false);
        emailEl.value = '';
      } catch (e) {
        console.error(e);
        mostrarMensagem('Erro ao enviar os dados. ' + (e.message || ''), true);
      }
    }, (error) => {
      mostrarMensagem('Não foi possível obter a localização: ' + error.message, true);
    }, { enableHighAccuracy: true, timeout: 8000 });
  }

  function mostrarMensagem(texto, isError) {
    if (!msgEl) return;
    msgEl.textContent = texto;
    msgEl.className = isError ? 'error' : 'msg';
  }
});

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
