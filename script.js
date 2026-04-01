const API_URL = "https://api.pokemontcg.io/v2/cards";
const DOLAR_HOJE = 5.00; 
let minhaColecao = JSON.parse(localStorage.getItem('minhaColecao')) || [];

const delay = ms => new Promise(res => setTimeout(res, ms));

document.addEventListener('DOMContentLoaded', () => {
    const inputBusca = document.getElementById('cardName');
    if (inputBusca) {
        inputBusca.addEventListener('keypress', (e) => { if (e.key === 'Enter') buscarCarta(); });
    }
    atualizarDashboard();
    renderizarColecao();
});

// --- SISTEMA DE UI ---
function toggleExplorer() {
    document.getElementById('album-explorer').classList.toggle('is-open');
}

function alterarModoPrincipal() {
    const modo = document.getElementById('worthItSelect').value;
    const albumSelect = document.getElementById('albumSetSelect');
    const content = document.getElementById('explorer-content');
    
    // Abre automaticamente ao interagir
    document.getElementById('album-explorer').classList.add('is-open');

    if (modo === "ranking") {
        albumSelect.style.display = "none";
        content.className = "progress-grid";
        processarWorthIt();
    } else {
        albumSelect.style.display = "block";
        content.innerHTML = "<p style='grid-column: 1/-1; text-align: center; opacity: 0.5; padding: 20px;'>Selecione uma expansão acima.</p>";
    }
}

// --- LÓGICA DE DADOS ---
function atualizarDashboard() {
    document.getElementById('stat-total').innerText = minhaColecao.length;
    const setsUnicos = [...new Set(minhaColecao.map(c => c.set))].sort();
    document.getElementById('stat-sets').innerText = setsUnicos.length;

    const totalUSD = minhaColecao.reduce((acc, c) => acc + (parseFloat(c.preco) || 0), 0);
    document.getElementById('stat-value').innerText = `R$ ${(totalUSD * DOLAR_HOJE).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

    const albumSelect = document.getElementById('albumSetSelect');
    const currentVal = albumSelect.value;
    albumSelect.innerHTML = '<option value="">Selecione o Set...</option>';
    setsUnicos.forEach(s => {
        const opt = document.createElement('option');
        opt.value = opt.innerText = s;
        albumSelect.appendChild(opt);
    });
    albumSelect.value = currentVal;

    if (document.getElementById('worthItSelect').value === "ranking") processarWorthIt();
}

async function ativarModoAlbum() {
    const setName = document.getElementById('albumSetSelect').value;
    const content = document.getElementById('explorer-content');
    if (!setName) return;

    content.className = "card-grid";
    content.innerHTML = "<p style='grid-column: 1/-1; text-align: center;'>Carregando álbum completo...</p>";

    try {
        const res = await fetch(`${API_URL}?q=set.name:"${setName}"&orderBy=number&pageSize=250`);
        const json = await res.json();
        content.innerHTML = "";
        
        json.data.forEach(cAPI => {
            const jaTenho = minhaColecao.find(c => c.id === cAPI.id);
            const div = document.createElement('div');
            div.className = "card-item";
            if (!jaTenho) div.classList.add('album-missing');

            div.innerHTML = `
                <img src="${cAPI.images.small}" loading="lazy">
                <p><strong>${cAPI.name}</strong></p>
                <small>#${cAPI.number} / ${cAPI.set.printedTotal}</small>
                ${jaTenho ? `<p class="price-tag">R$ ${(cAPI.tcgplayer?.prices?.holofoil?.market || cAPI.tcgplayer?.prices?.normal?.market || 0) * DOLAR_HOJE}</p>` : `<span class="missing-label">FALTANDO</span>`}
            `;

            if (!jaTenho) {
                div.style.cursor = "pointer";
                div.onclick = () => {
                    document.getElementById('cardName').value = `${cAPI.name} ${cAPI.number}/${cAPI.set.printedTotal}`;
                    buscarCarta();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                };
            }
            content.appendChild(div);
        });
    } catch (e) { content.innerHTML = "Erro ao carregar."; }
}

function processarWorthIt() {
    const content = document.getElementById('explorer-content');
    const resumo = {};
    minhaColecao.forEach(c => {
        if (!resumo[c.set]) resumo[c.set] = { poss: 0, total: parseInt(c.total) || 0 };
        resumo[c.set].poss++;
    });

    const sorted = Object.keys(resumo).map(n => ({
        nome: n, ...resumo[n], perc: (resumo[n].poss / resumo[n].total) * 100
    })).sort((a, b) => b.perc - a.perc);

    content.innerHTML = "";
    sorted.forEach(s => {
        const div = document.createElement('div');
        div.className = "progress-item";
        div.innerHTML = `
            <div style="display:flex; justify-content: space-between; font-size: 0.75rem;">
                <span><strong>${s.nome}</strong></span>
                <span>${s.poss}/${s.total}</span>
            </div>
            <div class="progress-bar-bg"><div class="progress-fill" style="width:${s.perc}%"></div></div>
        `;
        content.appendChild(div);
    });
}

async function buscarCarta() {
    const busca = document.getElementById('cardName').value.trim();
    const grid = document.getElementById('results-grid');
    if (!busca) return;

    document.getElementById('search-title').style.display = "block";
    grid.innerHTML = "Buscando...";

    try {
        let q = busca.includes('/') ? `number:${busca.split('/')[0]} set.printedTotal:${busca.split('/')[1]}` : `name:"${busca}*"`;
        const res = await fetch(`${API_URL}?q=${q}`);
        const json = await res.json();
        grid.innerHTML = "";

        json.data.forEach(c => {
            const pUSD = c.tcgplayer?.prices?.holofoil?.market || c.tcgplayer?.prices?.normal?.market || 0;
            const div = document.createElement('div');
            div.className = "card-item";
            
            const img = document.createElement('img'); img.src = c.images.small;
            const nome = document.createElement('p'); nome.innerHTML = `<strong>${c.name}</strong>`;
            const btn = document.createElement('button'); btn.className = "btn-add"; btn.innerText = "ADICIONAR";
            btn.addEventListener('click', () => adicionarColecao(c.id, c.name, c.images.small, c.set.name, c.number, c.set.printedTotal, pUSD));

            div.append(img, nome, btn);
            grid.appendChild(div);
        });
    } catch (e) { grid.innerHTML = "Erro."; }
}

function adicionarColecao(id, nome, imagem, set, num, total, preco) {
    if (minhaColecao.find(c => c.id === id)) return mostrarNotificacao("Já tenho!");
    minhaColecao.push({ id, nome, imagem, set, num, total, preco: parseFloat(preco) || 0, dataAdicao: Date.now() });
    localStorage.setItem('minhaColecao', JSON.stringify(minhaColecao));
    renderizarColecao();
    mostrarNotificacao(`✅ ${nome} adicionado!`);
}

function renderizarColecao() {
    const grid = document.getElementById('collection-grid');
    const termo = document.getElementById('filterInput').value.toLowerCase();
    let filtradas = minhaColecao.filter(c => c.nome.toLowerCase().includes(termo));
    filtradas.sort((a, b) => b.dataAdicao - a.dataAdicao);

    grid.innerHTML = "";
    filtradas.forEach(c => {
        const div = document.createElement('div');
        div.className = "card-item";
        div.innerHTML = `
            <img src="${c.imagem}" loading="lazy">
            <p><strong>${c.nome}</strong></p>
            <p class="price-tag">R$ ${(c.preco * DOLAR_HOJE).toFixed(2)}</p>
            <button class="btn-remove" onclick="removerCarta('${c.id}')">Remover</button>
        `;
        grid.appendChild(div);
    });
    atualizarDashboard();
}

async function sincronizarPrecos() {
    const btn = document.getElementById('syncBtn');
    if (!minhaColecao.length) return;
    btn.disabled = true;
    for (let i = 0; i < minhaColecao.length; i++) {
        btn.innerText = `⏳ ${i+1}/${minhaColecao.length}`;
        try {
            const res = await fetch(`${API_URL}/${minhaColecao[i].id}`);
            const json = await res.json();
            if (json.data) minhaColecao[i].preco = json.data.tcgplayer?.prices?.holofoil?.market || json.data.tcgplayer?.prices?.normal?.market || 0;
        } catch(e) {}
        localStorage.setItem('minhaColecao', JSON.stringify(minhaColecao));
        if (i % 5 === 0) atualizarDashboard();
        await delay(350);
    }
    btn.disabled = false; btn.innerText = "🔄 Atualizar Preços";
    renderizarColecao();
}

function removerCarta(id) {
    if (confirm("Remover?")) {
        minhaColecao = minhaColecao.filter(c => c.id !== id);
        localStorage.setItem('minhaColecao', JSON.stringify(minhaColecao));
        renderizarColecao();
    }
}

function mostrarNotificacao(m) {
    const t = document.getElementById("toast"); t.innerText = m; t.className = "show";
    setTimeout(() => t.className = "", 3000);
}

function exportarColecao() {
    const a = document.createElement('a'); 
    a.href = URL.createObjectURL(new Blob([JSON.stringify(minhaColecao)], {type: "application/json"})); 
    a.download = "pokevault_backup.json"; a.click();
}

function importarColecao(e) {
    const reader = new FileReader();
    reader.onload = (ev) => {
        JSON.parse(ev.target.result).forEach(n => { if (!minhaColecao.find(c => c.id === n.id)) minhaColecao.push(n); });
        localStorage.setItem('minhaColecao', JSON.stringify(minhaColecao));
        renderizarColecao();
    };
    reader.readAsText(e.target.files[0]);
}

function resetarPagina() { window.scrollTo({ top: 0, behavior: 'smooth' }); }