const { Juzgado, Delito, Estado, Instructor, Juez, Relator } = require('../models');

// Generic function generator can be used, but explicit is clearer for user request "pure functions" preference?
// Actually, I will make specific functions to be safe.

const getJuzgados = async () => await Juzgado.findAll();
const createJuzgado = async (data) => await Juzgado.create(data);
const updateJuzgado = async (id, data) => await Juzgado.update(data, { where: { id } });
const deleteJuzgado = async (id) => await Juzgado.destroy({ where: { id } });

const getDelitos = async () => await Delito.findAll();
const createDelito = async (data) => await Delito.create(data);
const updateDelito = async (id, data) => await Delito.update(data, { where: { id } });
const deleteDelito = async (id) => await Delito.destroy({ where: { id } });

const getInstructores = async () => await Instructor.findAll({ order: [['apellido', 'ASC'], ['nombre', 'ASC']] });
const createInstructor = async (data) => await Instructor.create(data);
const updateInstructor = async (id, data) => await Instructor.update(data, { where: { id } });
const deleteInstructor = async (id) => await Instructor.destroy({ where: { id } });

const getJueces = async () => await Juez.findAll({ order: [['apellido', 'ASC'], ['nombre', 'ASC']] });
const createJuez = async (data) => await Juez.create(data);
const updateJuez = async (id, data) => await Juez.update(data, { where: { id } });
const deleteJuez = async (id) => await Juez.destroy({ where: { id } });

const getRelatores = async () => await Relator.findAll({ order: [['apellido', 'ASC'], ['nombre', 'ASC']] });
const createRelator = async (data) => await Relator.create(data);
const updateRelator = async (id, data) => await Relator.update(data, { where: { id } });
const deleteRelator = async (id) => await Relator.destroy({ where: { id } });

const getEstados = async () => await Estado.findAll();

module.exports = {
  getJuzgados, createJuzgado, updateJuzgado, deleteJuzgado,
  getDelitos, createDelito, updateDelito, deleteDelito,
  getInstructores, createInstructores: createInstructor, updateInstructor, deleteInstructor,
  getJueces, createJuez, updateJuez, deleteJuez,
  getRelatores, createRelator, updateRelator, deleteRelator,
  getEstados
};
