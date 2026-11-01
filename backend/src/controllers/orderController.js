/**
 * Tầng controller cho trang Thanh toán trong CMS.
 * Admin lọc đơn theo trạng thái, xác nhận đã nhận tiền hoặc huỷ đơn.
 */
import { idParam } from '../utils/validate.js';

// Nhận service đơn hàng, trả handler cho router admin: danh sách, xác nhận, huỷ.
export function createOrderController(s) {
  return {
    list: (req, res) => res.json(s.orders.list(req.query.status)),
    confirm: (req, res) => res.json(s.orders.confirm(idParam(req.params.id), req.admin)),
    cancel: (req, res) => res.json(s.orders.cancel(idParam(req.params.id))),
  };
}
