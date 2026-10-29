"""Run: python3 -m unittest discover -s scripts -p test_parking.py"""
import functools
import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import urlopen

spec = importlib.util.spec_from_file_location('parking', Path(__file__).resolve().parents[1] / 'server/parking.py')
p = importlib.util.module_from_spec(spec)
spec.loader.exec_module(p)


class ParkingTests(unittest.TestCase):
    def setUp(self):
        p.CACHE.clear()

    def test_key_registration_preserves_other_settings(self):
        script = (Path(__file__).resolve().parent / 'setup-parking-api.command').read_text()
        code = script.split("python3 - <<'PY'\n", 1)[1].split("\nPY\n", 1)[0]
        with tempfile.TemporaryDirectory() as directory:
            old_cwd = Path.cwd()
            old_umask = os.umask(0o077)
            try:
                os.chdir(directory)
                Path('.env').write_text('TOUR_API_KEY=existing\nPARKING_API_KEY=old\n')
                output = io.StringIO()
                with patch('getpass.getpass', return_value='fake-test-key'), patch('sys.stdout', output):
                    exec(compile(code, 'setup-parking-api.command', 'exec'), {})
                self.assertNotIn('fake-test-key', output.getvalue())
                self.assertIn('TOUR_API_KEY=existing', Path('.env').read_text())
                self.assertEqual(Path('.env').read_text().count('PARKING_API_KEY='), 1)
                self.assertEqual(Path('.env').stat().st_mode & 0o777, 0o600)
            finally:
                os.chdir(old_cwd)
                os.umask(old_umask)

    def test_api_pagination_and_cache(self):
        responses = [io.BytesIO(json.dumps({'resultCode': '0', 'totalCount': 2,
                       'PrkSttusInfo': [{'prk_plce_nm': name}]}).encode()) for name in ['A', 'B']]
        with patch.object(p, 'urlopen', side_effect=responses) as request:
            self.assertEqual(len(p.load_parking('test-secret', '26290')), 2)
            self.assertEqual(len(p.load_parking('test-secret', '26290')), 2)
            self.assertEqual(request.call_count, 2)
            self.assertIn('pageNo=2', request.call_args.args[0])
            self.assertIn('sigunguCd=26290', request.call_args.args[0])

    def test_sort_radius_and_capacity(self):
        lat, lon = p.PLACES['oryukdo']
        rows = [dict(prk_plce_nm=name, prk_plce_entrc_la=str(lat+offset),
                     prk_plce_entrc_lo=str(lon), prk_cmprt_co='30', parkng_chrge_se='1')
                for name, offset in [('far', .01), ('close', .001), ('outside', 1)]]
        with patch.object(p, 'read_key', return_value='test-secret'), patch.object(p, 'load_parking', return_value=rows):
            result = p.nearby('oryukdo')
        self.assertEqual([r['name'] for r in result], ['close', 'far'])
        self.assertEqual(result[0]['capacity'], 30)
        self.assertEqual(result[0]['fee'], '무료')

    def test_upstream_errors_never_include_key(self):
        with patch.object(p, 'urlopen', side_effect=RuntimeError('https://api/?serviceKey=test-secret')):
            with self.assertRaises(p.ParkingError) as caught:
                p.load_parking('test-secret', '26290')
        self.assertNotIn('test-secret', str(caught.exception))

    def test_http_secrets_blocked(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve()
            (root / '.env').write_text('PARKING_API_KEY=test-secret\n')
            (root / 'report.html').write_text('public report')
            (root / 'css').mkdir()
            (root / 'css' / 'leak.css').symlink_to(root / '.env')
            with patch.object(p, 'ROOT', root), patch.object(p, 'nearby', return_value=[]):
                server = p.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(p.Handler, directory=directory))
                worker = threading.Thread(target=server.serve_forever, daemon=True)
                worker.start()
                base = f'http://127.0.0.1:{server.server_port}'
                try:
                    for path in ['/.env', '/%2eenv', '/.env.local', '/.git/config', '/server/parking.py', '/css/leak.css', '/css/../.env']:
                        with self.assertRaises(HTTPError) as caught:
                            urlopen(base + path)
                        self.assertEqual(caught.exception.code, 404)
                        self.assertNotIn(b'test-secret', caught.exception.read())
                    with urlopen(base + '/report.html') as response:
                        self.assertEqual(response.read(), b'public report')
                    with urlopen(base + '/api/parking?resource=oryukdo') as response:
                        self.assertEqual(json.load(response), {'parking': []})
                    with self.assertRaises(HTTPError) as caught:
                        urlopen(base + '/api/parking?resource=invalid')
                    self.assertEqual(caught.exception.code, 400)
                finally:
                    server.shutdown()
                    server.server_close()
                    worker.join()


if __name__ == '__main__':
    unittest.main()
