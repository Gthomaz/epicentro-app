
        const API = 'https://epicentro-api.onrender.com/api';
        
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
                document.getElementById('view-cadastro').classList.add('hidden');
                if (appState.role === 'master') {
                    document.getElementById('view-master').classList.remove('hidden');
                    initMaster();
                } else {
                    document.getElementById('view-dependente').classList.remove('hidden');
                    initDependente();
                }
            } else {
                document.getElementById('view-login').classList.remove('hidden');
                document.getElementById('view-cadastro').classList.add('hidden');
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
        function goToCadastro() {
            document.getElementById('view-login').classList.add('hidden');
            document.getElementById('view-cadastro').classList.remove('hidden');
        }

        function voltarLogin() {
            document.getElementById('view-cadastro').classList.add('hidden');
            document.getElementById('view-login').classList.remove('hidden');
        }

        async function doCadastro() {
            const nome_completo = document.getElementById('cad-nome').value;
            const cpf = document.getElementById('cad-cpf').value;
            const senha_master = document.getElementById('cad-pass').value;
            const data_nascimento = document.getElementById('cad-nasc-pai').value;
            
            const nickname_filho = document.getElementById('cad-nick-filho').value;
            const senha_filho = document.getElementById('cad-pass-filho').value;
            const nascimento_filho = document.getElementById('cad-nasc-filho').value;

            try {
                const res = await fetch(`${API}/cadastro/responsavel`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        nome_completo, cpf, senha_master, data_nascimento, 
                        nickname_filho, senha_filho, nascimento_filho 
                    })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar');
                
                alert('Família cadastrada com sucesso! Faça o login do pai e envie o saldo para a criança.');
                voltarLogin();
                document.getElementById('login-id').value = cpf;
            } catch (e) {
                alert(e.message);
            }
        }

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
            const nicknameFilho = document.getElementById('mesada-nickname-filho').value;
            const valor = document.getElementById('mesada-valor').value;
            try {
                await fetchAPI('/financeiro/transferir-mesada', 'POST', { nickname_dependente: nicknameFilho, valor_reais: Number(valor) });
                document.getElementById('mesada-valor').value = '';
                document.getElementById('mesada-nickname-filho').value = '';
                carregarSaldoPai();
                alert('Mesada transferida com sucesso!');
            } catch(e) {}
        }

        async function cadastrarFilhoAdicional() {
            const nickname = document.getElementById('add-nick-filho').value;
            const senha = document.getElementById('add-pass-filho').value;
            const nasc = document.getElementById('add-nasc-filho').value;
            
            if(!nickname || !senha || !nasc) {
                alert('Preencha todos os campos para cadastrar o filho!');
                return;
            }
            
            try {
                await fetchAPI('/cadastro/dependente-adicional', 'POST', { 
                    nickname_filho: nickname, 
                    senha_filho: senha, 
                    nascimento_filho: nasc 
                });
                document.getElementById('add-nick-filho').value = '';
                document.getElementById('add-pass-filho').value = '';
                document.getElementById('add-nasc-filho').value = '';
                alert('Filho cadastrado com sucesso! Agora você pode transferir mesada para ele.');
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

        // Banco de Dados Dinâmico das Figurinhas da Copa do Epicentro
        const dadosFigurinhas = [
            {
                id: "NEY-10",
                nome: "Neymar Jr",
                pais: "Brasil | Atacante",
                avatar: "/assets/figurinhas/ney_caricatura.png",
                habilidade: 99,
                ousadia: 95,
                drible: 98,
                fato: "O mestre do drible e o dono da camisa 10 brasileira. Quando ele arranca, Quissamã segura o fôlego!",
                biografia: "Nascido em Mogi das Cruzes, conquistou a América e a Europa com sua genialidade. É o maior artilheiro da história recente da seleção, conhecido pela ousadia mágica dentro de campo."
            },
            {
                id: "MESSI-10",
                nome: "Lionel Messi",
                pais: "Argentina | Meio",
                avatar: "/assets/figurinhas/messi_caricatura.png",
                habilidade: 99,
                ousadia: 90,
                drible: 97,
                fato: "O gênio dos gramados mundiais. Visão de jogo perfeita e precisão cirúrgica em cada passe.",
                biografia: "Multicampeão mundial, considerado um dos maiores da história do futebol. Sua trajetória é marcada pela consistência genial, conquistas de Bolas de Ouro e liderança técnica incontestável."
            },
            {
                id: "MODRIC-10",
                nome: "Luka Modric",
                pais: "Croácia | Meio",
                avatar: "/assets/figurinhas/modric_caricatura.png",
                habilidade: 95,
                ousadia: 88,
                drible: 92,
                fato: "O maestro que dita o ritmo do jogo com elegância e passes de trivela milimétricos.",
                biografia: "Liderou sua seleção a finais históricas de Copa do Mundo. Vencedor da Bola de Ouro, é o símbolo máximo de resiliência, longevidade e refino técnico no meio-campo europeu."
            },
            {
                id: "CR7-07",
                nome: "Cristiano Ronaldo",
                pais: "Portugal | Atacante",
                avatar: "/assets/figurinhas/cr7_caricatura.png",
                habilidade: 98,
                ousadia: 92,
                drible: 90,
                fato: "O Robozão não para! Uma máquina de fazer gols e quebrar recordes por onde passa.",
                biografia: "Nascido na Madeira, se tornou um ícone global do esporte. Famoso por sua dedicação implacável aos treinos, força física incomparável e saltos estratosféricos. Siiiiii!"
            },
            {
                id: "VINI-20",
                nome: "Vinícius Jr",
                pais: "Brasil | Atacante",
                avatar: "/assets/figurinhas/vini_caricatura.png",
                habilidade: 96,
                ousadia: 98,
                drible: 99,
                fato: "Velocidade da luz e sorriso no rosto. O Baila Vini deixa os zagueiros europeus tontos.",
                biografia: "Cria de São Gonçalo, explodiu para o mundo com sua velocidade estonteante. Vencedor da Champions, hoje é a principal arma ofensiva brasileira e símbolo de luta dentro e fora de campo."
            },
            {
                id: "MBA-10",
                nome: "Kylian Mbappé",
                pais: "França | Atacante",
                avatar: "/assets/figurinhas/mbappe_caricatura.png",
                habilidade: 97,
                ousadia: 90,
                drible: 95,
                fato: "O Tartaruga Ninja das arrancadas. Pode decidir um jogo de Copa em questão de segundos.",
                biografia: "Um prodígio que já conquistou o mundo antes dos 20 anos. Mistura força física brutal com uma velocidade supersônica, sendo o pesadelo de qualquer defesa adversária."
            },
            {
                id: "KDB-17",
                nome: "Kevin De Bruyne",
                pais: "Bélgica | Meio",
                avatar: "/assets/figurinhas/kdb_caricatura.png",
                habilidade: 96,
                ousadia: 80,
                drible: 88,
                fato: "O garçom com GPS no pé. Encontra espaços que ninguém mais no estádio consegue ver.",
                biografia: "Motor criativo de um dos maiores times da Inglaterra. Sua capacidade de colocar a bola exatamente onde quer faz dele o meio-campista mais temido da atualidade."
            },
            {
                id: "BELLI-05",
                nome: "Jude Bellingham",
                pais: "Inglaterra | Meio",
                avatar: "/assets/figurinhas/bellingham_caricatura.png",
                habilidade: 94,
                ousadia: 93,
                drible: 91,
                fato: "Comemoração de braços abertos! O jovem inglês que chegou como veterano e assumiu o protagonismo.",
                biografia: "Uma ascensão meteórica no futebol europeu. Combina a classe dos camisas 10 clássicos com a intensidade dos modernos 'box-to-box'. Um talento geracional para o futuro da Inglaterra."
            },
            {
                id: "HAALAND-09",
                nome: "Erling Haaland",
                pais: "Noruega | Atacante",
                avatar: "/assets/figurinhas/haaland_caricatura.png",
                habilidade: 95,
                ousadia: 85,
                drible: 80,
                fato: "O Cometa Nórdico! Um ciborgue programado apenas para balançar as redes.",
                biografia: "Impiedoso na grande área. Combina uma força estrondosa com precisão letal, destruindo recordes de artilharia em cada campeonato que disputa."
            },
            {
                id: "ALISSON-01",
                nome: "Alisson Becker",
                pais: "Brasil | Goleiro",
                avatar: "/assets/figurinhas/alisson_caricatura.png",
                habilidade: 90,
                ousadia: 80,
                drible: 70,
                fato: "A muralha brasileira. Calmo sob pressão e dono de reflexos inacreditáveis.",
                biografia: "Goleiro titular da Seleção Brasileira por anos. Especialista no um contra um e também em distribuições rápidas de jogo. Já marcou até gol de cabeça!"
            }
        ];

        async function carregarAlbum() {
            try {
                // Restauramos a chamada real da API para exibir as cartas que o usuário de fato possui
                const data = await fetchAPI('/album/meu-album');
                const cont = document.getElementById('album-container');
                cont.innerHTML = '';
                
                data.album.forEach(reg => {
                    const fig = reg.figurinha;
                    // Busca dados ricos (mock) baseados no nome do jogador ou usa um fallback
                    const extras = dadosFigurinhas.find(d => d.nome === fig.nome_jogador) || dadosFigurinhas[0];
                    const avatarImg = (extras.avatar || fig.imagem).replace(/^\//, '');

                    const cardElement = document.createElement("div");
                    cardElement.className = "sticker-card";
                    cardElement.setAttribute("onclick", "this.classList.toggle('flipped')");

                    cardElement.innerHTML = `
                        ${reg.quantidade > 1 ? '<div class="badge-qtd">' + reg.quantidade + '</div>' : ''}
                        <div class="card-inner">
                            <div class="card-front">
                                <span class="card-badge-country">${extras.pais}</span>
                                <h4 class="card-player-name">${fig.nome_jogador}</h4>
                                
                                <div class="card-avatar-box">
                                    <img src="${avatarImg}" alt="${fig.nome_jogador}" onerror="this.src='https://via.placeholder.com/110?text=Craque'">
                                </div>
                                
                                <div class="card-stats-grid">
                                    <div class="stat-box">
                                        <div class="stat-value">${extras.habilidade}</div>
                                        <div class="stat-label">Hab</div>
                                    </div>
                                    <div class="stat-box">
                                        <div class="stat-value">${extras.ousadia}</div>
                                        <div class="stat-label">Ous</div>
                                    </div>
                                    <div class="stat-box">
                                        <div class="stat-value">${extras.drible}</div>
                                        <div class="stat-label">Dri</div>
                                    </div>
                                </div>
                                
                                <div class="card-fact-footer">
                                    <p><strong>Fato:</strong> ${extras.fato}</p>
                                </div>
                            </div>
                            
                            <div class="card-back">
                                <h3>${fig.nome_jogador}</h3>
                                <p><strong>Trajetória:</strong> ${extras.biografia}</p>
                                <p style="margin-top: auto; font-size: 0.6rem; color: rgba(255,215,0,0.6); text-align: center; width: 100%;">
                                    Epicentro Copa 2026 • Clique para virar
                                </p>
                            </div>
                        </div>
                    `;
                    cont.appendChild(cardElement);
                });
            } catch(e) {
                console.error("Erro ao carregar o álbum da Copa", e);
            }
        }

        async function comprarPacote() {
            try {
                const data = await fetchAPI('/financeiro/comprar-pacote-com-moedas', 'POST');
                appState.novasCartas = data.figurinhas;
                carregarSaldoCrianca();
                
                // Mostrar animação
                document.getElementById('pack-overlay').classList.remove('hidden');
                document.getElementById('arena-abertura').style.display = 'flex';
                document.getElementById('pacotinho-epicentro').style.display = 'flex';
                document.getElementById('cards-reveal').style.display = 'none';
                document.getElementById('close-pack-btn').classList.add('hidden');
            } catch(e) {}
        }

        function rasgarPacotinho() {
            const pacotinho = document.getElementById('pacotinho-epicentro');
            const arena = document.getElementById('arena-abertura');
            
            // 1. Inicia a animação de rasgar/tremer
            pacotinho.classList.add('rasgando');
            
            // 2. Após 1.5 segundos, o pacote "estoura"
            setTimeout(() => {
                pacotinho.style.display = 'none'; // Esconde o pacote
                pacotinho.classList.remove('rasgando'); // Limpa a classe
                gerarExplosaoConfetes(); // Chama a explosão de alegria
                
                // 3. Após a explosão (1 segundo depois), mostra as figurinhas novas
                setTimeout(() => {
                    arena.style.display = 'none'; // Oculta a arena do pacote
                    
                    const cont = document.getElementById('cards-reveal');
                    cont.innerHTML = "<h2 style='color:#fff; text-align:center; width: 100%; grid-column: 1 / -1; margin-bottom: 2rem;'>Novos Craques Desbloqueados!</h2>";
                    cont.style.display = 'grid';

                    appState.novasCartas.forEach((fig, i) => {
                        const extras = dadosFigurinhas.find(d => d.nome === fig.nome_jogador) || dadosFigurinhas[0];
                        const avatarImg = (extras.avatar || fig.imagem).replace(/^\//, '');

                        setTimeout(() => {
                            const cardElement = document.createElement("div");
                            cardElement.className = "sticker-card card-reveal";
                            cardElement.setAttribute("onclick", "this.classList.toggle('flipped')");

                            cardElement.innerHTML = `
                                <div class="badge-qtd" style="background:${fig.is_nova ? '#10b981' : '#f59e0b'}; font-size:0.6rem; width:auto; padding:0 5px; right:10px; top:10px; z-index:10;">${fig.is_nova ? 'Nova!' : 'Repetida'}</div>
                                <div class="card-inner">
                                    <div class="card-front">
                                        <span class="card-badge-country">${extras.pais}</span>
                                        <h4 class="card-player-name">${fig.nome_jogador}</h4>
                                        
                                        <div class="card-avatar-box">
                                            <img src="${avatarImg}" alt="${fig.nome_jogador}" onerror="this.src='https://via.placeholder.com/110?text=Craque'">
                                        </div>
                                        
                                        <div class="card-stats-grid">
                                            <div class="stat-box"><div class="stat-value">${extras.habilidade}</div><div class="stat-label">Hab</div></div>
                                            <div class="stat-box"><div class="stat-value">${extras.ousadia}</div><div class="stat-label">Ous</div></div>
                                            <div class="stat-box"><div class="stat-value">${extras.drible}</div><div class="stat-label">Dri</div></div>
                                        </div>
                                        
                                        <div class="card-fact-footer"><p><strong>Fato:</strong> ${extras.fato}</p></div>
                                    </div>
                                    
                                    <div class="card-back">
                                        <h3>${fig.nome_jogador}</h3>
                                        <p><strong>Trajetória:</strong> ${extras.biografia}</p>
                                        <p style="margin-top: auto; font-size: 0.6rem; color: rgba(255,215,0,0.6); text-align: center; width: 100%;">
                                            Epicentro Copa 2026 • Clique para virar
                                        </p>
                                    </div>
                                </div>
                            `;
                            cont.appendChild(cardElement);
                        }, i * 200);
                    });

                    document.getElementById('close-pack-btn').classList.remove('hidden');

                }, 1000); // 1 segundo apos confetes

            }, 1500); // tempo tremendo
        }

        function gerarExplosaoConfetes() {
            const explosaoContainer = document.getElementById('explosao-alegria');
            const cores = ['#FFD700', '#00A859', '#3E4095', '#FFFFFF', '#FF3366']; // Cores do Brasil e vibrantes
            
            // Cria 100 partículas de confete
            for (let i = 0; i < 100; i++) {
                let confete = document.createElement('div');
                confete.className = 'confete';
                
                // Cor e posição aleatória inicial no centro da tela
                confete.style.backgroundColor = cores[Math.floor(Math.random() * cores.length)];
                confete.style.left = '50%';
                confete.style.top = '50%';
                
                explosaoContainer.appendChild(confete);
                
                // Matemática da explosão: joga os confetes em direções aleatórias
                let angulo = Math.random() * Math.PI * 2;
                let velocidade = 100 + Math.random() * 300;
                let tx = Math.cos(angulo) * velocidade;
                let ty = Math.sin(angulo) * velocidade;
                
                // Anima a partícula voando e sumindo
                confete.animate([
                    { transform: 'translate(-50%, -50%) rotate(0deg)', opacity: 1 },
                    { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) rotate(${Math.random() * 720}deg)`, opacity: 0 }
                ], {
                    duration: 1000 + Math.random() * 1000,
                    easing: 'cubic-bezier(0.25, 1, 0.5, 1)'
                });
                
                // Limpa o DOM depois da animação
                setTimeout(() => confete.remove(), 2000);
            }
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
    
