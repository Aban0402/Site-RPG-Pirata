const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.')); 
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS fichas (
                id SERIAL PRIMARY KEY,
                sistema VARCHAR(50),
                nome VARCHAR(100),
                raca VARCHAR(50),
                classe VARCHAR(50),
                atributos JSONB,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Tabela "fichas" pronta no banco de dados.');
    } catch (err) {
        console.error('Erro ao conectar ou criar tabela no BD:', err);
    }
}
initDB();

app.post('/api/fichas', async (req, res) => {
    const { sistema, nome, raca, classe, atributos } = req.body;

    try {
        const queryText = `
            INSERT INTO fichas (sistema, nome, raca, classe, atributos)
            VALUES ($1, $2, $3, $4, $5) RETURNING id;
        `;
        const values = [sistema || 'Pirata', nome, raca, classe, JSON.stringify(atributos)];
        const result = await pool.query(queryText, values);

        const countResult = await pool.query('SELECT COUNT(*) FROM fichas');
        const quantiaCriada = countResult.rows[0].count;

        res.json({ 
            mensagem: 'Ficha salva no Banco de Dados com sucesso!', 
            id: result.rows[0].id,
            quantiaCriada: parseInt(quantiaCriada) 
        });
    } catch (err) {
        console.error('Erro ao inserir no banco:', err);
        res.status(500).json({ erro: 'Falha ao salvar no banco de dados.' });
    }
});

app.get('/api/fichas', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM fichas ORDER BY criado_em DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao buscar fichas.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
