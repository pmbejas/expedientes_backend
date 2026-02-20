const Usuario = require('../models/Usuario');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const register = async (data) => {
  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(data.password, salt);
  
  const newUser = await Usuario.create({
    ...data,
    password: hashedPassword
  });
  
  return newUser;
};

const login = async (email, password) => {
  const user = await Usuario.findOne({ where: { email } });
  if (!user) throw new Error('Usuario no encontrado');

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error('Contraseña incorrecta');

  // Create token
  const payload = {
    id: user.id,
    nombre: user.nombre,
    rol: user.rol,
    vocalia_id: user.vocalia_id
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
  return { token, user };
};

const getAll = async () => {
    return await Usuario.findAll({
        attributes: { exclude: ['password'] }
    });
};

const getById = async (id) => {
    return await Usuario.findByPk(id, {
        attributes: { exclude: ['password'] }
    });
};

const update = async (id, data) => {
    const user = await Usuario.findByPk(id);
    if (!user) throw new Error('Usuario no encontrado');

    const updateData = { ...data };
    
    // If password provided, hash it
    if (updateData.password && updateData.password.trim() !== '') {
        const salt = await bcrypt.genSalt(10);
        updateData.password = await bcrypt.hash(updateData.password, salt);
    } else {
        delete updateData.password; // Don't wipe it if empty
    }

    await user.update(updateData);
    return await getById(id);
};

const remove = async (id) => {
    return await Usuario.destroy({ where: { id } });
};

const changePassword = async (id, oldPassword, newPassword) => {
    const user = await Usuario.findByPk(id);
    if (!user) throw new Error('Usuario no encontrado');

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) throw new Error('La contraseña actual es incorrecta');

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    return true;
};

module.exports = {
  register,
  login,
  getAll,
  getById,
  update,
  remove,
  changePassword
};
