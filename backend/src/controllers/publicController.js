import { config } from '../config.js';

export function createPublicController(s) {
  return {
    health: (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }),
    languages: (_req, res) => res.json({ default: config.defaultLanguage, languages: config.languages }),
    syncVersion: (_req, res) => res.json(s.sync.version()),
    sync: (_req, res) => res.json(s.sync.snapshot()),
    resolveQr: (req, res) => res.json(s.qr.resolve(req.params.payload)),
    usage: (req, res) => res.status(201).json(s.logs.recordUsage(req.body)),
    locations: (req, res) => res.status(201).json(s.logs.recordLocations(req.body)),
  };
}
