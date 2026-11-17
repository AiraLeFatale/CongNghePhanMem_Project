import { idParam } from '../utils/validate.js';
import { parseTokens } from '../services/paymentService.js';

export function createPaymentController(s) {
  return {
    create: (req, res) => res.status(201).json(s.payments.create(req.body)),
    status: (req, res) => res.json(s.payments.status(req.params.code, String(req.get('x-order-token') ?? ''))),
    claim: (req, res) => res.json(s.payments.claim(req.params.code, String(req.get('x-order-token') ?? ''))),
    fullPoi: (req, res) => res.json(s.payments.fullPoi(idParam(req.params.id), parseTokens(req.get('x-access-token')))),
    webhook: (req, res) => res.json(s.payments.webhook(req.headers, req.body)),
    list: (req, res) => res.json(s.payments.list(req.query.status || null)),
    transactions: (req, res) => res.json({ items: s.payments.transactions() }),
    confirm: (req, res) => res.json(s.payments.setStatus(idParam(req.params.id), 'paid', req.admin.id)),
    cancel: (req, res) => res.json(s.payments.setStatus(idParam(req.params.id), 'cancelled', req.admin.id)),
  };
}
