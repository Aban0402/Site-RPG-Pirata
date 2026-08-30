const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static('.'));

let bancoFichasRPG = [];

app.get('/api/health', (req, res) => {
    res.json({
        status: "Servidor RPG Forge está online!",
        totalFichasArmazenadas: bancoFichasRPG.length
    });
});

app.get('/api/fichas', (req, res) => {
    res.json(bancoFichasRPG);
});

app.post('/api/fichas', (req, res) => {
    const dadosPersonagem = req.body;

    if (!dadosPersonagem.nome || dadosPersonagem.nome.trim() === "") {
        return res.status(400).json({ erro: "O nome do personagem não pode ser vazio." });
    }

    dadosPersonagem.idServer = bancoFichasRPG.length + 1;
    dadosPersonagem.criadoEm = new Date().toISOString();

    bancoFichasRPG.push(dadosPersonagem);

    console.log(`\n===== NOVA FICHA CADASTRADA [Sistema: ${dadosPersonagem.sistema || 'Não Informado'}] =====`);
    console.log(`Nome: ${dadosPersonagem.nome} | Raça: ${dadosPersonagem.raca} | Classe: ${dadosPersonagem.classe}`);
    console.log("Atributos:", dadosPersonagem.atributos);
    console.log(`Total de fichas salvas no servidor: ${bancoFichasRPG.length}\n`);

    res.status(201).json({
        mensagem: `Ficha de ${dadosPersonagem.nome} salva com sucesso no banco de dados do servidor!`,
        quantiaCriada: bancoFichasRPG.length
    });
});

app.listen(PORT, () => {
    console.log(`Servidor RPG Forge rodando na porta ${PORT}`);
});
