const { Inhibicion, Juez, Expediente, Usuario } = require('../models');

const addInhibicion = async (req, res) => {
    try {
        const { expediente_id, juez_id, motivo } = req.body;
        const usuario_id = req.user.id;

        const exists = await Inhibicion.findOne({ 
            where: { expediente_id, juez_id }
        });

        if (exists) {
            return res.status(400).json({ error: 'El juez ya está inhibido en este expediente.' });
        }

        const inhibicion = await Inhibicion.create({
            expediente_id,
            juez_id,
            motivo,
            usuario_id
        });

        res.status(201).json(inhibicion);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al agregar inhibición' });
    }
};

const removeInhibicion = async (req, res) => {
    try {
        const { id } = req.params;
        const inhibicion = await Inhibicion.findByPk(id);
        
        if (!inhibicion) {
            return res.status(404).json({ error: 'Inhibición no encontrada' });
        }

        await inhibicion.destroy();
        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar inhibición' });
    }
};

const getInhibiciones = async (req, res) => {
    try {
        const { expediente_id } = req.query;
        if (!expediente_id) return res.status(400).json({ error: 'Falta expediente_id' });

        const list = await Inhibicion.findAll({
            where: { expediente_id },
            include: [
                { model: Juez, attributes: ['id', 'nombre', 'apellido'] },
                { model: Usuario, attributes: ['nombre'] }
            ]
        });

        res.json(list);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener inhibiciones' });
    }
};

module.exports = {
    addInhibicion,
    removeInhibicion,
    getInhibiciones
};
