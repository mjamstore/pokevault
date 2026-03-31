const API_URL = "https://api.pokemontcg.io/v2/cards";
let minhaColecao = JSON.parse(localStorage.getItem('minhaColecao')) || [];

document.addEventListener('DOMContentLoaded', () => {
    const inputBusca = document.getElementById('cardName');
    if (inputBusca) {
        inputBusca.addEventListener('keypress', (e) => { if (e.key === 'Enter') buscarCarta(); });
    }
    atualizarDropdownSets();
    renderizarColecao();
});

function atualizarDashboard() {
    document.getElementById('stat-total').innerText = minhaColecao.length;
    const sets = [...new Set(minhaColecao.map(c => c.set))];
    document.getElementById('stat-sets').innerText = sets.length;
    const statLast = document.getElementById('stat-last');
    if (minhaColecao.length > 0) {
        statLast.innerText = minhaColecao[minhaColecao.length - 1].nome;
    }

    const displayDestaque = document.getElementById('featured-display');
    if (minhaColecao.length > 0) {
        const indexAleatorio = Math.floor(Math.random() * minhaColecao.length);
        const destaque = minhaColecao[indexAleatorio];
        displayDestaque.innerHTML = `
            <img src="${destaque.imagem}" alt="${destaque.nome}">
            <p style="margin-top:10px; font-weight:600; color: #ffcb05;">${destaque.nome}</p>
        `;
    }
}

async function buscarCarta() {
    let busca = document.getElementById('cardName').value.trim();
    const gridResultados = document.getElementById('results-grid');
    const tituloBusca = document.getElementById('search-title');
    if (!busca) return;
    tituloBusca.style.display = "block";
    gridResultados.innerHTML = "<p>Buscando na Pokédex...</p>";
    try {
        let query = busca.includes('/') ? `number:${busca.split('/')[0].trim()} set.printedTotal:${busca.split('/')[1].trim()}` : `name:"${busca}*"`;
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
                <div class="btn-container">
                    <button class="btn-add" onclick="adicionarColecao('${carta.id}', '${carta.name}', '${carta.images.small}', '${carta.set.name}', '${carta.number}', '${carta.set.printedTotal}')">ADICIONAR</button>
                </div>
            `;
            gridResultados.appendChild(div);
        });
    } catch (e) { gridResultados.innerHTML = "<p>Erro na conexão com a API.</p>"; }
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
    mostrarNotificacao(`✅ ${nome} capturado!`);
}

function renderizarColecao() {
    const grid = document.getElementById('collection-grid');
    const termoBusca = document.getElementById('filterInput').value.toLowerCase();
    const setEscolhido = document.getElementById('setFilter').value;
    const ordem = document.getElementById('sortOrder').value;

    let filtradas = minhaColecao.filter(c => {
        return c.nome.toLowerCase().includes(termoBusca) && (setEscolhido === "all" || c.set === setEscolhido);
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

function removerCarta(id) {
    if (confirm("Remover da coleção?")) {
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
    const d = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(minhaColecao));
    const l = document.createElement('a'); l.setAttribute("href", d); l.setAttribute("download", "pokevault_backup.json"); l.click();
}

function importarColecao(e) {
    const a = e.target.files[0]; if (!a) return;
    const r = new FileReader();
    r.onload = (x) => {
        const i = JSON.parse(x.target.result);
        i.forEach(n => { if (!minhaColecao.find(c => c.id === n.id)) minhaColecao.push(n); });
        localStorage.setItem('minhaColecao', JSON.stringify(minhaColecao));
        atualizarDropdownSets(); renderizarColecao();
        mostrarNotificacao("Coleção sincronizada!");
    };
    r.readAsText(a);
}

function resetarPagina() { window.scrollTo({ top: 0, behavior: 'smooth' }); }
