const API_URL = "https://api.pokemontcg.io/v2/cards";
let minhaColecao = JSON.parse(localStorage.getItem('minhaColecao')) || [];

document.addEventListener('DOMContentLoaded', () => {
    const inputBusca = document.getElementById('cardName');
    if (inputBusca) {
        inputBusca.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') buscarCarta();
        });
    }
    
    // Atualiza o menu de coleções e renderiza a lista
    atualizarDropdownSets();
    renderizarColecao();
});

// FUNÇÃO PARA CRIAR O MENU DE COLEÇÕES DINAMICAMENTE
function atualizarDropdownSets() {
    const setFilter = document.getElementById('setFilter');
    const setsUnicos = [...new Set(minhaColecao.map(c => c.set))].sort();
    
    // Mantém a opção "Todas" e adiciona as que você tem
    setFilter.innerHTML = '<option value="all">Todas as Coleções</option>';
    setsUnicos.forEach(setName => {
        const option = document.createElement('option');
        option.value = setName;
        option.innerText = setName;
        setFilter.appendChild(option);
    });
}

function mostrarNotificacao(mensagem) {
    const toast = document.getElementById("toast");
    toast.innerText = mensagem;
    toast.className = "show";
    setTimeout(() => { toast.className = ""; }, 3000);
}

function resetarPagina() {
    document.getElementById('cardName').value = "";
    document.getElementById('results-grid').innerHTML = "";
    document.getElementById('search-title').style.display = "none";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function buscarCarta() {
    let busca = document.getElementById('cardName').value.trim();
    const gridResultados = document.getElementById('results-grid');
    const tituloBusca = document.getElementById('search-title');

    if (!busca) return;

    tituloBusca.style.display = "block";
    gridResultados.innerHTML = "<p>Buscando...</p>";

    try {
        let query = busca.includes('/') 
            ? `number:${busca.split('/')[0].trim()} set.printedTotal:${busca.split('/')[1].trim()}` 
            : `name:"${busca}*"`;

        const resposta = await fetch(`${API_URL}?q=${query}`);
        const dados = await resposta.json();
        const cartas = dados.data;

        gridResultados.innerHTML = "";

        if (!cartas || cartas.length === 0) {
            gridResultados.innerHTML = "<p>Nada encontrado.</p>";
            return;
        }

        cartas.forEach(carta => {
            const div = document.createElement('div');
            div.className = 'card-item';
            div.innerHTML = `
                <img src="${carta.images.small}" loading="lazy">
                <p><strong>${carta.name}</strong></p>
                <small>${carta.set.name} (#${carta.number}/${carta.set.printedTotal})</small>
                <div class="btn-container">
                    <button class="btn-add" onclick="adicionarColecao('${carta.id}', '${carta.name}', '${carta.images.small}', '${carta.set.name}', '${carta.number}', '${carta.set.printedTotal}')">
                        ADICIONAR
                    </button>
                </div>
            `;
            gridResultados.appendChild(div);
        });
    } catch (e) { gridResultados.innerHTML = "<p>Erro na API.</p>"; }
}

function adicionarColecao(id, nome, imagem, set, num, total) {
    if (minhaColecao.find(c => c.id === id)) {
        mostrarNotificacao(`Você já tem esta carta!`);
        return;
    }
    minhaColecao.push({ id, nome, imagem, set, num, total, dataAdicao: Date.now() });
    localStorage.setItem('minhaColecao', JSON.stringify(minhaColecao));
    
    atualizarDropdownSets();
    renderizarColecao();
    mostrarNotificacao(`✅ ${nome} adicionado!`);
}

// FUNÇÃO PRINCIPAL DE RENDERIZAÇÃO (COM FILTRO E ORDEM)
function renderizarColecao() {
    const grid = document.getElementById('collection-grid');
    const titulo = document.querySelector('#my-collection h2');
    
    // Captura os valores dos filtros
    const termoBusca = document.getElementById('filterInput').value.toLowerCase();
    const setEscolhido = document.getElementById('setFilter').value;
    const ordem = document.getElementById('sortOrder').value;

    // 1. FILTRAGEM
    let filtradas = minhaColecao.filter(c => {
        const matchesNome = c.nome.toLowerCase().includes(termoBusca);
        const matchesSet = (setEscolhido === "all" || c.set === setEscolhido);
        return matchesNome && matchesSet;
    });

    // 2. ORDENAÇÃO
    filtradas.sort((a, b) => {
        if (ordem === "name") return a.nome.localeCompare(b.nome);
        if (ordem === "number") return parseInt(a.num) - parseInt(b.num);
        if (ordem === "newest") return b.dataAdicao - a.dataAdicao;
        return 0;
    });

    // Atualiza o título
    if (titulo) {
        titulo.innerHTML = `Minha Coleção <span style="color: #ffcb05; margin-left: 10px;">(${minhaColecao.length})</span>`;
    }

    grid.innerHTML = "";

    filtradas.forEach(item => {
        const div = document.createElement('div');
        div.className = 'card-item';
        div.innerHTML = `
            <img src="${item.imagem}" loading="lazy">
            <p><strong>${item.nome}</strong></p>
            <small>${item.set} (#${item.num}/${item.total})</small>
            <div class="btn-container">
                <button class="btn-remove" onclick="removerCarta('${item.id}')">Remover</button>
            </div>
        `;
        grid.appendChild(div);
    });
}

function removerCarta(id) {
    if (confirm("Remover esta carta?")) {
        minhaColecao = minhaColecao.filter(c => c.id !== id);
        localStorage.setItem('minhaColecao', JSON.stringify(minhaColecao));
        atualizarDropdownSets();
        renderizarColecao();
    }
}

function exportarColecao() {
    const dados = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(minhaColecao));
    const link = document.createElement('a');
    link.setAttribute("href", dados);
    link.setAttribute("download", "pokevault_backup.json");
    link.click();
}

function importarColecao(event) {
    const arquivo = event.target.files[0];
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = (e) => {
        const importadas = JSON.parse(e.target.result);
        importadas.forEach(nova => {
            if (!minhaColecao.find(c => c.id === nova.id)) minhaColecao.push(nova);
        });
        localStorage.setItem('minhaColecao', JSON.stringify(minhaColecao));
        atualizarDropdownSets();
        renderizarColecao();
        mostrarNotificacao("Coleção sincronizada!");
    };
    leitor.readAsText(arquivo);
}