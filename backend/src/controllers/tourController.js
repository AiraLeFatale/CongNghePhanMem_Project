import { idParam } from '../utils/validate.js';

export function createTourController(s) {
  return {
    list: (_req, res) => res.json({ items: s.tours.list() }),
    get: (req, res) => res.json(s.tours.get(idParam(req.params.id))),
    create: (req, res) => res.status(201).json(s.tours.create(req.body, req.admin.id)),
    update: (req, res) => res.json(s.tours.update(idParam(req.params.id), req.body)),
    remove: (req, res) => { s.tours.delete(idParam(req.params.id)); res.status(204).end(); },
  };
}
