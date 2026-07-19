// Lógica da Supra Cell, compartilhada entre index.html, admin.html e carrinho.html
const CARRINHO_STORAGE_KEY = "supracell_carrinho";

// TODO: troque pelo número de WhatsApp real da loja (DDI + DDD + número, só dígitos, sem espaços ou símbolos)
const WHATSAPP_NUMERO = "5500000000000";

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
});
