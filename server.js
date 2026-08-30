const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.')); 

const connectionString = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'chave_secreta_super_segura';
function verificarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ erro: 'Token de autenticação não fornecido.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ erro: 'Token inválido ou expirado.' });
        }
        req.user = user;
        next();
    });
}

if (!connectionString) {
  console.error("ERRO: A variável DATABASE_URL não foi definida no ambiente!");
}

const pool = new Pool({
    connectionString: connectionString,
    ssl: connectionString ? { rejectUnauthorized: false } : false
});

async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(100) NOT NULL,
                email VARCHAR(150) UNIQUE NOT NULL,
                senha VARCHAR(255) NOT NULL,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS fichas (
                id SERIAL PRIMARY KEY,
                usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
                sistema VARCHAR(50),
                nome VARCHAR(100),
                raca VARCHAR(50),
                classe VARCHAR(50),
                atributos JSONB,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('Tabelas "usuarios" e "fichas" prontas no banco de dados.');
    } catch (err) {
        console.error('Erro ao conectar ou criar tabelas no BD:', err);
    }
}
initDB();

app.post('/api/auth/register', async (req, res) => {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
        return res.status(400).json({ erro: 'Preencha todos os campos!' });
    }

    try {
        const usuarioExiste = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
        if (usuarioExiste.rows.length > 0) {
            return res.status(400).json({ erro: 'E-mail já cadastrado.' });
        }

        const senhaHash = await bcrypt.hash(senha, 10);
        const novoUsuario = await pool.query(
            'INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3) RETURNING id, nome, email',
            [nome, email, senhaHash]
        );

        res.status(201).json({
            mensagem: 'Usuário cadastrado com sucesso!',
            usuario: novoUsuario.rows[0]
        });
    } catch (err) {
        console.error('Erro no registro:', err);
        res.status(500).json({ erro: 'Erro ao cadastrar usuário.' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ erro: 'Informe e-mail e senha!' });
    }

    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(400).json({ erro: 'Credenciais inválidas.' });
        }

        const usuario = result.rows[0];
        const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

        if (!senhaCorreta) {
            return res.status(400).json({ erro: 'Credenciais inválidas.' });
        }

        const token = jwt.sign(
            { id: usuario.id, email: usuario.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            mensagem: 'Login efetuado com sucesso!',
            token,
            usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email }
        });
    } catch (err) {
        console.error('Erro no login:', err);
        res.status(500).json({ erro: 'Erro ao realizar login.' });
    }
});

app.post('/api/fichas', verificarToken, async (req, res) => {
    const usuario_id = req.user.id;
    const { sistema, nome, raca, classe, atributos } = req.body;

    try {
        const queryText = `
            INSERT INTO fichas (usuario_id, sistema, nome, raca, classe, atributos)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;
        `;
        const values = [usuario_id, sistema || 'Pirata', nome, raca, classe, JSON.stringify(atributos)];
        const result = await pool.query(queryText, values);

        const countResult = await pool.query('SELECT COUNT(*) FROM fichas');
        const quantiaCriada = countResult.rows[0].count;

        res.json({ 
            mensagem: 'Ficha salva no Banco de Dados com sucesso!', 
            id: result.rows[0].id,
            quantiaCriada: parseInt(quantiaCriada) 
        });
    } catch (err) {
        console.error('Erro ao inserir ficha:', err);
        res.status(500).json({ erro: 'Falha ao salvar ficha no banco de dados.' });
    }
});

app.get('/api/fichas', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM fichas ORDER BY criado_em DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao buscar fichas:', err);
        res.status(500).json({ erro: 'Erro ao buscar fichas.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
