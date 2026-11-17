#!/usr/bin/env bash
# Sửa nhanh: đưa bản đã commit lên VPS NGAY, xong mới đẩy lên GitHub.
#   bash deploy/sua-nhanh.sh            (chạy từ máy làm việc, sau khi đã git commit)
#   bash deploy/sua-nhanh.sh --khong-test   bỏ qua chạy test trên máy
# Các bước:
#   1. Chạy test backend + CMS trên máy (nhanh, khoảng 10 giây).
#   2. Chép đúng commit HEAD lên VPS, build image, thay container, kiểm tra /api/health đúng phiên bản.
#      Lỗi thì tự quay về bản đang chạy trước đó và DỪNG, không đẩy lên GitHub.
#   3. Ghi commit này là "đang chạy" để CD (thuyetminh-cd.timer) không build lại lần nữa.
#   4. Đẩy lên GitHub nhánh main. Nếu main trên GitHub đã có commit mới của người khác thì
#      tự rebase rồi đẩy; khi đó CD sẽ tự triển khai bản đã gộp sau khi CI xanh.
set -euo pipefail

SSH="ssh -o ClearAllForwardings=yes vps2"
NAME=thuyetminh PORT=4410 REMOTE=/opt/thuyetminh WEBROOT=/var/www/thuyetminh
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

[[ -z "$(git status --porcelain -- backend cms web Dockerfile .dockerignore)" ]] \
  || { echo "Còn thay đổi chưa commit trong backend/cms/web. Commit trước rồi chạy lại."; git status -s; exit 1; }
SHA=$(git rev-parse HEAD)
echo "==> Bản sẽ đưa lên: $(git log --oneline -1)"

if [[ "${1:-}" != "--khong-test" ]]; then
  echo "==> Chạy test trên máy"
  (cd backend && npm test --silent >/tmp/sua-nhanh-backend.log 2>&1) || { echo "Test backend LỖI:"; tail -30 /tmp/sua-nhanh-backend.log; exit 1; }
  (cd cms && npm run -s typecheck >/tmp/sua-nhanh-cms.log 2>&1 && npm test --silent >>/tmp/sua-nhanh-cms.log 2>&1) \
    || { echo "Test CMS LỖI:"; tail -30 /tmp/sua-nhanh-cms.log; exit 1; }
  echo "    test đạt"
fi

echo "==> Đưa lên VPS"
git archive --format=tar.gz HEAD -- backend cms web Dockerfile .dockerignore \
  | $SSH "rm -rf $REMOTE/src-$SHA && mkdir -p $REMOTE/src-$SHA && tar -C $REMOTE/src-$SHA -xzf -"

$SSH SHA="$SHA" NAME="$NAME" PORT="$PORT" REMOTE="$REMOTE" WEBROOT="$WEBROOT" bash -s <<'VPS'
set -euo pipefail
STATE=$REMOTE/cd; LOG=$STATE/lich-su.log
mkdir -p "$STATE"
exec 9>"$STATE/.khoa"; flock -w 120 9 || { echo "CD đang triển khai, thử lại sau"; exit 1; }
ghi() { echo "$(date '+%F %T') $*" | tee -a "$LOG"; }
chay() {
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  docker run -d --name "$NAME" --restart unless-stopped -p 127.0.0.1:$PORT:4000 \
    --env-file "$WEBROOT/.env" -v "$WEBROOT/data:/data" --memory 384m "$1" >/dev/null
}
ghi "SỬA NHANH bắt đầu ${SHA:0:7}"
docker build -q --build-arg APP_VERSION="$SHA" -t "$NAME:$SHA" "$REMOTE/src-$SHA" > "$STATE/build.log" 2>&1 \
  || { ghi "SỬA NHANH lỗi build ${SHA:0:7}, giữ nguyên bản cũ"; tail -30 "$STATE/build.log"; exit 1; }
TRUOC=$(docker inspect -f '{{.Image}}' "$NAME" 2>/dev/null || true)
[[ -n "$TRUOC" ]] && docker tag "$TRUOC" "$NAME:truoc"
chay "$NAME:$SHA"
for _ in $(seq 1 60); do
  curl -sf --max-time 3 "http://127.0.0.1:$PORT/api/health" | grep -q "\"version\":\"$SHA\"" && break; sleep 1
done
if curl -sf --max-time 3 "http://127.0.0.1:$PORT/api/health" | grep -q "\"version\":\"$SHA\""; then
  docker tag "$NAME:$SHA" "$NAME:latest"
  echo "$SHA" > "$STATE/dang-chay"; rm -f "$STATE/bo-qua"
  ghi "SỬA NHANH XONG ${SHA:0:7} đang chạy"
else
  docker logs --tail 40 "$NAME" || true
  ghi "SỬA NHANH lỗi ${SHA:0:7} không qua /api/health, quay về bản trước"
  [[ -n "$TRUOC" ]] && chay "$NAME:truoc"
  exit 1
fi
VPS

echo "==> Web thật: $(curl -s --max-time 10 https://thuyetminh.hmarketing.vn/api/health)"

echo "==> Đẩy lên GitHub"
if ! git push -q origin HEAD:main 2>/dev/null; then
  echo "    main trên GitHub có commit mới, rebase rồi đẩy lại"
  git pull -q --rebase origin main && git push -q origin HEAD:main
  echo "    commit đã đổi mã sau rebase: CD sẽ tự triển khai bản gộp sau khi CI xanh"
fi
echo "==> Xong: https://github.com/AiraLeFatale/CongNghePhanMem_Project/commit/$(git rev-parse HEAD)"
