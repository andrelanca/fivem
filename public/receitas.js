// Receitas de materiais que se fazem noutras ferramentas (para saber quanto custa um material que o mercado não tem).
// Usado pela página da Siderurgia (os itens vêm daqui) e pelo market.js (custo = soma dos materiais da receita).
// Quantidades por 1 unidade feita.
window.RECEITAS = {
  "Lingote de ferro": { "Ferro": 1 },
  "Aço":              { "Carvão": 1, "Lingote de ferro": 1 },
  "Bronze":           { "Cobre": 1, "Estanho": 1 },
  "Polímero":         { "Carvão": 1, "Petróleo": 1, "Vidro": 1 },
};
