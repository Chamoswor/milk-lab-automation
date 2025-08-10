import Sample     from '../models/sampleModel.js';
import SampleType from '../models/sampleTypeModel.js';
import RackSlot   from '../models/rackSlotModel.js';
import Rack       from '../models/rackModel.js';


// POST /api/lab/samples
export const createSample = async (req, res) => {
  try {
    const {
      supplier,
      matrix,
      sample_taken_time,
      sample_type,  // FK til SampleType
    } = req.body;

    const newSample = await Sample.create({
      supplier,
      matrix,
      sample_taken_time,
      sample_type,
    });
    res.status(201).json(newSample);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create sample' });
  }
};

// GET /api/lab/samples  (+ ?limit=)
export const getSamples = async (req, res) => {
  const limit = parseInt(req.query.limit) || null;

  try {
    const samples = await Sample.findAll({
      limit:  limit || undefined,
      include: [
        { model: SampleType, as: 'type' },
        {
          model: RackSlot,
          as: 'slot',
          include: [{ model: Rack, as: 'Rack', attributes: ['rfid'] }],
        },
      ],
      order: [['created_at', 'ASC']],
    });
    res.json(samples);
  } catch (err) {
    console.error('Failed to fetch samples:', err);
    res.status(500).json({ error: 'Failed to fetch samples' });
  }
};

// GET /api/lab/samples/:id
export const getSampleById = async (req, res) => {
  const sample = await Sample.findByPk(req.params.id, {
    include: [{ model: SampleType, as: 'type' }],
  });
  if (!sample) return res.status(404).json({ error: 'Sample not found' });
  res.json(sample);
};


// PUT /api/lab/samples/:id
export const updateSample = async (req, res) => {
  try {
    await Sample.update(req.body, { where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update sample' });
  }
};

// DELETE /api/lab/samples/:id
export const deleteSample = async (req, res) => {
  try {
    await Sample.destroy({ where: { id: req.params.id } });
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete sample' });
  }
};

// Function to select a sample by ID
export const selectSample = async (req, res) => {
  try {
    const { id } = req.params;
    const sample = await Sample.findByPk(id);
    if (!sample) {
      return res.status(404).json({ error: "Sample not found" });
    }
    sample.selected = true;
    await sample.save();
    res.status(200).json(sample);
  } catch (error) {
    res.status(500).json({ error: "Failed to select sample" });
  }
};

// Function to deselect a sample by ID
export const deselectSample = async (req, res) => {
  try {
    const { id } = req.params;
    const sample = await Sample.findByPk(id);
    if (!sample) {
      return res.status(404).json({ error: "Sample not found" });
    }
    sample.selected = false;
    await sample.save();
    res.status(200).json(sample);
  } catch (error) {
    res.status(500).json({ error: "Failed to deselect sample" });
  }
};


// Function to get all selected samples
export const getSelectedSamples = async (req, res) => {
  try {
    const samples = await Sample.findAll({ where: { selected: true } });
    res.status(200).json(samples);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch selected samples" });
  }
};

// Function to get all unselected samples
export const getUnselectedSamples = async (req, res) => {
  try {
    const samples = await Sample.findAll({ where: { selected: false } });
    res.status(200).json(samples);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch unselected samples" });
  }
};

// Function to get the count of selected samples
export const getSelectedSampleCount = async (req, res) => {
  try {
    const count = await Sample.count({ where: { selected: true } });
    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch selected sample count" });
  }
};

// Function to get the count of unselected samples
export const getUnselectedSampleCount = async (req, res) => {
  try {
    const count = await Sample.count({ where: { selected: false } });
    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch unselected sample count" });
  }
};

// Function to get the count of all samples
export const getSampleCount = async (req, res) => {
  try {
    const count = await Sample.count();
    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch sample count" });
  }
};

// Function to get the count of samples by date
export const getSampleCountByDate = async (req, res) => {
  try {
    const { date } = req.params;
    const count = await Sample.count({ where: { date } });
    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch sample count by date" });
  }
};

// Function to get the count of samples by selected status
export const getSampleCountBySelected = async (req, res) => {
  try {
    const { selected } = req.params;
    const count = await Sample.count({ where: { selected } });
    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch sample count by selected status" });
  }
};

// Function to get the count of samples by ID
export const getSampleCountById = async (req, res) => {
  try {
    const { id } = req.params;
    const count = await Sample.count({ where: { id } });
    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch sample count by ID" });
  }
};

