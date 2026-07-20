// Vercel Serverless Function acionada 1x/dia pelo Vercel Cron (ver vercel.json).
// Faz um SELECT simples na tabela "produtos" só para gerar atividade no
// projeto Supabase e evitar a pausa automática por inatividade dos
// projetos gratuitos.

const SUPABASE_URL = "https://leimljlqfdcknfwppwfq.supabase.co";
const SUPABASE_KEY = "sb_publishable_jzSjW220_Aart7QFEhY-OQ_3FaYzQeG";

module.exports = async (req, res) => {
  try {
    const resposta = await fetch(`${SUPABASE_URL}/rest/v1/produtos?select=id&limit=1`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });

    if (!resposta.ok) {
      const erro = await resposta.text();
      return res.status(502).json({ ok: false, erro });
    }

    const dados = await resposta.json();
    return res.status(200).json({
      ok: true,
      mensagem: "Ping no Supabase realizado com sucesso — projeto mantido ativo.",
      horario: new Date().toISOString(),
      itens_lidos: dados.length,
    });
  } catch (erro) {
    return res.status(500).json({ ok: false, erro: String(erro) });
  }
};
