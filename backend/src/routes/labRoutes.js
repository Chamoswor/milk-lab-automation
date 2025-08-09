import { Router } from 'express';
import { isValidRole } from '../middlewares/authMiddleware.js';
import * as rack   from '../controllers/rackController.js';
import * as sample from '../controllers/sampleController.js';
import * as labController from '../controllers/labController.js';

const labRoutes = Router();

labRoutes.use(isValidRole('lab'));

labRoutes.get ('/racks',                        rack.getRacks);
labRoutes.put ('/racks/:id',                    rack.updateRack);
labRoutes.post('/racks/:rackId/slot/:position', rack.placeSample);
labRoutes.get ('/rack-types',                   rack.getSampleTypes);

/* Sample CRUD */
labRoutes.get   ('/samples',        sample.getSamples);
labRoutes.post  ('/samples',        sample.createSample);
labRoutes.get   ('/samples/:id',    sample.getSampleById);
labRoutes.put   ('/samples/:id',    sample.updateSample);
labRoutes.delete('/samples/:id',    sample.deleteSample);

/* Select/deselect */
labRoutes.post('/samples/:id/select',   sample.selectSample);
labRoutes.post('/samples/:id/deselect', sample.deselectSample);

/* Teller/sorteringsendepunkt – uendret */
labRoutes.get('/samples/selected',               sample.getSelectedSamples);
labRoutes.get('/samples/unselected',             sample.getUnselectedSamples);
labRoutes.get('/samples/count',                  sample.getSampleCount);
labRoutes.get('/samples/count/date/:date',       sample.getSampleCountByDate);
labRoutes.get('/samples/count/selected',         sample.getSelectedSampleCount);
labRoutes.get('/samples/count/unselected',       sample.getUnselectedSampleCount);
labRoutes.get('/samples/count/id/:id',           sample.getSampleCountById);

labRoutes.post('/sorting/start', labController.startSorting);
labRoutes.post('/sorting/stop',  labController.stopSorting);
labRoutes.get('/sorting/reset', labController.resetDemo);

export default labRoutes;