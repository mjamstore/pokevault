const API_URL = "https://api.pokemontcg.io/v2/cards";
const DOLAR_HOJE = 5.00; 
let minhaColecao = JSON.parse(localStorage.getItem('minhaColecao')) || [];

// Pausa para não irritar a API durante a sincronização
const delay = ms => new Promise(res => setTimeout(res, ms));

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
    const setsUnicos = [...new Set(minhaColecao.map(c => c.set))];
    document.getElementById('stat-sets').innerText = setsUnicos.length;

    // Calcula o valor congelado (impede NaN)
    const valorUSD = minhaColecao.reduce((acc, c) => acc + (parseFloat(c.preco) || 0), 0);
    const valorBRL = valorUSD * DOLAR_HOJE;
    document.getElementById('stat-value').innerText = `R$ ${valorBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

    const displayDestaque = document.getElementById('featured-display');
    if (minhaColecao.length > 0) {
        const rand = Math.floor(Math.random() * minhaColecao.length);
        const card = minhaColecao[rand];
        displayDestaque.innerHTML = `
            <img src="${card.imagem}">
            <p style="margin-top:8px; font-weight:600; color:var(--primary); font-size:0.8rem;">${card.nome}</p>
        `;
    }
    
    atualizarProgressoColecoes();
}

async function sincronizarPrecos() {
    const btn = document.getElementById('syncBtn');
    if (minhaColecao.length === 0) return;

    btn.disabled = true;
    
    try {
        for (let i = 0; i < minhaColecao.length; i++) {
            btn.innerText = `⏳ Atualizando ${i + 1}/${minhaColecao.length}...`;
            
            try {
                const res = await fetch(`${API_URL}/${minhaColecao[i].id}`);
                if (!res.ok) {
                    await delay(1000); 
                    continue;
                }
                const json = await res.json();
                if (json.data) {
                    const p = json.data.tcgplayer?.prices?.holofoil?.market || 
                              json.data.tcgplayer?.prices?.normal?.market || 0;
                    minhaColecao[i].preco = p; 
                }
            } catch (err) {
                console.warn("Falha ao buscar:", minhaColecao[i].nome);
            }

            // Salva o progresso a cada carta
            localStorage.setItem('minhaColecao', JSON.stringify(minhaColecao));
            
            if (i % 3 === 0) atualizarDashboard(); 
            await delay(300); 
        }
        mostrarNotificacao("💰 Valores fixados com sucesso!");
    } catch (e) {
        mostrarNotificacao("❌ Erro na sincronização.");
    }

    atualizarDashboard(); 
    btn.disabled = false;
    btn.innerText = "🔄 Atualizar Preços das Cartas";
    renderizarColecao();
}

function atualizarProgressoColecoes() {
    const list = document.getElementById('progress-list');
    const resumo = {};
    
    minhaColecao.forEach(c => {
        if (!resumo[c.set]) resumo[c.set] = { possuídas: 0, total: parseInt(c.total) || 0 };
        resumo[c.set].possuídas++;
    });

    const setsSorted = Object.keys(resumo).map(nome => ({
        nome, ...resumo[nome], perc: (resumo[nome].possuídas / resumo[nome].total) * 100
    })).sort((a, b) => b.perc - a.perc);

    list.innerHTML = "";
    setsSorted.forEach(s => {
        const div = document.createElement('div');
        div.className = "progress-item";
        const tag = s.perc >= 80 ? '<span class="worth-it-tag">WORTH IT!</span>' : '';
        div.innerHTML = `
            <div class="progress-info">
                <span><strong>${s.nome}</strong> ${tag}</span>
                <span>${s.possuídas}/${s.total}</span>
            </div>
            <div class="progress-bar-bg"><div class="progress-fill" style="width:${s.perc}%"></div></div>
        `;
        list.appendChild(div);
    });
}

async function buscarCarta() {
    const busca = document.getElementById('cardName').value.trim();
    const grid = document.getElementById('results-grid');
    if (!busca) return;

    document.getElementById('search-title').style.display = "block";
    grid.innerHTML = "<p>Buscando na Pokédex...</p>";

    try {
        let q = busca.includes('/') ? `number:${busca.split('/')[0]} set.printedTotal:${busca.split('/')[1]}` : `name:"${busca}*"`;
        const res = await fetch(`${API_URL}?q=${q}`);
        const json = await res.json();
        
        grid.innerHTML = "";
        json.data.forEach(c => {
            const pUSD = c.tcgplayer?.prices?.holofoil?.market || c.tcgplayer?.prices?.normal?.market || 0;
            const pBRL = (pUSD * DOLAR_HOJE).toFixed(2);
            
            const div = document.createElement('div');
            div.className = "card-item";
            div.innerHTML = `
                <img src="${c.images.small}">
                <p><strong>${c.name}</strong></p>
                <p class="price-tag">R$ ${pBRL}</p>
                <button class="btn-add" onclick="adicionarColecao('${c.id}','${c.name}','${c.images.small}','${c.set.name}','${c.number}','${c.set.printedTotal}',${pUSD})">ADICIONAR</button>
            `;
            grid.appendChild(div);
        });
    } catch (e) { grid.innerHTML = "<p>Erro na busca.</p>"; }
}

function adicionarColecao(id, nome, imagem, set, num, total, preco) {
    if (minhaColecao.find(c => c.id === id)) return mostrarNotificacao("Você já tem!");
    
    // O preço entra aqui e fica congelado
    const precoSeguro = parseFloat(preco) || 0;
    minhaColecao.push({ id, nome, imagem, set, num, total, preco: precoSeguro, dataAdicao: Date.now() });
    
    localStorage.setItem('minhaColecao', JSON.stringify(minhaColecao));
    renderizarColecao();
    mostrarNotificacao(`${nome} adicionado!`);
}

function renderizarColecao() {
    const grid = document.getElementById('collection-grid');
    const filtroSet = document.getElementById('setFilter').value;
    const filtroNome = document.getElementById('filterInput').value.toLowerCase();
    const ordem = document.getElementById('sortOrder').value;

    let filtradas = minhaColecao.filter(c => {
        return c.nome.toLowerCase().includes(filtroNome) && (filtroSet === "all" || c.set === filtroSet);
    });

    filtradas.sort((a, b) => ordem === "name" ? a.nome.localeCompare(b.nome) : b.dataAdicao - a.dataAdicao);

    grid.innerHTML = "";
    filtradas.forEach(c => {
        // Blindagem contra o NaN nas cartas renderizadas
        const precoSeguro = parseFloat(c.preco) || 0;
        const pBRL = (precoSeguro * DOLAR_HOJE).toFixed(2);
        
        const div = document.createElement('div');
        div.className = "card-item";
        div.innerHTML = `
            <img src="${c.imagem}" loading="lazy">
            <p><strong>${c.nome}</strong></p>
            <p class="price-tag">R$ ${pBRL}</p>
            <button class="btn-remove" onclick="removerCarta('${c.id}')">Remover</button>
        `;
        grid.appendChild(div);
    });
    atualizarDashboard();
}

function removerCarta(id) {
    if (!confirm("Remover?")) return;
    minhaColecao = minhaColecao.filter(c => c.id !== id);
    localStorage.setItem('minhaColecao', JSON.stringify(minhaColecao));
    atualizarDropdownSets(); renderizarColecao();
}

function mostrarNotificacao(m) {
    const t = document.getElementById("toast"); t.innerText = m; t.className = "show";
    setTimeout(() => t.className = "", 3000);
}

function atualizarDropdownSets() {
    const f = document.getElementById('setFilter');
    const s = [...new Set(minhaColecao.map(c => c.set))].sort();
    f.innerHTML = '<option value="all">Todos</option>';
    s.forEach(x => { const o = document.createElement('option'); o.value = o.innerText = x; f.appendChild(o); });
}

function exportarColecao() {
    const blob = new Blob([JSON.stringify(minhaColecao)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = "pokevault_backup.json"; a.click();
}

function importarColecao(e) {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (ev) => {
        const data = JSON.parse(ev.target.result);
        data.forEach(n => { if (!minhaColecao.find(c => c.id === n.id)) minhaColecao.push(n); });
        localStorage.setItem('minhaColecao', JSON.stringify(minhaColecao));
        renderizarColecao();
    };
    reader.readAsText(file);
}

function resetarPagina() { window.scrollTo({ top: 0, behavior: 'smooth' }); }