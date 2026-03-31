const API_URL = "https://api.pokemontcg.io/v2/cards";
let minhaColecao = JSON.parse(localStorage.getItem('minhaColecao')) || [];
document.addEventListener('DOMContentLoaded', () => {
    const inputBusca = document.getElementById('cardName');
    if (inputBusca) { inputBusca.addEventListener('keypress', (e) => { if (e.key === 'Enter') buscarCarta(); }); }
    atualizarDropdownSets(); renderizarColecao();
});
function atualizarDashboard() {
    document.getElementById('stat-total').innerText = minhaColecao.length;
    const sets = [...new Set(minhaColecao.map(c => c.set))];
    document.getElementById('stat-sets').innerText = sets.length;
    const statLast = document.getElementById('stat-last');
    if (minhaColecao.length > 0) { statLast.innerText = minhaColecao[minhaColecao.length - 1].nome; }
    const displayDestaque = document.getElementById('featured-display');
    if (minhaColecao.length > 0) {
        const indexAleatorio = Math.floor(Math.random() * minhaColecao.length);
        const destaque = minhaColecao[indexAleatorio];
        displayDestaque.innerHTML = `<img src="${destaque.imagem}"><p style="margin-top:10px; font-weight:600;">${destaque.nome}</p>`;
    }
}
async function buscarCarta() {
    let busca = document.getElementById('cardName').value.trim();
    const gridResultados = document.getElementById('results-grid');
    if (!busca) return;
    gridResultados.innerHTML = "<p>Buscando...</p>";
    try {
        let query = busca.includes('/') ? `number:${busca.split('/')[0].trim()} set.printedTotal:${busca.split('/')[1].trim()}` : `name:"${busca}*"`;
        const resposta = await fetch(`${API_URL}?q=${query}`);
        const dados = await resposta.json();
        const cartas = dados.data;
        gridResultados.innerHTML = "";
        cartas.forEach(carta => {
            const div = document.createElement('div');
            div.className = 'card-item';
            div.innerHTML = `<img src="${carta.images.small}"><p><strong>${carta.name}</strong></p><button class="btn-add" onclick="adicionarColecao('${carta.id}', '${carta.name}', '${carta.images.small}', '${carta.set.name}', '${carta.number}', '${carta.set.printedTotal}')">ADICIONAR</button>`;
            gridResultados.appendChild(div);
        });
    } catch (e) { gridResultados.innerHTML = "<p>Erro.</p>"; }
}
function adicionarColecao(id, nome, imagem, set, num, total) {
    if (minhaColecao.find(c => c.id === id)) return;
    minhaColecao.push({ id, nome, imagem, set, num, total, dataAdicao: Date.now() });
    localStorage.setItem('minhaColecao', JSON.stringify(minhaColecao));
    atualizarDropdownSets(); renderizarColecao();
}
function renderizarColecao() {
    const grid = document.getElementById('collection-grid');
    const t = document.getElementById('filterInput').value.toLowerCase();
    const s = document.getElementById('setFilter').value;
    const o = document.getElementById('sortOrder').value;
    let f = minhaColecao.filter(c => c.nome.toLowerCase().includes(t) && (s === "all" || c.set === s));
    f.sort((a, b) => o === "name" ? a.nome.localeCompare(b.nome) : b.dataAdicao - a.dataAdicao);
    grid.innerHTML = "";
    f.forEach(item => {
        const div = document.createElement('div');
        div.className = 'card-item';
        div.innerHTML = `<img src="${item.imagem}"><p><strong>${item.nome}</strong></p><button class="btn-remove" onclick="removerCarta('${item.id}')">Remover</button>`;
        grid.appendChild(div);
    });
    atualizarDashboard();
}
function removerCarta(id) {
    minhaColecao = minhaColecao.filter(c => c.id !== id);
    localStorage.setItem('minhaColecao', JSON.stringify(minhaColecao));
    atualizarDropdownSets(); renderizarColecao();
}
function atualizarDropdownSets() {
    const f = document.getElementById('setFilter'); if (!f) return;
    const s = [...new Set(minhaColecao.map(c => c.set))].sort();
    f.innerHTML = '<option value="all">Todas as Coleções</option>';
    s.forEach(x => { const o = document.createElement('option'); o.value = x; o.innerText = x; f.appendChild(o); });
}
function exportarColecao() { const d = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(minhaColecao)); const l = document.createElement('a'); l.setAttribute("href", d); l.setAttribute("download", "pokevault_backup.json"); l.click(); }
function importarColecao(e) {
    const a = e.target.files[0]; if (!a) return;
    const r = new FileReader(); r.onload = (x) => {
        const i = JSON.parse(x.target.result);
        i.forEach(n => { if (!minhaColecao.find(c => c.id === n.id)) minhaColecao.push(n); });
        localStorage.setItem('minhaColecao', JSON.stringify(minhaColecao));
        atualizarDropdownSets(); renderizarColecao();
    }; r.readAsText(a);
}
function resetarPagina() { window.scrollTo({ top: 0, behavior: 'smooth' }); }
