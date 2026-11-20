// Receitas de materiais que se fazem noutras ferramentas (para saber quanto custa um material que o mercado não tem).
// Usado pela página da Siderurgia (os itens vêm daqui) e pelo market.js (custo = soma dos materiais da receita).
// Quantidades por 1 unidade feita.
window.RECEITAS = {
  "Lingote de ferro": { "Ferro": 1 },
  "Aço":              { "Carvão": 1, "Lingote de ferro": 1 },
  "Bronze":           { "Cobre": 1, "Estanho": 1 },
  "Polímero":         { "Carvão": 1, "Petróleo": 1, "Vidro": 1 },
};

// Minas: entregas e devolvem o que sobra. Por cada 1 unidade entregue sai isto (10 lingotes de cobre → 8 Cobre).
// Usado pela página das Minas (os itens vêm daqui) e pelo market.js: o preço de um lingote = o que ele dá
// (1 lingote de cobre = 0,8 × preço do Cobre).
window.CONVERSOES = {
  "Lingote de prata": { "Prata": 0.7 },   // tiram 30 %
  "Lingote de cobre": { "Cobre": 0.8 },   // tiram 20 %
  "Areia":            { "Vidro": 0.4 },   // tiram 60 %
};
