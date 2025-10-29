// routes/auth.js
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Ping simple
router.get('/', (req, res) => {
  res.json({ message: 'Ruta auth funcionando ✅' });
});

// Firmar JWT
function sign(user) {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// Registro
router.post('/register', async (req, res) => {
  try {
    const { name = '', email = '', password = '' } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email y password son requeridos' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'El email ya está registrado' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash });

    const token = sign(user);
    return res.status(201).json({ user, token });
  } catch (err) {
    return res.status(500).json({ message: 'Error registrando usuario', error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email = '', password = '' } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Credenciales inválidas' });

    const token = sign(user);
    return res.json({ user, token });
  } catch (err) {
    return res.status(500).json({ message: 'Error iniciando sesión', error: err.message });
  }
});

// Middleware auth
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return res.status(401).json({ message: 'Token requerido' });
  try {
    req.user = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
}

// Perfil protegido
router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json({ user });
});

module.exports = router;
