// 🔥 SUA CONFIGURAÇÃO FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyD9K67t0salEFIx8aiJ5_2lJif1UZzvkPg",
  authDomain: "pokevault-6dbb0.firebaseapp.com",
  projectId: "pokevault-6dbb0",
  storageBucket: "pokevault-6dbb0.firebasestorage.app",
  messagingSenderId: "669216627838",
  appId: "1:669216627838:web:23c4537870b038a2944c2f",
  measurementId: "G-J3KXLBES00"
};

// Inicializa Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const API_URL = "https://api.pokemontcg.io/v2/cards";
const DOLAR_HOJE = 5.00; 
let minhaColecao = [];

const delay = ms => new Promise(res => setTimeout(res, ms));

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    const inputBusca = document.getElementById('cardName');
    if (inputBusca) {
        inputBusca.addEventListener('keypress', (e) => { if (e.key === 'Enter') buscarCarta(); });
    }
    
    // ☁️ ESCUTADOR EM TEMPO REAL: Tudo o que mudar no Firebase aparece aqui na hora!
    carregarColecaoDaNuvem();
});

function carregarColecaoDaNuvem() {
    db.collection("minhaColecao").orderBy("dataAdicao", "desc")
    .onSnapshot((snapshot) => {
        minhaColecao = snapshot.docs.map(doc => ({
            docId: doc.id,
            ...doc.data()
        }));
        renderizarColecao();
        atualizarDashboard();
    }, (error) => {
        console.error("Erro na nuvem:", error);
    });
}

// --- FUNÇÃO DE EMERGÊNCIA: ENVIAR BACKUP JSON PARA A NUVEM ---
async function carregarBackupParaNuvem(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const dados = JSON.parse(e.target.result);
        if (!confirm(`Detectamos ${dados.length} cartas no seu arquivo. Deseja enviá-las para o Google Cloud agora?`)) return;

        const btn = document.getElementById('syncBtn');
        btn.disabled = true;

        for (let i = 0; i < dados.length; i++) {
            btn.innerText = `🚀 Enviando ${i + 1}/${dados.length}`;
            
            const cartaLimpa = {
                id: dados[i].id || "sem-id",
                nome: dados[i].nome || "Sem Nome",
                imagem: dados[i].imagem || "",
                set: dados[i].set || "Desconhecido",
                num: dados[i].num || "0",
                total: dados[i].total || "0",
                preco: parseFloat(dados[i].preco) || 0,
                dataAdicao: dados[i].dataAdicao || Date.now()
            };

            try {
                await db.collection("minhaColecao").add(cartaLimpa);
            } catch (err) { console.error("Falha na carta:", i); }
            
            await delay(150); // Pausa para não travar a conexão
        }

        alert("🚀 Backup restaurado na nuvem com sucesso!");
        btn.disabled = false;
        btn.innerText = "🔄 Atualizar Preços";
    };
    reader.readAsText(file);
}

// --- LÓGICA DE UI E DASHBOARD ---
function atualizarDashboard() {
    document.getElementById('stat-total').innerText = minhaColecao.length;
    const setsUnicos = [...new Set(minhaColecao.map(c => c.set))].sort();
    document.getElementById('stat-sets').innerText = setsUnicos.length;

    const totalUSD = minhaColecao.reduce((acc, c) => acc + (parseFloat(c.preco) || 0), 0);
    document.getElementById('stat-value').innerText = `R$ ${(totalUSD * DOLAR_HOJE).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

    const albumSelect = document.getElementById('albumSetSelect');
    const curVal = albumSelect.value;
    albumSelect.innerHTML = '<option value="">Selecione o Set...</option>';
    setsUnicos.forEach(s => {
        const opt = document.createElement('option');
        opt.value = opt.innerText = s;
        albumSelect.appendChild(opt);
    });
    albumSelect.value = curVal;

    if (document.getElementById('worthItSelect').value === "ranking") processarWorthIt();
}

function toggleExplorer() {
    document.getElementById('album-explorer').classList.toggle('is-open');
}

// --- BUSCA E ADIÇÃO ---
async function buscarCarta() {
    const busca = document.getElementById('cardName').value.trim();
    const grid = document.getElementById('results-grid');
    if (!busca) return;
    document.getElementById('search-title').style.display = "block";
    grid.innerHTML = "Consultando...";

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
            const btn = document.createElement('button'); btn.className = "btn-add"; btn.innerText = "ADICIONAR";
            
            btn.addEventListener('click', () => adicionarColecao(c.id, c.name, c.images.small, c.set.name, c.number, c.set.printedTotal, pUSD));
            
            div.append(img, btn);
            grid.appendChild(div);
        });
    } catch (e) { grid.innerHTML = "Erro."; }
}

async function adicionarColecao(id, nome, imagem, set, num, total, preco) {
    if (minhaColecao.find(c => c.id === id)) return mostrarNotificacao("Já tenho!");
    
    try {
        await db.collection("minhaColecao").add({
            id, nome, imagem, set, num, total, 
            preco: parseFloat(preco) || 0, 
            dataAdicao: Date.now()
        });
        mostrarNotificacao(`✅ ${nome} salvo online!`);
    } catch (e) { mostrarNotificacao("Erro ao salvar."); }
}

async function removerCarta(docId) {
    if (confirm("Remover permanentemente da nuvem?")) {
        await db.collection("minhaColecao").doc(docId).delete();
    }
}

// --- RENDERIZAÇÃO ---
function renderizarColecao() {
    const grid = document.getElementById('collection-grid');
    const termo = document.getElementById('filterInput').value.toLowerCase();
    let filtradas = minhaColecao.filter(c => c.nome.toLowerCase().includes(termo));

    grid.innerHTML = "";
    filtradas.forEach(c => {
        const div = document.createElement('div');
        div.className = "card-item";
        div.innerHTML = `
            <img src="${c.imagem}" loading="lazy">
            <p><strong>${c.nome}</strong></p>
            <p class="price-tag">R$ ${(c.preco * DOLAR_HOJE).toFixed(2)}</p>
            <button class="btn-remove" onclick="removerCarta('${c.docId}')">Remover</button>
        `;
        grid.appendChild(div);
    });
}

// --- ÁLBUM E WORTH IT ---
async function ativarModoAlbum() {
    const setName = document.getElementById('albumSetSelect').value;
    const content = document.getElementById('explorer-content');
    if (!setName) return;

    content.className = "card-grid";
    content.innerHTML = "Consultando Set...";

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
                <img src="${cAPI.images.small}">
                <p><strong>${cAPI.name}</strong></p>
                ${jaTenho ? `<p class="price-tag">OK</p>` : `<span class="missing-label">FALTANDO</span>`}
            `;
            
            if (!jaTenho) {
                div.onclick = () => {
                    document.getElementById('cardName').value = `${cAPI.name} ${cAPI.number}/${cAPI.set.printedTotal}`;
                    buscarCarta();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                };
            }
            content.appendChild(div);
        });
    } catch (e) { content.innerHTML = "Erro."; }
}

function processarWorthIt() {
    const content = document.getElementById('explorer-content');
    const resumo = {};
    minhaColecao.forEach(c => {
        if (!resumo[c.set]) resumo[c.set] = { p: 0, t: parseInt(c.total) || 0 };
        resumo[c.set].p++;
    });

    const sorted = Object.keys(resumo).map(n => ({
        nome: n, ...resumo[n], perc: (resumo[n].p / resumo[n].t) * 100
    })).sort((a, b) => b.perc - a.perc);

    content.innerHTML = "";
    sorted.forEach(s => {
        const div = document.createElement('div');
        div.className = "progress-item";
        div.innerHTML = `
            <div style="display:flex; justify-content: space-between; font-size: 0.7rem;">
                <span><strong>${s.nome}</strong></span>
                <span>${s.p}/${s.t}</span>
            </div>
            <div class="progress-bar-bg"><div class="progress-fill" style="width:${s.perc}%"></div></div>
        `;
        content.appendChild(div);
    });
}

function alterarModoPrincipal() {
    const modo = document.getElementById('worthItSelect').value;
    const albumSelect = document.getElementById('albumSetSelect');
    const content = document.getElementById('explorer-content');
    document.getElementById('album-explorer').classList.add('is-open');

    if (modo === "ranking") {
        albumSelect.style.display = "none";
        content.className = "progress-grid";
        processarWorthIt();
    } else {
        albumSelect.style.display = "block";
        content.innerHTML = "<p style='grid-column: 1/-1; text-align: center; padding: 20px;'>Escolha o Set acima.</p>";
    }
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
            if (json.data) {
                const novoPreco = json.data.tcgplayer?.prices?.holofoil?.market || json.data.tcgplayer?.prices?.normal?.market || 0;
                await db.collection("minhaColecao").doc(minhaColecao[i].docId).update({ preco: novoPreco });
            }
        } catch(e) {}
        await delay(350);
    }
    btn.disabled = false; btn.innerText = "🔄 Atualizar Preços";
}

function mostrarNotificacao(m) {
    const t = document.getElementById("toast"); t.innerText = m; t.className = "show";
    setTimeout(() => t.className = "", 3000);
}

function resetarPagina() { window.scrollTo({ top: 0, behavior: 'smooth' }); }