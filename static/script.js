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

// busca de dermatologista // 

// arquivo: busca-derm.js
// arquivo: busca-derm.js
document.addEventListener('DOMContentLoaded', () => {
  // =========================
  // Seletores / Estado
  // =========================
  const mapEl = document.getElementById('mapDerm');
  const listaEl = document.getElementById('listaDerm');
  const btnBuscar = document.getElementById('btnBuscar');
  const radiusSelect = document.getElementById('radiusKm');
  const tipoSelect = document.getElementById('tipoLocal');
  const filtroGestao = document.getElementById('filtroGestao');

  const inputEndereco = document.getElementById('enderecoBusca');
  const btnEndereco = document.getElementById('btnEndereco');
  const btnUsarGps = document.getElementById('btnUsarGps');

  if (!mapEl || !listaEl || !btnBuscar || !radiusSelect || !tipoSelect) {
    console.error('busca-derm: elementos não encontrados. Verifique os IDs no HTML.');
    return;
  }

  let map, userMarker, userAccCircle, markersLayer;
  let userPos = { lat: -14.235, lon: -51.9253 }; // centro do Brasil
  const MAX_RESULTS = 30;

  // Mantém último conjunto já filtrado por Tipo (hospital/clinic/derm)
  let lastBaseList = []; // [{id, lat, lon, tags, name, addr, phone, website, score, dist, own}]

  // =========================
  // Utilidades
  // =========================
  function setStatus(msg) {
    listaEl.innerHTML = `<li>${msg}</li>`;
  }

  function haversineKm(lat1, lon1, lat2, lon2) {
    const toRad = v => (v * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  // =========================
  // Mapa e localização do usuário
  // =========================
  function initMap(lat, lon) {
    if (!map) {
      map = L.map(mapEl).setView([lat, lon], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);
      markersLayer = L.layerGroup().addTo(map);

      // clicar no mapa reposiciona a localização do usuário
      map.on('click', (e) => {
        setUserLocation(e.latlng.lat, e.latlng.lng, 50);
      });
    } else {
      map.setView([lat, lon], 14);
      markersLayer.clearLayers();
    }
    setUserLocation(lat, lon);
  }

  function setUserLocation(lat, lon, accuracyMeters = null) {
    userPos = { lat, lon };

    if (userMarker) userMarker.remove();
    userMarker = L.marker([lat, lon], { title: 'Sua posição', draggable: true })
      .addTo(map)
      .bindPopup('Sua localização (arraste para ajustar)').openPopup();

    userMarker.on('dragend', () => {
      const { lat: nlat, lng: nlon } = userMarker.getLatLng();
      setUserLocation(nlat, nlon, 30);
    });

    if (userAccCircle) userAccCircle.remove();
    if (accuracyMeters && Number.isFinite(accuracyMeters)) {
      userAccCircle = L.circle([lat, lon], {
        radius: Math.max(accuracyMeters, 20),
        color: '#4da3ff',
        fillColor: '#4da3ff',
        fillOpacity: 0.1,
        weight: 1
      }).addTo(map);
    }
  }

  function getUserLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('Geolocalização não suportada.'));
      navigator.geolocation.getCurrentPosition(
        pos => resolve(pos),
        err => reject(err),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  }

  // =========================
  // Overpass (consulta OSM)
  // =========================
  function buildOverpassQuery(lat, lon, radiusMeters, tipo) {
    const around = `around:${radiusMeters},${lat},${lon}`;
    const blocks = [];

    // Geral – hospitais
    if (tipo === 'hospital' || tipo === 'all') {
      blocks.push(`node[amenity=hospital](${around}); way[amenity=hospital](${around}); relation[amenity=hospital](${around});`);
    }
    // Geral – clínicas
    if (tipo === 'clinic' || tipo === 'all') {
      blocks.push(`node[amenity=clinic](${around}); way[amenity=clinic](${around}); relation[amenity=clinic](${around});`);
      blocks.push(`node[healthcare=clinic](${around}); way[healthcare=clinic](${around}); relation[healthcare=clinic](${around});`);
    }
    // Dermatologia (foco em especialidade)
    if (tipo === 'derm') {
      // médicos/consultórios com especialidade dermatologia
      blocks.push(`node[healthcare=doctor]["healthcare:speciality"~"dermatology",i](${around}); way[healthcare=doctor]["healthcare:speciality"~"dermatology",i](${around}); relation[healthcare=doctor]["healthcare:speciality"~"dermatology",i](${around});`);
      blocks.push(`node[healthcare=doctor]["healthcare:specialty"~"dermatology",i](${around}); way[healthcare=doctor]["healthcare:specialty"~"dermatology",i](${around}); relation[healthcare=doctor]["healthcare:specialty"~"dermatology",i](${around});`);
      blocks.push(`node["medical_specialty"~"dermatology",i](${around}); way["medical_specialty"~"dermatology",i](${around}); relation["medical_specialty"~"dermatology",i](${around});`);
      // departamentos de dermatologia
      blocks.push(`node[department=dermatology](${around}); way[department=dermatology](${around}); relation[department=dermatology](${around});`);
      // fallback por nome
      blocks.push(`node["name"~"Dermatolog|Dermato|Pele",i](${around}); way["name"~"Dermatolog|Dermato|Pele",i](${around}); relation["name"~"Dermatolog|Dermato|Pele",i](${around});`);
    }

    // No modo "all", além do geral, também puxamos itens com especialidade
    if (tipo === 'all') {
      blocks.push(`node[healthcare=doctor]["healthcare:speciality"~"dermatology",i](${around}); way[healthcare=doctor]["healthcare:speciality"~"dermatology",i](${around}); relation[healthcare=doctor]["healthcare:speciality"~"dermatology",i](${around});`);
      blocks.push(`node["medical_specialty"~"dermatology",i](${around}); way["medical_specialty"~"dermatology",i](${around}); relation["medical_specialty"~"dermatology",i](${around});`);
    }

    // Consulta ampliada (nodes + ways + relations) e pedindo centro geométrico
    return `
      [out:json][timeout:40];
      (
        ${blocks.join('\n')}
      );
      out center;
    `;
  }

  async function fetchOverpass(query) {
    const body = new URLSearchParams({ data: query });
    const opts = {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body
    };
    const endpoints = [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter'
    ];
    let lastErr;
    for (const url of endpoints) {
      try {
        console.log('Overpass →', url);
        const resp = await fetch(url, opts);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return await resp.json();
      } catch (e) {
        console.warn('Falha endpoint:', url, e);
        lastErr = e;
      }
    }
    throw lastErr || new Error('Falha Overpass');
  }

  function normalizeElement(e) {
    const lat = e.lat ?? e.center?.lat;
    const lon = e.lon ?? e.center?.lon;
    const tags = e.tags || {};
    const name = tags.name || 'Estabelecimento de saúde';
    const addr = [tags['addr:street'] || '', tags['addr:housenumber'] || '', tags['addr:city'] || '']
      .filter(Boolean).join(', ');
    const phone = tags.phone || tags.contact_phone || '';
    const website = tags.website || tags.contact_website || '';
    return { id: e.type + '/' + e.id, lat, lon, tags, name, addr, phone, website };
  }

  // =========================
  // Filtros de Dermatologia / Gestão
  // =========================
  function hasDermSpecialty(tags = {}) {
    const t = (k) => (tags[k] || '').toString().toLowerCase();
    const anyIncludes = (...vals) => vals.some(v => v && /dermato|dermatolog|skin|pele/.test(v));
    if (anyIncludes(t('healthcare:speciality'), t('healthcare:specialty'), t('medical_specialty'), t('department'))) return true;
    if (anyIncludes(t('name'))) return true;
    if (anyIncludes(t('speciality'), t('specialty'))) return true;
    return false;
  }

  function dermScore(tags = {}) {
    const t = (k) => (tags[k] || '').toString().toLowerCase();
    let s = 0;
    if (/dermato|dermatolog/.test(t('name'))) s += 3;
    if (/dermatology|dermatologia|skin|pele/.test(
      t('healthcare:speciality') || t('healthcare:specialty') || t('medical_specialty') || ''
    )) s += 4;
    if (/dermatology/.test(t('department'))) s += 2;
    if ((tags.healthcare || '') === 'doctor') s += 1;
    return s;
  }

  // Inferir gestão (público/privado) a partir das tags
  function inferOwnership(tags = {}) {
    const v = (k) => (tags[k] || '').toString().toLowerCase();

    const opType = v('operator:type'); // public/private/charity/…
    const ownership = v('ownership');   // public/private/municipal/state/…
    const operator = v('operator');     // texto livre (Prefeitura, SUS, Unimed…)

    // checks diretos
    if (['public', 'government', 'municipal', 'state', 'federal'].includes(opType)) return 'public';
    if (opType === 'private') return 'private';

    if (/(^|\b)(public|government|municipal|state|federal)(\b|$)/.test(ownership)) return 'public';
    if (/private/.test(ownership)) return 'private';

    // heurísticas pelo operador
    if (/(prefeitura|municipal|estadual|federal|secretaria|sus|ubs|posto de saúde|hospital universit[aá]rio)/.test(operator)) {
      return 'public';
    }
    if (/(santa casa|miseric[óo]rdia|irmandade|filant|benefic|unimed|hapvida|amil|bradesco|prevent senior)/.test(operator)) {
      // filantrópicos e planos tratamos como privados para o filtro simples
      return 'private';
    }

    return 'unknown';
  }

  function ownershipBadge(own) {
    if (own === 'public') return { label: 'Público', cls: 'badge badge-public' };
    if (own === 'private') return { label: 'Privado', cls: 'badge badge-private' };
    return { label: 'Indefinido', cls: 'badge badge-unknown' };
  }

  // =========================
  // Renderização + Filtro de Gestão
  // =========================
  function renderListAndMarkers(baseList) {
    markersLayer.clearLayers();

    // aplica filtro de gestão sem nova consulta
    const mode = (filtroGestao?.value || 'all');
    let lista = baseList.filter(p => {
      if (mode === 'public') return p.own === 'public';
      if (mode === 'private') return p.own === 'private';
      return true; // all
    });

    if (!lista.length) {
      setStatus('Nenhum resultado para este filtro. Tente alterar a gestão, o tipo ou aumentar o raio.');
      return;
    }

    lista = lista.slice(0, MAX_RESULTS);

    const frag = document.createDocumentFragment();
    for (const p of lista) {
      const m = L.marker([p.lat, p.lon]).addTo(markersLayer);
      m.bindPopup(`
        <strong>${p.name}</strong><br/>
        ${p.addr || 'Endereço não informado'}<br/>
        ${p.phone ? '☎ ' + p.phone + '<br/>' : ''}
        <a href="https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${userPos.lat}%2C${userPos.lon}%3B${p.lat}%2C${p.lon}" target="_blank">Rota (OSM)</a> |
        <a href="https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}" target="_blank">Rota (Google)</a>
        ${p.website ? `<br/><a href="${p.website}" target="_blank" rel="noopener">Site</a>` : ''}
      `);

      const { label, cls } = ownershipBadge(p.own);

      const li = document.createElement('li');
      li.className = 'busca-derm__item';
      li.innerHTML = `
        <div class="busca-derm__title">
          ${p.name}
          <span class="${cls}">${label}</span>
        </div>
        <div class="busca-derm__meta">${p.addr || 'Endereço não informado'} • ${p.dist.toFixed(1)} km</div>
        <div class="busca-derm__links">
          <a href="https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${userPos.lat}%2C${userPos.lon}%3B${p.lat}%2C${p.lon}" target="_blank">Rota (OSM)</a>
          <a href="https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}" target="_blank">Rota (Google)</a>
          ${p.phone ? `<a href="tel:${p.phone.replace(/\s+/g,'')}">Ligar</a>` : ''}
          ${p.website ? `<a href="${p.website}" target="_blank" rel="noopener">Site</a>` : ''}
        </div>
      `;
      li.addEventListener('mouseenter', () => m.openPopup());
      li.addEventListener('click', () => {
        map.setView([p.lat, p.lon], 16);
        m.openPopup();
      });
      frag.appendChild(li);
    }

    listaEl.innerHTML = '';
    listaEl.appendChild(frag);
  }

  function renderResults(elements, filtroTipo) {
    if (!elements.length) {
      setStatus('Nenhum resultado encontrado neste raio. Tente aumentar o raio ou mudar o tipo.');
      return;
    }

    // normaliza
    const norm = elements.map(normalizeElement).filter(p => p.lat && p.lon);

    // se derm, força especialidade; se vazio, fallback por nome
    let lista = norm;
    if (filtroTipo === 'derm') {
      let dermOnly = norm.filter(p => hasDermSpecialty(p.tags));
      if (!dermOnly.length) dermOnly = norm.filter(p => /dermato|dermatolog|pele|skin/i.test(p.name));
      lista = dermOnly;
      if (!lista.length) {
        setStatus('Nenhum local com dermatologia encontrado neste raio. Tente aumentar o raio ou usar "Todos".');
        return;
      }
    }

    // enriquece com score de derm, distância e gestão
    const enriched = lista
      .map(p => {
        const dist = haversineKm(userPos.lat, userPos.lon, p.lat, p.lon);
        const own = inferOwnership(p.tags);
        return { ...p, score: dermScore(p.tags), dist, own };
      })
      .sort((a, b) => (b.score - a.score) || (a.dist - b.dist));

    // guarda base para re-filtrar por gestão sem nova consulta
    lastBaseList = enriched;

    renderListAndMarkers(lastBaseList);
  }

  // =========================
  // Busca principal
  // =========================
  async function buscar() {
    setStatus('Buscando locais próximos…');
    const radiusKm = parseInt(radiusSelect.value, 10);
    const tipo = tipoSelect.value;
    const query = buildOverpassQuery(userPos.lat, userPos.lon, radiusKm * 1000, tipo);
    try {
      const data = await fetchOverpass(query);
      const elements = Array.isArray(data.elements) ? data.elements : [];
      console.log('Overpass retornou', elements.length, 'elementos');
      renderResults(elements, tipo);
    } catch (err) {
      console.error(err);
      setStatus('Erro ao buscar locais. Tente novamente em instantes.');
    }
  }

  // =========================
  // Eventos da UI
  // =========================
  btnBuscar.addEventListener('click', buscar);

  // re-filtra instantaneamente por gestão (sem nova consulta)
  filtroGestao?.addEventListener('change', () => {
    if (!lastBaseList.length) return;
    renderListAndMarkers(lastBaseList);
  });

  btnUsarGps?.addEventListener('click', async () => {
    try {
      const pos = await getUserLocation();
      initMap(pos.coords.latitude, pos.coords.longitude);
      setUserLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy || 100);
    } catch (e) {
      alert('Não foi possível obter sua localização. Use HTTPS/localhost e permita a permissão de localização.');
    }
  });

  btnEndereco?.addEventListener('click', async () => {
    const q = (inputEndereco?.value || '').trim();
    if (!q) return alert('Digite um endereço ou cidade.');
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=pt-BR&countrycodes=br&q=${encodeURIComponent(q)}`;
      const r = await fetch(url);
      const data = await r.json();
      if (!data.length) return alert('Endereço não encontrado.');
      const { lat, lon } = data[0];
      initMap(parseFloat(lat), parseFloat(lon));
      setUserLocation(parseFloat(lat), parseFloat(lon), 30);
    } catch (e) {
      console.error(e);
      alert('Falha ao buscar endereço.');
    }
  });

  // =========================
  // Inicialização
  // =========================
  initMap(userPos.lat, userPos.lon);
});


// graficos //

// Ajuste se sua API estiver em outra porta/origem
const API = "http://127.0.0.1:5000"; // "" = mesma origem do Flask (recomendado). Ex.: "http://localhost:5000"

async function getJSON(path){
  const r = await fetch(`${API}${path}`);
  if(!r.ok) throw new Error(`Erro ${r.status} ao carregar ${path}`);
  return await r.json();
}

// 1) Incidência anual (barras)
async function renderIncidencia(){
  const data = await getJSON("/api/incidencia/anual");
  const ctx = document.getElementById("incidenciaChart").getContext("2d");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: data.years,
      datasets: [{ label: "Casos (C43 + C44)", data: data.cases }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: true }, tooltip: { mode: "index", intersect: false } },
      scales: {
        x: { title: { display: true, text: "Ano" } },
        y: { title: { display: true, text: "Casos" }, beginAtZero: true }
      }
    }
  });
}

// 2) Preditivo (linhas + forecast tracejado)
async function renderForecast(){
  const data = await getJSON("/api/incidencia/preditivo");
  const ctx = document.getElementById("forecastChart").getContext("2d");
  const histLabels = data.history.years;
  const histCases  = data.history.cases;
  const fcLabels   = data.forecast.years;
  const fcCases    = data.forecast.cases;

  new Chart(ctx, {
    type: "line",
    data: {
      labels: [...histLabels, ...fcLabels],
      datasets: [
        { label: "Histórico", data: [...histCases, ...Array(fcCases.length).fill(null)], borderWidth: 2, tension: 0.2 },
        { label: "Previsão",  data: [...Array(histCases.length).fill(null), ...fcCases], borderWidth: 2, borderDash: [6,6], tension: 0.2 }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: true }, tooltip: { mode: "index", intersect: false } },
      scales: {
        x: { title: { display: true, text: "Ano" } },
        y: { title: { display: true, text: "Casos" }, beginAtZero: true }
      }
    }
  });
}

// 3) Correlação (eixo duplo) + Pearson
async function renderCorrelacao(){
  const data = await getJSON("/api/correlacao/uv");
  const ctx = document.getElementById("correlacaoChart").getContext("2d");

  new Chart(ctx, {
    type: "line",
    data: {
      labels: data.years,
      datasets: [
        { label: "Casos (C43 + C44)", data: data.cases, yAxisID: "y" },
        { label: "UV médio anual",   data: data.uv,    yAxisID: "y1" }
      ]
    },
    options: {
      responsive: true,
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { display: true } },
      scales: {
        y:  { type: "linear", position: "left",  title: { display: true, text: "Casos" }, beginAtZero: true },
        y1: { type: "linear", position: "right", title: { display: true, text: "UV médio" }, grid: { drawOnChartArea: false } },
        x:  { title: { display: true, text: "Ano" } }
      }
    }
  });

  const corr = typeof data.pearson === "number" ? data.pearson.toFixed(3) : "—";
  const el = document.getElementById("corrValor");
  if (el) el.textContent = `Correlação de Pearson (casos vs UV): ${corr}`;
}

// Boot
(async () => {
  try{
    await renderIncidencia();
    await renderForecast();
    await renderCorrelacao();
  }catch(err){
    console.error(err);
    alert("Erro ao carregar gráficos: " + err.message);
  }
})();

