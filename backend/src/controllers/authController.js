/**
 * Tầng controller: chuyển request HTTP thành lời gọi service cho phần xác thực CMS.
 * Không chứa nghiệp vụ, chỉ đọc dữ liệu từ req và trả JSON/204.
 */

// Tạo nhóm handler đăng nhập, lấy thông tin admin hiện tại và đổi mật khẩu.
// Lỗi (sai mật khẩu, mật khẩu cũ không đúng...) do authService ném ra sẽ tới errorHandler.
export function createAuthController(s) {
  return {
    login: async (req, res) => res.json(await s.auth.login(req.body?.username, req.body?.password)),
    me: (req, res) => res.json({ user: req.admin }),
    // Đổi mật khẩu: cần mật khẩu hiện tại để xác minh; thành công trả 204 không body.
    changePassword: async (req, res) => {
      await s.auth.changePassword(req.admin.id, req.body?.current_password, req.body?.new_password);
      res.status(204).end();
    },
  };
}
