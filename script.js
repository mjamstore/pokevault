const API_URL = "https://api.pokemontcg.io/v2/cards";
let minhaColecao = JSON.parse(localStorage.getItem('minhaColecao')) || [];

document.addEventListener('DOMContentLoaded', () => {
    const inputBusca = document.getElementById('cardName');
    if (inputBusca) {
        inputBusca.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') buscarCarta();
        });
    }
    atualizarDropdownSets();
    renderizarColecao();
});

// ATUALIZA TODA A INTELIGÊNCIA DO SITE
function atualizarDashboard() {
    // 1. Números Básicos
    document.getElementById('stat-total').innerText = minhaColecao.length;
    
    const setsUnicos = [...new Set(minhaColecao.map(c => c.set))];
    document.getElementById('stat-sets').innerText = setsUnicos.length;
    
    const statLast = document.getElementById('stat-last');
    if (minhaColecao.length > 0) {
        statLast.innerText = minhaColecao[minhaColecao.length - 1].nome;
    }

    // 2. Carta em Destaque Aleatória
    const displayDestaque = document.getElementById('featured-display');
    if (minhaColecao.length > 0) {
        const indexAleatorio = Math.floor(Math.random() * minhaColecao.length);
        const destaque = minhaColecao[indexAleatorio];
        displayDestaque.innerHTML = `
            <img src="${destaque.imagem}" alt="${destaque.nome}">
            <p style="margin-top:10px; font-weight:600; color: #ffcb05;">${destaque.nome}</p>
        `;
    }

    // 3. Sistema de Progresso por Coleção
    atualizarProgressoColecoes();
}

function atualizarProgressoColecoes() {
    const progressList = document.getElementById('progress-list');
    if (!progressList) return;

    // Agrupa cartas por Expansão
    const resumoSets = {};
    minhaColecao.forEach(carta => {
        if (!resumoSets[carta.set]) {
            resumoSets[carta.set] = {
                possuidas: 0,
                totalSet: parseInt(carta.total) || 0
            };
        }
        resumoSets[carta.set].possuidas++;
    });

    // Converte para array e ordena pelos mais completos
    const setsArray = Object.keys(resumoSets).map(nomeSet => {
        const dados = resumoSets[nomeSet];
        const porcentagem = (dados.possuidas / dados.totalSet) * 100;
        return { nome: nomeSet, ...dados, porcentagem };
    });

    setsArray.sort((a, b) => b.porcentagem - a.porcentagem);

    // Renderiza as barras
    progressList.innerHTML = "";
    setsArray.forEach(set => {
        const div = document.createElement('div');
        div.className = 'progress-item';
        
        const tagWorthIt = set.porcentagem >= 75 ? '<span class="worth-it-tag">Worth it!</span>' : '';

        div.innerHTML = `
            <div class="progress-info">
                <span class="progress-name">${set.nome} ${tagWorthIt}</span>
                <span class="progress-count">${set.possuidas} / ${set.totalSet}</span>
            </div>
            <div class="progress-bar-bg">
                <div class="progress-fill" style="width: ${set.porcentagem}%"></div>
            </div>
            <p style="font-size: 0.6rem; color: #666; margin-top: 5px; text-align: right;">${set.porcentagem.toFixed(1)}% completo</p>
        `;
        progressList.appendChild(div);
    });
}

// BUSCA NA API
async function buscarCarta() {
    let busca = document.getElementById('cardName').value.trim();
    const gridResultados = document.getElementById('results-grid');
    const tituloBusca = document.getElementById('search-title');
    
    if (!busca) return;
    
    tituloBusca.style.display = "block";
    gridResultados.innerHTML = "<p>Consultando banco de dados TCG...</p>";

    try {
        let query = busca.includes('/') ? 
            `number:${busca.split('/')[0].trim()} set.printedTotal:${busca.split('/')[1].trim()}` : 
            `name:"${busca}*"`;

        const resposta = await fetch(`${API_URL}?q=${query}`);
        const dados = await resposta.json();
        const cartas = dados.data;

        gridResultados.innerHTML = "";
        if (!cartas || cartas.length === 0) {
            gridResultados.innerHTML = "<p>Nenhuma carta encontrada.</p>";
            return;
        }

        cartas.forEach(carta => {
            const div = document.createElement('div');
            div.className = 'card-item';
            div.innerHTML = `
                <img src="${carta.images.small}" loading="lazy">
                <p><strong>${carta.name}</strong></p>
                <small>${carta.set.name}</small>
                <button class="btn-add" onclick="adicionarColecao('${carta.id}', '${carta.name}', '${carta.images.small}', '${carta.set.name}', '${carta.number}', '${carta.set.printedTotal}')">ADICIONAR</button>
            `;
            gridResultados.appendChild(div);
        });
    } catch (e) {
        gridResultados.innerHTML = "<p>Erro na conexão com a API.</p>";
    }
}

function adicionarColecao(id, nome, imagem, set, num, total) {
    if (minhaColecao.find(c => c.id === id)) {
        mostrarNotificacao(`Você já tem ${nome}!`);
        return;
    }
    minhaColecao.push({ id, nome, imagem, set, num, total, dataAdicao: Date.now() });
    localStorage.setItem('minhaColecao', JSON.stringify(minhaColecao));
    atualizarDropdownSets();
    renderizarColecao();
    mostrarNotificacao(`✅ ${nome} adicionado!`);
}

function renderizarColecao() {
    const grid = document.getElementById('collection-grid');
    const termo = document.getElementById('filterInput').value.toLowerCase();
    const setEscolhido = document.getElementById('setFilter').value;
    const ordem = document.getElementById('sortOrder').value;

    let filtradas = minhaColecao.filter(c => {
        return c.nome.toLowerCase().includes(termo) && (setEscolhido === "all" || c.set === setEscolhido);
    });

    filtradas.sort((a, b) => {
        if (ordem === "name") return a.nome.localeCompare(b.nome);
        return b.dataAdicao - a.dataAdicao;
    });

    grid.innerHTML = "";
    filtradas.forEach(item => {
        const div = document.createElement('div');
        div.className = 'card-item';
        div.innerHTML = `
            <img src="${item.imagem}" loading="lazy">
            <p><strong>${item.nome}</strong></p>
            <small>${item.set}</small>
            <button class="btn-remove" onclick="removerCarta('${item.id}')">Remover</button>
        `;
        grid.appendChild(div);
    });

    atualizarDashboard();
}

// UTILITÁRIOS
function removerCarta(id) {
    if (confirm("Remover esta carta?")) {
        minhaColecao = minhaColecao.filter(c => c.id !== id);
        localStorage.setItem('minhaColecao', JSON.stringify(minhaColecao));
        atualizarDropdownSets();
        renderizarColecao();
    }
}

function mostrarNotificacao(m) {
    const t = document.getElementById("toast");
    t.innerText = m;
    t.className = "show";
    setTimeout(() => t.className = "", 3000);
}

function atualizarDropdownSets() {
    const f = document.getElementById('setFilter');
    const s = [...new Set(minhaColecao.map(c => c.set))].sort();
    f.innerHTML = '<option value="all">Todas as Coleções</option>';
    s.forEach(x => {
        const o = document.createElement('option'); o.value = o.innerText = x;
        f.appendChild(o);
    });
}

function exportarColecao() {
    const data = JSON.stringify(minhaColecao);
    const blob = new Blob([data], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = "pokevault_backup.json";
    link.click();
}

function importarColecao(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const importadas = JSON.parse(e.target.result);
        importadas.forEach(nova => {
            if (!minhaColecao.find(c => c.id === nova.id)) minhaColecao.push(nova);
        });
        localStorage.setItem('minhaColecao', JSON.stringify(minhaColecao));
        renderizarColecao();
        mostrarNotificacao("Coleção sincronizada!");
    };
    reader.readAsText(file);
}

function resetarPagina() { window.scrollTo({ top: 0, behavior: 'smooth' }); }