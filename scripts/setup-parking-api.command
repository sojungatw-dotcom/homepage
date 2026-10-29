#!/bin/zsh
set -eu
cd -- "${0:A:h}/.."
python3 - <<'PY'
import getpass
import os
import re
import shlex
import tempfile
import warnings
from pathlib import Path

warnings.simplefilter('error', getpass.GetPassWarning)
print('주차장 API 인증키 등록', flush=True)
print('공공데이터포털의 일반 인증키(Decoding)를 붙여넣고 Enter를 누르세요.', flush=True)
print('입력한 키는 화면에 표시되지 않습니다.', flush=True)
try:
    key = getpass.getpass('주차장 API 키: ').strip()
except (getpass.GetPassWarning, EOFError, KeyboardInterrupt):
    raise SystemExit('\n입력이 취소되었거나 숨김 입력을 사용할 수 없어 저장하지 않았습니다.')
if not key or any(c in key for c in '\r\n\x00'):
    raise SystemExit('유효한 키가 입력되지 않아 저장하지 않았습니다.')

path = Path('.env')
if path.is_symlink():
    raise SystemExit('.env가 심볼릭 링크여서 저장하지 않았습니다.')
lines = path.read_text(encoding='utf-8').splitlines() if path.exists() else []
lines = [line for line in lines if not re.match(r'^\s*(?:export\s+)?PARKING_API_KEY\s*=', line)]
lines.append('PARKING_API_KEY=' + shlex.quote(key))
os.umask(0o077)
fd, temp_path = tempfile.mkstemp(prefix='.env.', dir=path.parent)
try:
    with os.fdopen(fd, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')
    os.replace(temp_path, path)
finally:
    if os.path.exists(temp_path):
        os.unlink(temp_path)
print('저장 완료: 프로젝트 .env의 PARKING_API_KEY (파일 권한 600)')
print('다음으로 ./scripts/start-local.command 를 실행하면 주차장 조회를 이용할 수 있습니다.')
PY
read -r '?Enter를 누르면 종료합니다.'
