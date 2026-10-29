"""Local server. Secrets and implementation files are never static assets."""
import argparse
import functools
import json
import math
import os
from pathlib import Path
import shlex
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote, urlencode, urlsplit
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parent.parent
ENDPOINT = 'https://apis.data.go.kr/B553881/Parking_v1/PrkSttusInfo_v1'
# Tourist attraction reference points (not parking entrances).
PLACES = {'oryukdo': (35.1008, 129.1243), 'beomeosa': (35.2838, 129.0683),
          'taejongdae': (35.0613, 129.0806)}
DISTRICTS = {'oryukdo': '26290', 'beomeosa': '26410', 'taejongdae': '26200'}
CACHE = {}
LOCK = threading.Lock()


class ParkingError(Exception):
    pass


def read_key():
    key = os.environ.get('PARKING_API_KEY', '').strip()
    if key or os.environ.get('VERCEL'):
        return unquote(key)
    path = ROOT / '.env'
    if path.is_file() and not path.is_symlink():
        for line in path.read_text(encoding='utf-8').splitlines():
            if line.strip().startswith('PARKING_API_KEY='):
                try:
                    values = shlex.split(line.split('=', 1)[1], comments=True)
                    key = values[0] if len(values) == 1 else ''
                except ValueError:
                    key = ''
    return unquote(key.strip())


def distance(a, b):
    lat1, lon1, lat2, lon2 = map(math.radians, (*a, *b))
    h = math.sin((lat2-lat1)/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin((lon2-lon1)/2)**2
    return 6371000 * 2 * math.asin(min(1, math.sqrt(h)))


def load_parking(key, district):
    with LOCK:
        now = time.monotonic()
        cached = CACHE.get(district, {})
        if cached.get('key') == key and now < cached.get('until', 0):
            return cached['rows']
        rows = []
        for page in range(1, 31):
            query = urlencode({'serviceKey': key, 'pageNo': page, 'numOfRows': 1000,
                               'format': 2, 'sidoCd': '26', 'sigunguCd': district})
            try:
                with urlopen(ENDPOINT + '?' + query, timeout=12) as response:
                    raw = response.read(8_000_001)
                if len(raw) > 8_000_000:
                    raise ValueError()
                data = json.loads(raw)
                if str(data.get('resultCode')) not in ('0', '00'):
                    raise ValueError()
                batch = data.get('PrkSttusInfo', [])
                if not isinstance(batch, list):
                    raise ValueError()
                rows.extend(batch)
                if len(rows) >= int(data['totalCount']):
                    break
                if not batch:
                    raise ValueError()
            except Exception:
                # Do not expose exceptions: urllib errors can contain the key in the URL.
                raise ParkingError('주차장 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.') from None
        else:
            raise ParkingError('주차장 조회 범위를 초과했습니다. 잠시 후 다시 시도해 주세요.')
        CACHE[district] = dict(key=key, rows=rows, until=now + 3600)
        return rows


def nearby(resource):
    key = read_key()
    if not key:
        raise ParkingError('주차장 정보 연결을 준비 중입니다.')
    found = []
    for row in load_parking(key, DISTRICTS[resource]):
        try:
            point = (float(row['prk_plce_entrc_la']), float(row['prk_plce_entrc_lo']))
            if not (33 <= point[0] <= 39 and 124 <= point[1] <= 132):
                continue
            meters = distance(PLACES[resource], point)
            if meters > 3000:
                continue
            capacity = str(row.get('prk_cmprt_co', ''))
            found.append({'name': str(row.get('prk_plce_nm') or '주차장'),
                          'address': str(row.get('prk_plce_adres') or '주소 정보 없음'),
                          'distance': round(meters),
                          'capacity': int(capacity) if capacity.isdigit() else None,
                          'fee': {'1': '무료', '2': '유료'}.get(str(row.get('parkng_chrge_se')), '요금 확인 필요'),
                          'lat': point[0], 'lon': point[1]})
        except (KeyError, ValueError, TypeError):
            continue
    return sorted(found, key=lambda item: item['distance'])[:10]


def parking_response(resource):
    """Shared HTTP contract for the local server and Vercel Function."""
    if resource not in PLACES:
        return 400, {'message': '관광지를 확인해 주세요.'}
    try:
        return 200, {'parking': nearby(resource)}
    except ParkingError as error:
        return 503, {'message': str(error)}
    except Exception:
        return 503, {'message': '주차장 정보를 불러오지 못했습니다.'}


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass  # Request paths may contain arbitrary sensitive data.

    def json_response(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        url = urlsplit(self.path)
        if url.path == '/api/parking':
            resource = parse_qs(url.query).get('resource', [''])[0]
            status, data = parking_response(resource)
            return self.json_response(status, data)
        if not self.public_path(url.path):
            return self.send_error(404)
        super().do_GET()

    def do_HEAD(self):
        if not self.public_path(urlsplit(self.path).path):
            return self.send_error(404)
        super().do_HEAD()

    def public_path(self, path):
        path = unquote(path)
        parts = Path(path).parts
        if any(part.startswith('.') or part == '..' for part in parts):
            return False
        target = (ROOT / path.lstrip('/')).resolve()
        try:
            relative = target.relative_to(ROOT)
        except ValueError:
            return False
        # Permit only public folders and root HTML pages. Never serve .env, scripts, or server code.
        if path == '/':
            return True
        if any(part.startswith('.') for part in relative.parts):
            return False
        return target.is_file() and ((len(relative.parts) == 1 and target.suffix == '.html') or
                                     relative.parts[0] in {'assets', 'css', 'js', 'data', 'components'})

    def list_directory(self, path):
        self.send_error(404)
        return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8000)
    args = parser.parse_args()
    handler = functools.partial(Handler, directory=str(ROOT))
    server = ThreadingHTTPServer(('127.0.0.1', args.port), handler)
    print(f'OVE 로컬 서버: http://127.0.0.1:{args.port}/report.html', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
