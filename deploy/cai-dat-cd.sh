#!/usr/bin/env bash
# Cài CD lên VPS (chạy 1 lần, quyền root, từ thư mục gốc repo):
#   scp -r deploy vps:/tmp/ && ssh vps 'bash /tmp/deploy/cai-dat-cd.sh'
set -euo pipefail
D="$(cd "$(dirname "$0")" && pwd)"
install -d /opt/thuyetminh/cd
install -m 755 "$D/tu-trien-khai.sh" /opt/thuyetminh/cd/tu-trien-khai.sh
install -m 644 "$D/thuyetminh-cd.service" "$D/thuyetminh-cd.timer" /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now thuyetminh-cd.timer
systemctl list-timers thuyetminh-cd.timer --no-pager
