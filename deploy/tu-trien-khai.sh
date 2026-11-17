#!/usr/bin/env bash
# Tự triển khai (CD) trên VPS: chạy mỗi phút bằng systemd timer thuyetminh-cd.timer.
#   - Hỏi GitHub commit mới nhất của main (git ls-remote, không tốn hạn mức API).
#   - Commit mới mà workflow CI của commit đó đã xanh: tải mã đúng commit, build image, thay container.
#   - Container mới không qua /api/health trong 60 giây: tự quay về image trước đó.
# Chạy tay: bash /opt/thuyetminh/cd/tu-trien-khai.sh [--ep]   (--ep: triển khai lại kể cả khi không có commit mới)
# Không đụng dữ liệu: DB và file tải lên nằm ở $WEBROOT/data, gắn vào container dưới dạng volume.
set -euo pipefail

REPO=AiraLeFatale/CongNghePhanMem_Project
BRANCH=main
NAME=thuyetminh
PORT=4410
REMOTE=/opt/thuyetminh
WEBROOT=/var/www/thuyetminh
STATE=$REMOTE/cd
LOG=$STATE/lich-su.log
FORCE=0; [[ "${1:-}" == "--ep" ]] && FORCE=1

mkdir -p "$STATE"
exec 9>"$STATE/.khoa"
flock -n 9 || exit 0   # đang có lượt triển khai khác

ghi() { echo "$(date '+%F %T') $*" | tee -a "$LOG"; }

SHA=$(git ls-remote "https://github.com/$REPO.git" "refs/heads/$BRANCH" | cut -f1)
[[ -n "$SHA" ]] || { echo "Không đọc được commit của $BRANCH"; exit 1; }
DANG_CHAY=$(cat "$STATE/dang-chay" 2>/dev/null || true)
BO_QUA=$(cat "$STATE/bo-qua" 2>/dev/null || true)
if [[ "$FORCE" == 0 ]]; then
  [[ "$SHA" == "$DANG_CHAY" || "$SHA" == "$BO_QUA" ]] && exit 0
fi

# Trạng thái workflow CI của đúng commit này (lần chạy do push vào main)
CI=$(curl -sf --max-time 20 -H 'Accept: application/vnd.github+json' \
  "https://api.github.com/repos/$REPO/actions/runs?head_sha=$SHA&event=push&per_page=20" | python3 -c '
import sys, json
runs = [r for r in json.load(sys.stdin).get("workflow_runs", []) if r["name"] == "CI"]
if not runs: print("chua-co")
else:
    r = max(runs, key=lambda r: r["run_attempt"])
    print(r["conclusion"] if r["status"] == "completed" else "dang-chay")
' || echo "loi-api")

case "$CI" in
  success) ;;
  chua-co|dang-chay|loi-api) [[ "$FORCE" == 1 ]] || exit 0 ;;  # chờ lượt sau
  *) ghi "BỎ QUA ${SHA:0:7}: CI kết thúc với trạng thái $CI, giữ nguyên bản ${DANG_CHAY:0:7}"
     echo "$SHA" > "$STATE/bo-qua"; exit 0 ;;
esac

ghi "BẮT ĐẦU triển khai ${SHA:0:7} (đang chạy ${DANG_CHAY:0:7})"
SRC=$REMOTE/src-$SHA
rm -rf "$SRC" && mkdir -p "$SRC"
curl -sfL --max-time 120 "https://codeload.github.com/$REPO/tar.gz/$SHA" | tar -xz -C "$SRC" --strip-components=1
if ! docker build -q --build-arg APP_VERSION="$SHA" -t "$NAME:$SHA" "$SRC" > "$STATE/build.log" 2>&1; then
  ghi "LỖI build ${SHA:0:7}, giữ nguyên bản cũ. Xem $STATE/build.log"
  echo "$SHA" > "$STATE/bo-qua"; rm -rf "$SRC"; exit 1
fi

chay() {  # chạy container từ image $1
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  docker run -d --name "$NAME" --restart unless-stopped \
    -p 127.0.0.1:$PORT:4000 --env-file "$WEBROOT/.env" -v "$WEBROOT/data:/data" \
    --memory 384m "$1" >/dev/null
}
khoe() {  # chờ /api/health báo đúng phiên bản $1
  for _ in $(seq 1 60); do
    curl -sf --max-time 3 "http://127.0.0.1:$PORT/api/health" | grep -q "\"version\":\"$1\"" && return 0
    sleep 1
  done
  return 1
}

# Giữ image đang chạy làm bản dự phòng để quay lại
TRUOC=$(docker inspect -f '{{.Image}}' "$NAME" 2>/dev/null || true)
[[ -n "$TRUOC" ]] && docker tag "$TRUOC" "$NAME:truoc"

chay "$NAME:$SHA"
if khoe "$SHA"; then
  docker tag "$NAME:$SHA" "$NAME:latest"
  echo "$SHA" > "$STATE/dang-chay"; rm -f "$STATE/bo-qua"
  ghi "XONG ${SHA:0:7} đang chạy"
else
  docker logs --tail 60 "$NAME" > "$STATE/container-loi.log" 2>&1 || true
  ghi "LỖI ${SHA:0:7} không qua /api/health, quay về bản trước. Log: $STATE/container-loi.log"
  echo "$SHA" > "$STATE/bo-qua"
  [[ -n "$TRUOC" ]] && chay "$NAME:truoc"
fi

# Dọn: chỉ giữ thư mục mã của bản đang chạy, xoá image cũ không còn tag nào dùng
for d in "$REMOTE"/src-*; do [[ "$d" == "$REMOTE/src-$(cat "$STATE/dang-chay" 2>/dev/null)" ]] || rm -rf "$d"; done
for t in $(docker images "$NAME" --format '{{.Tag}}'); do
  case "$t" in latest|truoc|"$(cat "$STATE/dang-chay" 2>/dev/null)") ;; *) docker rmi "$NAME:$t" >/dev/null 2>&1 || true ;; esac
done
docker image prune -f >/dev/null 2>&1 || true
