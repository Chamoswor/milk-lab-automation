import Rack      from '../models/rackModel.js';
import RackSlot  from '../models/rackSlotModel.js';
import Sample    from '../models/sampleModel.js';
import SampleType from '../models/sampleTypeModel.js';

/**
 * GET /api/lab/racks?withSlots=true
 * Returnerer racks, alltid 10 posisjoner pr. rack.
 */
export const getRacks = async (req, res) => {
  const withSlots = req.query.withSlots === 'true';

  try {
    const racks = await Rack.findAll({
      include: withSlots
        ? [{
            model: RackSlot,
            as: 'slots',
            include: [{
              model: Sample,
              as:   'sample',
              include: [{ model: SampleType, as: 'type' }],
            }],
            order: [['position', 'ASC']],
          }]
        : [],
      order: [['created_at', 'ASC']],
    });

    // Fyll eventuelle «hull» så front-end har 10 kort uansett
    const filled = racks.map(r => {
      const data = r.toJSON();
      if (withSlots) {
        const map = new Map(data.slots.map(s => [s.position, s]));
        data.slots = Array.from({ length: 10 }, (_, i) =>
          map.get(i + 1) || { position: i + 1, sample: null });
      }
      return data;
    });
    res.json(filled);
  } catch (err) {
    console.error('Failed to fetch racks:', err);
    res.status(500).json({ error: 'Failed to fetch racks' });
  }
};

/**
 * POST /api/lab/racks/:rackId/slot/:position
 *  body: { sampleId }
 */
export const placeSample = async (req, res) => {
  const { rackId, position } = req.params;
  const { sampleId }        = req.body;

  try {
    const [slot] = await RackSlot.findOrCreate({
      where:    { rack_id: rackId, position },
      defaults: { sample_id: sampleId },
    });

    if (slot.sample_id && slot.sample_id !== sampleId) {
      return res.status(400).json({ error: 'Slot already taken' });
    }
    slot.sample_id = sampleId;
    await slot.save();
    res.json(slot);
  } catch (err) {
    console.error('Cannot place sample:', err);
    res.status(500).json({ error: 'Cannot place sample' });
  }
};

/**
 * PUT /api/lab/racks/:id
 *  body: { rfid?, sample_type? }
 */
export const updateRack = async (req, res) => {
  try {
    await Rack.update(req.body, { where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update rack' });
  }
};

/**
 * GET /api/lab/rack-types
 * Retournerer [{ id, name }]
 */
export const getSampleTypes = async (_req, res) => {
  try {
    const types = await SampleType.findAll({ attributes: ['id', 'name'] });
    res.json(types);
  } catch (err) {
    console.error('Failed to fetch sample types:', err);
    res.status(500).json({ error: 'Failed to fetch sample types' });
  }
};
