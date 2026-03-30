const API_URL = "https://api.pokemontcg.io/v2/cards";
let minhaColecao = JSON.parse(localStorage.getItem('minhaColecao')) || [];

document.addEventListener('DOMContentLoaded', () => {
    const inputBusca = document.getElementById('cardName');
    if (inputBusca) {
        inputBusca.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                buscarCarta();
            }
        });
    }
    renderizarColecao();
});

function mostrarNotificacao(mensagem) {
    const toast = document.getElementById("toast");
    toast.innerText = mensagem;
    toast.className = "show";
    
    setTimeout(() => {
        toast.className = toast.className.replace("show", "");
    }, 3000);
}

function resetarPagina() {
    const inputBusca = document.getElementById('cardName');
    if (inputBusca) inputBusca.value = "";
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
    gridResultados.innerHTML = "<p>Consultando banco de dados...</p>";

    try {
        let query = "";
        if (busca.includes('/')) {
            const partes = busca.split('/');
            query = `number:${partes[0].trim()} set.printedTotal:${partes[1].trim()}`;
        } else if (!isNaN(busca)) {
            query = `number:${busca}`;
        } else {
            query = `name:"${busca}*"`;
        }

        const resposta = await fetch(`${API_URL}?q=${query}`);
        const dados = await resposta.json();
        const cartas = dados.data;

        gridResultados.innerHTML = "";

        if (!cartas || cartas.length === 0) {
            gridResultados.innerHTML = "<p>Nenhuma carta encontrada com esses dados.</p>";
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

    } catch (e) {
        gridResultados.innerHTML = "<p>Erro ao conectar com a API.</p>";
    }
}

function adicionarColecao(id, nome, imagem, set, num, total) {
    if (minhaColecao.find(c => c.id === id)) {
        mostrarNotificacao(`Ops! ${nome} já está na sua coleção.`);
        return;
    }
    minhaColecao.push({ id, nome, imagem, set, num, total });
    localStorage.setItem('minhaColecao', JSON.stringify(minhaColecao));
    renderizarColecao();
    
    mostrarNotificacao(`✅ ${nome} adicionado com sucesso!`);
}

function renderizarColecao(filtro = "") {
    const grid = document.getElementById('collection-grid');
    const titulo = document.querySelector('#my-collection h2');
    
    if (titulo) {
        titulo.innerHTML = `Minha Coleção <span style="color: #ffcb05; margin-left: 10px;">(${minhaColecao.length})</span>`;
    }

    grid.innerHTML = "";
    const filtradas = minhaColecao.filter(c => 
        c.nome.toLowerCase().includes(filtro.toLowerCase()) || 
        c.set.toLowerCase().includes(filtro.toLowerCase())
    );

    if (filtradas.length === 0 && minhaColecao.length > 0) {
        grid.innerHTML = "<p>Nenhuma carta corresponde ao filtro.</p>";
    }

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
    if (confirm("Deseja mesmo remover esta carta da sua coleção?")) {
        minhaColecao = minhaColecao.filter(c => c.id !== id);
        localStorage.setItem('minhaColecao', JSON.stringify(minhaColecao));
        renderizarColecao();
    }
}