export function createAuthController(s) {
  return {
    login: async (req, res) => res.json(await s.auth.login(req.body?.username, req.body?.password)),
    me: (req, res) => res.json({ user: req.admin }),
    changePassword: async (req, res) => {
      await s.auth.changePassword(req.admin.id, req.body?.current_password, req.body?.new_password);
      res.status(204).end();
    },
  };
}
