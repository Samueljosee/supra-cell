// Lógica da Supra Cell, compartilhada entre index.html, admin.html e carrinho.html
const CARRINHO_STORAGE_KEY = "supracell_carrinho";

// Valor de fallback, usado só se a tabela "configuracoes" ainda não tiver
// nada salvo ou a busca falhar. O número real é gerenciado pelo
// cadastrador.py (campo "WhatsApp de Atendimento") e carregado dinamicamente
// pela função buscarConfiguracoes() no final deste arquivo.
let WHATSAPP_NUMERO = "5500000000000";

// ---------- Configuração do Supabase ----------
// Publishable key: feita para uso no front-end, protegida pelas
// políticas de Row Level Security (RLS) configuradas no projeto Supabase.
// IMPORTANTE: a tabela "produtos" precisa ter RLS habilitado com uma policy
// de SELECT liberada para todos (leitura pública da vitrine) e uma policy
// de INSERT/DELETE liberada para o painel admin funcionar.
const SUPABASE_URL = "https://leimljlqfdcknfwppwfq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_jzSjW220_Aart7QFEhY-OQ_3FaYzQeG";

// window.supabase só existe se a página incluir o CDN do supabase-js.
// Guardado assim para o carrinho.html continuar funcionando sem essa dependência.
const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// ---------- Persistência no LocalStorage ----------

function obterCarrinho() {
  const dados = localStorage.getItem(CARRINHO_STORAGE_KEY);
  return dados ? JSON.parse(dados) : [];
}

function salvarCarrinho(carrinho) {
  localStorage.setItem(CARRINHO_STORAGE_KEY, JSON.stringify(carrinho));
}

// ---------- Operações do carrinho ----------

function adicionarAoCarrinho(produto) {
  const carrinho = obterCarrinho();
  const itemExistente = carrinho.find((item) => item.id === produto.id);

  if (itemExistente) {
    itemExistente.quantidade += 1;
  } else {
    carrinho.push({ ...produto, quantidade: 1 });
  }

  salvarCarrinho(carrinho);
  atualizarContadorCarrinho();
}

function removerDoCarrinho(id) {
  const carrinho = obterCarrinho().filter((item) => item.id !== id);
  salvarCarrinho(carrinho);
  atualizarContadorCarrinho();
  renderizarCarrinho();
}

function alterarQuantidade(id, novaQuantidade) {
  const carrinho = obterCarrinho();
  const item = carrinho.find((item) => item.id === id);
  if (!item) return;

  if (novaQuantidade < 1) {
    removerDoCarrinho(id);
    return;
  }

  item.quantidade = novaQuantidade;
  salvarCarrinho(carrinho);
  atualizarContadorCarrinho();
  renderizarCarrinho();
}

// ---------- Cálculos e formatação ----------

function calcularTotalItens(carrinho) {
  return carrinho.reduce((total, item) => total + item.quantidade, 0);
}

function calcularValorTotal(carrinho) {
  return carrinho.reduce((total, item) => total + item.preco * item.quantidade, 0);
}

function formatarMoeda(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ---------- Atualização da interface ----------

// Atualiza o número exibido no ícone do carrinho (presente no header de todas as páginas)
function atualizarContadorCarrinho() {
  const badge = document.getElementById("cart-count");
  if (!badge) return;
  badge.textContent = calcularTotalItens(obterCarrinho());
}

// Desenha a lista de itens na página carrinho.html (não faz nada se os elementos não existirem)
function renderizarCarrinho() {
  const container = document.getElementById("cart-items");
  const vazioMsg = document.getElementById("cart-empty");
  const resumo = document.getElementById("cart-resumo");
  if (!container) return;

  const carrinho = obterCarrinho();
  container.innerHTML = "";

  if (carrinho.length === 0) {
    vazioMsg?.classList.remove("hidden");
    resumo?.classList.add("hidden");
    document.getElementById("cart-total").textContent = formatarMoeda(0);
    return;
  }

  vazioMsg?.classList.add("hidden");
  resumo?.classList.remove("hidden");

  carrinho.forEach((item) => {
    const subtotal = item.preco * item.quantidade;

    const linha = document.createElement("div");
    linha.className =
      "flex flex-col sm:flex-row sm:items-center gap-4 bg-white rounded-2xl shadow-sm p-4";

    linha.innerHTML = `
      <img src="${item.imagem}" alt="${item.nome}" class="w-20 h-20 rounded-xl object-cover mx-auto sm:mx-0" />

      <div class="flex-1 text-center sm:text-left">
        <h3 class="font-semibold text-gray-900">${item.nome}</h3>
        <p class="text-slate-900 font-bold mt-1">${formatarMoeda(item.preco)}</p>
      </div>

      <div class="flex items-center justify-center gap-2">
        <button class="btn-diminuir w-8 h-8 rounded-full border border-gray-300 hover:bg-gray-100 transition font-bold" data-id="${item.id}">−</button>
        <span class="w-8 text-center font-medium">${item.quantidade}</span>
        <button class="btn-aumentar w-8 h-8 rounded-full border border-gray-300 hover:bg-gray-100 transition font-bold" data-id="${item.id}">+</button>
      </div>

      <div class="text-center sm:text-right sm:w-28">
        <p class="font-bold text-gray-900">${formatarMoeda(subtotal)}</p>
      </div>

      <button class="btn-remover text-red-500 hover:text-red-700 transition text-sm font-medium" data-id="${item.id}">
        Remover
      </button>
    `;

    container.appendChild(linha);
  });

  document.getElementById("cart-total").textContent = formatarMoeda(calcularValorTotal(carrinho));

  // Liga os botões +/- e remover recém-criados
  container.querySelectorAll(".btn-aumentar").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = obterCarrinho().find((i) => i.id === btn.dataset.id);
      alterarQuantidade(btn.dataset.id, item.quantidade + 1);
    });
  });

  container.querySelectorAll(".btn-diminuir").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = obterCarrinho().find((i) => i.id === btn.dataset.id);
      alterarQuantidade(btn.dataset.id, item.quantidade - 1);
    });
  });

  container.querySelectorAll(".btn-remover").forEach((btn) => {
    btn.addEventListener("click", () => removerDoCarrinho(btn.dataset.id));
  });
}

// ---------- Vitrine de produtos (index.html) ----------

// Desenha os cards de produto no grid da index.html a partir dos dados do Supabase
function renderizarProdutos(produtos) {
  const grid = document.getElementById("produtos-grid");
  if (!grid) return;

  if (produtos.length === 0) {
    grid.innerHTML =
      '<p class="col-span-2 lg:col-span-4 text-center text-gray-500 py-10">Nenhum produto cadastrado ainda.</p>';
    return;
  }

  grid.innerHTML = "";

  produtos.forEach((produto) => {
    const card = document.createElement("div");
    card.className =
      "bg-white rounded-2xl shadow-sm hover:shadow-md transition overflow-hidden flex flex-col";

    card.innerHTML = `
      <img src="${produto.imagem_url}" alt="${produto.nome}" class="w-full aspect-square object-cover" />
      <div class="p-3 sm:p-4 flex flex-col flex-1">
        <h3 class="font-semibold text-sm sm:text-base text-gray-900 line-clamp-2">${produto.nome}</h3>
        <p class="text-slate-900 font-bold text-lg mt-2">${formatarMoeda(Number(produto.preco))}</p>
        <div class="mt-auto pt-3">
          <button class="btn-add-carrinho w-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium py-2 rounded-lg transition">
            Adicionar ao Carrinho
          </button>
        </div>
      </div>
    `;

    const botao = card.querySelector(".btn-add-carrinho");
    botao.addEventListener("click", () => {
      adicionarAoCarrinho({
        id: String(produto.id),
        nome: produto.nome,
        preco: Number(produto.preco),
        imagem: produto.imagem_url,
      });

      const textoOriginal = botao.textContent;
      botao.textContent = "Adicionado! ✓";
      botao.disabled = true;
      setTimeout(() => {
        botao.textContent = textoOriginal;
        botao.disabled = false;
      }, 900);
    });

    grid.appendChild(card);
  });
}

// Busca os produtos cadastrados no Supabase e manda renderizar na vitrine
async function buscarProdutos() {
  const grid = document.getElementById("produtos-grid");
  if (!grid || !supabaseClient) return;

  const { data, error } = await supabaseClient
    .from("produtos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    grid.innerHTML = `<p class="col-span-2 lg:col-span-4 text-center text-red-500 py-10">Erro ao carregar produtos: ${error.message}</p>`;
    return;
  }

  renderizarProdutos(data);
}

// ---------- Categorias (menu do header + seção "Navegue por Categorias") ----------

// Busca a lista de categorias no Supabase e desenha tanto a barra de
// navegação do header quanto os cards da index.html. Roda em qualquer
// página que tenha os containers (index.html e/ou carrinho.html); se a
// tabela ainda não existir ou a busca falhar, os containers só ficam vazios.
async function buscarCategorias() {
  if (!supabaseClient) return;

  const { data, error } = await supabaseClient
    .from("categorias")
    .select("nome, emoji")
    .order("ordem", { ascending: true });

  if (error || !data) return;

  renderizarMenuCategorias(data);
  renderizarCardsCategorias(data);
}

function renderizarMenuCategorias(categorias) {
  const lista = document.getElementById("categorias-nav");
  if (!lista) return;

  const baseHref = lista.dataset.baseHref || "";
  lista.innerHTML = "";

  categorias.forEach((categoria) => {
    const item = document.createElement("li");
    item.className = "shrink-0";
    item.innerHTML = `
      <a
        href="${baseHref}#produtos"
        class="relative flex items-center gap-1.5 py-1 hover:text-[#0B1A30] transition-colors after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-0 after:bg-[#0B1A30] after:transition-all after:duration-300 hover:after:w-full"
      >
        <span>${categoria.emoji || ""}</span>${categoria.nome}
      </a>
    `;
    lista.appendChild(item);
  });
}

function renderizarCardsCategorias(categorias) {
  const grid = document.getElementById("categorias-grid");
  if (!grid) return;

  grid.innerHTML = "";

  categorias.forEach((categoria) => {
    const card = document.createElement("a");
    card.href = "#produtos";
    card.className =
      "group flex flex-col items-center gap-3 bg-white rounded-2xl shadow-sm p-4 sm:p-5 border border-transparent hover:border-[#d9531e] hover:shadow-md hover:-translate-y-[5px] transition-all duration-300";
    card.innerHTML = `
      <span class="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-100 flex items-center justify-center text-3xl sm:text-4xl group-hover:bg-[#0B1A30] transition">${categoria.emoji || "🏷️"}</span>
      <span class="text-xs sm:text-sm font-semibold text-gray-900 text-center leading-tight">${categoria.nome}</span>
    `;
    grid.appendChild(card);
  });
}

// ---------- Configurações da loja (WhatsApp, mensagem e redes sociais) ----------

// Mensagem usada no botão flutuante se a loja ainda não tiver configurado
// uma mensagem própria pelo cadastrador.py.
let MENSAGEM_WHATSAPP_PADRAO = "Olá! Vim do site da Supra Cell e gostaria de mais informações.";

// Chaves salvas na tabela "configuracoes" pela aba "Configurações" do cadastrador.py
const CHAVES_CONFIGURACOES = [
  "whatsapp_atendimento",
  "mensagem_whatsapp",
  "link_instagram",
  "link_facebook",
  "link_chat",
];

// IDs dos ícones do rodapé <-> chave correspondente na tabela "configuracoes"
const MAPA_LINKS_RODAPE = {
  "link-instagram-footer": "link_instagram",
  "link-facebook-footer": "link_facebook",
  "link-chat-footer": "link_chat",
};

// Busca todas as configurações da loja salvas no Supabase e atualiza o
// botão flutuante do WhatsApp, o número usado no checkout do carrinho e
// os links dos ícones de redes sociais do rodapé.
async function buscarConfiguracoes() {
  if (!supabaseClient) return;

  const { data, error } = await supabaseClient
    .from("configuracoes")
    .select("chave, valor")
    .in("chave", CHAVES_CONFIGURACOES);

  if (error || !data) {
    atualizarBotaoWhatsappFlutuante();
    return;
  }

  const valores = {};
  data.forEach((item) => {
    if (item.valor) valores[item.chave] = item.valor;
  });

  if (valores.whatsapp_atendimento) WHATSAPP_NUMERO = valores.whatsapp_atendimento;
  if (valores.mensagem_whatsapp) MENSAGEM_WHATSAPP_PADRAO = valores.mensagem_whatsapp;

  atualizarBotaoWhatsappFlutuante();
  atualizarLinksRodape(valores);
}

// Aplica o WHATSAPP_NUMERO e a mensagem atuais no link do botão flutuante
// (presente só na index.html), no formato https://wa.me/<numero>?text=<mensagem codificada>
function atualizarBotaoWhatsappFlutuante() {
  const botao = document.getElementById("botao-whatsapp-flutuante");
  if (!botao) return;

  botao.href = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(MENSAGEM_WHATSAPP_PADRAO)}`;
}

// Aplica os links de Instagram/Facebook/Chat nos ícones do rodapé. Ícones
// sem link configurado mantêm o href padrão ("#"), sem quebrar a página.
function atualizarLinksRodape(valores) {
  Object.entries(MAPA_LINKS_RODAPE).forEach(([idIcone, chave]) => {
    if (!valores[chave]) return;
    const icone = document.getElementById(idIcone);
    if (icone) icone.href = valores[chave];
  });
}

// ---------- Painel administrativo (admin.html) ----------

// Envia um novo produto para a tabela "produtos" no Supabase
async function cadastrarProduto(produto) {
  return supabaseClient.from("produtos").insert(produto);
}

// Lista os produtos cadastrados no painel admin, com opção de excluir
async function carregarProdutosAdmin() {
  const lista = document.getElementById("admin-produtos-lista");
  if (!lista || !supabaseClient) return;

  const { data, error } = await supabaseClient
    .from("produtos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    lista.innerHTML = `<p class="text-sm text-red-600">Erro ao carregar produtos: ${error.message}</p>`;
    return;
  }

  if (data.length === 0) {
    lista.innerHTML = '<p class="text-sm text-gray-500">Nenhum produto cadastrado ainda.</p>';
    return;
  }

  lista.innerHTML = "";

  data.forEach((produto) => {
    const linha = document.createElement("div");
    linha.className = "flex items-center gap-3 bg-white rounded-xl shadow-sm p-3";

    linha.innerHTML = `
      <img src="${produto.imagem_url}" alt="${produto.nome}" class="w-12 h-12 rounded-lg object-cover" />
      <div class="flex-1 min-w-0">
        <p class="font-medium text-sm text-gray-900 truncate">${produto.nome}</p>
        <p class="text-xs text-gray-500">${produto.categoria || "Sem categoria"} · ${formatarMoeda(Number(produto.preco))}</p>
      </div>
      <button class="btn-excluir-produto text-red-500 hover:text-red-700 text-sm font-medium shrink-0">Excluir</button>
    `;

    linha.querySelector(".btn-excluir-produto").addEventListener("click", async () => {
      const { error: erroExclusao } = await supabaseClient.from("produtos").delete().eq("id", produto.id);
      if (erroExclusao) {
        alert("Erro ao excluir produto: " + erroExclusao.message);
        return;
      }
      carregarProdutosAdmin();
    });

    lista.appendChild(linha);
  });
}

// ---------- Checkout / envio do pedido pelo WhatsApp ----------

function abrirModalCheckout() {
  const carrinho = obterCarrinho();
  if (carrinho.length === 0) return;
  document.getElementById("checkout-modal")?.classList.remove("hidden");
}

function fecharModalCheckout() {
  document.getElementById("checkout-modal")?.classList.add("hidden");
}

// Monta o texto do pedido a partir dos itens do carrinho e dos dados do cliente
function gerarMensagemPedido(carrinho, cliente) {
  const linhasItens = carrinho
    .map((item) => `• ${item.quantidade}x ${item.nome} — ${formatarMoeda(item.preco * item.quantidade)}`)
    .join("\n");

  return (
    `*Novo Pedido - Supra Cell*\n\n` +
    `*Cliente:* ${cliente.nome}\n` +
    `*Endereço:* ${cliente.endereco}\n` +
    `*CEP:* ${cliente.cep}\n\n` +
    `*Itens do Pedido:*\n${linhasItens}\n\n` +
    `*Total: ${formatarMoeda(calcularValorTotal(carrinho))}*`
  );
}

// Abre o WhatsApp (wa.me) já com a mensagem do pedido preenchida
function enviarPedidoWhatsApp(numero, mensagem) {
  const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
  window.open(url, "_blank");
}

// ---------- Inicialização ----------

document.addEventListener("DOMContentLoaded", () => {
  // Botões "Adicionar ao Carrinho" (presentes na index.html)
  document.querySelectorAll(".btn-add-carrinho").forEach((btn) => {
    btn.addEventListener("click", () => {
      adicionarAoCarrinho({
        id: btn.dataset.id,
        nome: btn.dataset.nome,
        preco: parseFloat(btn.dataset.preco),
        imagem: btn.dataset.imagem,
      });

      const textoOriginal = btn.textContent;
      btn.textContent = "Adicionado! ✓";
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = textoOriginal;
        btn.disabled = false;
      }, 900);
    });
  });

  // Botão "Finalizar Compra" e modal de checkout (presentes na carrinho.html)
  document.getElementById("btn-finalizar-compra")?.addEventListener("click", abrirModalCheckout);
  document.getElementById("btn-fechar-modal")?.addEventListener("click", fecharModalCheckout);

  document.getElementById("form-checkout")?.addEventListener("submit", (evento) => {
    evento.preventDefault();

    const carrinho = obterCarrinho();
    if (carrinho.length === 0) return;

    const cliente = {
      nome: document.getElementById("nome-cliente").value.trim(),
      endereco: document.getElementById("endereco-cliente").value.trim(),
      cep: document.getElementById("cep-cliente").value.trim(),
    };

    const mensagem = gerarMensagemPedido(carrinho, cliente);
    enviarPedidoWhatsApp(WHATSAPP_NUMERO, mensagem);

    salvarCarrinho([]);
    atualizarContadorCarrinho();
    renderizarCarrinho();
    fecharModalCheckout();
    evento.target.reset();
  });

  // Formulário de cadastro de produto (presente na admin.html)
  document.getElementById("form-cadastro-produto")?.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const botaoSubmit = evento.target.querySelector("button[type='submit']");
    const textoOriginal = botaoSubmit.textContent;
    botaoSubmit.disabled = true;
    botaoSubmit.textContent = "Cadastrando...";

    const produto = {
      nome: document.getElementById("produto-nome").value.trim(),
      categoria: document.getElementById("produto-categoria").value,
      preco: parseFloat(document.getElementById("produto-preco").value),
      imagem_url: document.getElementById("produto-imagem").value.trim(),
    };

    const { error } = await cadastrarProduto(produto);

    botaoSubmit.disabled = false;
    botaoSubmit.textContent = textoOriginal;

    const feedback = document.getElementById("admin-feedback");

    if (error) {
      feedback.textContent = "Erro ao cadastrar: " + error.message;
      feedback.className = "text-sm font-medium text-red-600 mt-2";
      return;
    }

    feedback.textContent = "Produto cadastrado com sucesso!";
    feedback.className = "text-sm font-medium text-green-600 mt-2";
    evento.target.reset();
    carregarProdutosAdmin();
  });

  // Roda em toda página que incluir script.js
  atualizarContadorCarrinho();
  renderizarCarrinho();
  buscarProdutos();
  carregarProdutosAdmin();
  buscarConfiguracoes();
  buscarCategorias();
});
