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


