const usuarioService = require('../services/usuarioService');

const register = async (req, res) => {
  try {
    const user = await usuarioService.register(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await usuarioService.login(email, password);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    await usuarioService.changePassword(req.user.id, oldPassword, newPassword);
    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = { register, login, changePassword };
