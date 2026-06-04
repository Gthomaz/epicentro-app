
        const API = 'http://localhost:3000/api';
        
        // Estado
        let appState = {
            token: localStorage.getItem('token'),
            role: localStorage.getItem('role'),
            salaChatAtiva: null,
            novasCartas: []
        };

        // ================= ROTAS DE NAVEGAÇÃO INTERNA =================
        function checkAuth() {
            if (appState.token && appState.role) {
                document.getElementById('view-login').classList.add('hidden');
                if (appState.role === 'master') {
                    document.getElementById('view-master').classList.remove('hidden');
                    initMaster();
                } else {
                    document.getElementById('view-dependente').classList.remove('hidden');
                    initDependente();
                }
            } else {
                document.getElementById('view-login').classList.remove('hidden');
                document.getElementById('view-master').classList.add('hidden');
                document.getElementById('view-dependente').classList.add('hidden');
            }
        }

        function logout() {
            localStorage.clear();
            appState.token = null; appState.role = null;
            checkAuth();
        }

        function switchMasterTab(tabId) {
            document.querySelectorAll('#view-master .tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('#view-master .tab-content').forEach(c => c.classList.remove('active'));
            event.target.classList.add('active');
            document.getElementById(tabId).classList.add('active');
            if(tabId === 'm-seguranca') carregarPendencias();
        }

        function switchDepTab(tabId) {
            document.querySelectorAll('#view-dependente .tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('#view-dependente .tab-content').forEach(c => c.classList.remove('active'));
            event.target.classList.add('active');
            document.getElementById(tabId).classList.add('active');
            if(tabId === 'd-album') carregarAlbum();
            if(tabId === 'd-feira') carregarOfertasGlobais();
        }

        // ================= API HELPERS =================
        async function fetchAPI(endpoint, method = 'GET', body = null) {
            const headers = { 'Content-Type': 'application/json' };
            if (appState.token) headers['Authorization'] = `Bearer ${appState.token}`;
            
            const config = { method, headers };
            if (body) config.body = JSON.stringify(body);

            try {
                const res = await fetch(`${API}${endpoint}`, config);
                const data = await res.json();
                if(!res.ok) throw new Error(data.error || 'Erro na API');
                return data;
            } catch (err) {
                alert(err.message);
                throw err;
            }
        }

        // ================= LÓGICA DE LOGIN =================
        async function doLogin() {
            const doc = document.getElementById('login-id').value;
            const pass = document.getElementById('login-pass').value;
            try {
                // Tenta como Master
                let res = await fetch(`${API}/login/responsavel`, {
                    method:'POST', headers:{'Content-Type':'application/json'},
                    body: JSON.stringify({ cpf: doc, senha: pass })
                });
                let data = await res.json();

                if(!res.ok) {
                    // Tenta como Dependente
                    res = await fetch(`${API}/login/dependente`, {
                        method:'POST', headers:{'Content-Type':'application/json'},
                        body: JSON.stringify({ nickname: doc, senha: pass })
                    });
                    data = await res.json();
                    if(!res.ok) throw new Error('Login inválido');
                }

                localStorage.setItem('token', data.token);
                localStorage.setItem('role', data.user.role);
                appState.token = data.token; appState.role = data.user.role;
                
                // Armazena nome provisório
                if(data.user.role === 'master') document.getElementById('master-name').innerText = data.user.nome_completo;
                else document.getElementById('dep-name').innerText = data.user.nickname;

                checkAuth();
            } catch(e) { alert(e.message); }
        }

        // ================= LÓGICA MASTER =================
        async function initMaster() {
            carregarSaldoPai();
        }

        async function carregarSaldoPai() {
            try {
                const data = await fetchAPI('/financeiro/saldo-pai');
                document.getElementById('master-saldo').innerText = parseFloat(data.saldo_reais).toFixed(2);
            } catch(e) {}
        }

        async function fazerDeposito() {
            const valor = document.getElementById('deposito-valor').value;
            if(!valor) return;
            try {
                await fetchAPI('/financeiro/depositar', 'POST', { valor: Number(valor) });
                document.getElementById('deposito-valor').value = '';
                carregarSaldoPai();
                alert('Depósito PIX efetuado!');
            } catch(e) {}
        }

        async function transferirMesada() {
            const idFilho = document.getElementById('mesada-id-filho').value;
            const valor = document.getElementById('mesada-valor').value;
            try {
                await fetchAPI('/financeiro/transferir-mesada', 'POST', { id_dependente: Number(idFilho), valor_reais: Number(valor) });
                document.getElementById('mesada-valor').value = '';
                carregarSaldoPai();
                alert('Mesada transferida com sucesso!');
            } catch(e) {}
        }

        async function carregarPendencias() {
            try {
                const data = await fetchAPI('/trocas/pendentes');
                const list = document.getElementById('lista-pendencias');
                list.innerHTML = '';
                data.pendentes.forEach(p => {
                    list.innerHTML += `
                        <div class="list-item">
                            <div>
                                <strong>Troca #${p.id_troca}</strong><br>
                                <span style="font-size:0.8rem; color:#94a3b8;">${p.crianca_propos_rel.nickname} (dá ${p.figurinha_ofertada_rel.id_figurinha}) <-> ${p.crianca_aceitou_rel.nickname} (dá ${p.figurinha_solicitada_rel.id_figurinha})</span>
                            </div>
                            <div style="display:flex; gap:0.5rem;">
                                <button class="btn-success" onclick="aprovarTroca(${p.id_troca}, true)">Aprovar</button>
                                <button class="btn-danger" onclick="aprovarTroca(${p.id_troca}, false)">Recusar</button>
                            </div>
                        </div>
                    `;
                });
                if(data.pendentes.length === 0) list.innerHTML = '<p>Nenhuma troca pendente.</p>';
            } catch(e) {}
        }

        async function aprovarTroca(id, aprovado) {
            try {
                await fetchAPI('/trocas/aprovar', 'POST', { id_troca: id, aprovado });
                carregarPendencias();
            } catch(e) {}
        }

        async function fazerAposta(tipo, odd, num) {
            const valor = document.getElementById(`aposta-valor-${num}`).value;
            try {
                await fetchAPI('/apostas/nova', 'POST', { valor_apostado: Number(valor), tipo_aposta: tipo, odd: odd });
                carregarSaldoPai();
                alert('Aposta registrada!');
            } catch(e) {}
        }

        async function resolverAposta() {
            const id = document.getElementById('resolver-id').value;
            const res = document.getElementById('resolver-resultado').value;
            try {
                await fetchAPI('/apostas/resolver', 'POST', { id_aposta: Number(id), resultado: res });
                carregarSaldoPai();
                alert('Aposta resolvida!');
            } catch(e) {}
        }

        // ================= LÓGICA DEPENDENTE =================
        async function initDependente() {
            carregarSaldoCrianca();
            carregarAlbum();
        }

        async function carregarSaldoCrianca() {
            try {
                const data = await fetchAPI('/financeiro/saldo-crianca');
                document.getElementById('dep-moedas').innerText = data.saldo_moedas;
            } catch(e) {}
        }

        async function carregarAlbum() {
            try {
                const data = await fetchAPI('/album/meu-album');
                const cont = document.getElementById('album-container');
                cont.innerHTML = '';
                data.album.forEach(reg => {
                    cont.innerHTML += `
                        <div class="sticker-card">
                            ${reg.quantidade > 1 ? `<div class="badge-qtd">${reg.quantidade}</div>` : ''}
                            <img src="${reg.figurinha.imagem}" alt="${reg.figurinha.nome_jogador}">
                            <h4>${reg.figurinha.nome_jogador}</h4>
                            <p style="font-size:0.8rem; color:#94a3b8;">#${reg.figurinha.id_figurinha}</p>
                        </div>
                    `;
                });
            } catch(e) {}
        }

        async function comprarPacote() {
            try {
                const data = await fetchAPI('/financeiro/comprar-pacote-com-moedas', 'POST');
                appState.novasCartas = data.figurinhas;
                carregarSaldoCrianca();
                
                // Mostrar animação
                document.getElementById('pack-overlay').classList.remove('hidden');
                document.getElementById('pack-item').style.display = 'flex';
                document.getElementById('cards-reveal').style.display = 'none';
                document.getElementById('close-pack-btn').classList.add('hidden');
            } catch(e) {}
        }

        function revelarCartas() {
            document.getElementById('pack-item').style.display = 'none';
            const cont = document.getElementById('cards-reveal');
            cont.innerHTML = '';
            cont.style.display = 'grid';

            appState.novasCartas.forEach((fig, i) => {
                setTimeout(() => {
                    cont.innerHTML += `
                        <div class="sticker-card" style="animation: pulse 0.5s ease;">
                            <div class="badge-qtd" style="background:${fig.is_nova ? '#10b981' : '#f59e0b'}; font-size:0.6rem; width:auto; padding:0 5px; right:0; top:0;">${fig.is_nova ? 'Nova!' : 'Repetida'}</div>
                            <img src="${fig.imagem}" alt="Figurinha">
                            <h4>${fig.nome_jogador}</h4>
                        </div>
                    `;
                }, i * 300);
            });

            setTimeout(() => {
                document.getElementById('close-pack-btn').classList.remove('hidden');
            }, appState.novasCartas.length * 300 + 500);
        }

        function fecharPacote() {
            document.getElementById('pack-overlay').classList.add('hidden');
            carregarAlbum();
        }

        // Feira Global
        async function criarOfertaGlobal() {
            const of = document.getElementById('oferece-id').value;
            const q = document.getElementById('quer-id').value;
            try {
                await fetchAPI('/trocas/criar-oferta', 'POST', { id_figurinha_ofertada: Number(of), id_figurinha_solicitada: Number(q) });
                alert('Oferta lançada na Feira Global!');
                carregarOfertasGlobais();
            } catch(e) {}
        }

        async function carregarOfertasGlobais() {
            try {
                const data = await fetchAPI('/trocas/feira-global');
                const list = document.getElementById('lista-ofertas-global');
                list.innerHTML = '';
                data.ofertas.forEach(o => {
                    list.innerHTML += `
                        <div class="list-item">
                            <div>
                                <strong>${o.crianca_propos_rel.nickname}</strong>
                                <p style="font-size:0.8rem;">Dá: ${o.figurinha_ofertada_rel.id_figurinha} | Quer: ${o.figurinha_solicitada_rel.id_figurinha}</p>
                            </div>
                            <button class="btn-success" style="padding:0.5rem 1rem;" onclick="aceitarOfertaGlobal(${o.id_troca})">Aceitar</button>
                        </div>
                    `;
                });
            } catch(e) {}
        }

        async function aceitarOfertaGlobal(id) {
            try {
                await fetchAPI('/trocas/aceitar-oferta', 'POST', { id_troca: id });
                alert('Troca aceita! Aguardando pais.');
                carregarOfertasGlobais();
            } catch(e) {}
        }

        // Chat
        async function abrirChat() {
            const nick = document.getElementById('chat-amigo').value;
            try {
                const data = await fetchAPI('/chat/nova-sala', 'POST', { nickname_amigo: nick });
                appState.salaChatAtiva = data.sala.id_sala;
                carregarMsgsChat();
                setInterval(carregarMsgsChat, 3000); // Polling simples
            } catch(e) {}
        }

        async function carregarMsgsChat() {
            if(!appState.salaChatAtiva) return;
            try {
                const data = await fetchAPI(`/chat/sala/${appState.salaChatAtiva}`);
                const box = document.getElementById('chat-box');
                box.innerHTML = '';
                data.mensagens.forEach(m => {
                    const cor = m.status_moderacao === 'Aprovada' ? '#cbd5e1' : '#ef4444';
                    box.innerHTML += `<div style="background: rgba(255,255,255,0.1); padding:0.5rem; border-radius:8px;">
                        <strong style="color:var(--primary);">${m.enviou.nickname}:</strong> 
                        <span style="color:${cor}">${m.conteudo_mensagem}</span>
                    </div>`;
                });
                box.scrollTop = box.scrollHeight;
            } catch(e) {}
        }

        async function enviarMensagem() {
            const txt = document.getElementById('chat-msg').value;
            if(!txt || !appState.salaChatAtiva) return;
            try {
                await fetchAPI('/chat/mensagem', 'POST', { id_sala: appState.salaChatAtiva, conteudo: txt });
                document.getElementById('chat-msg').value = '';
                carregarMsgsChat();
            } catch(e) {}
        }

        // Inicia
        checkAuth();
    