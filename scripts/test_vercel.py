"""Deployment safety and the Vercel HTTP handler contract."""
import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
import threading
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import urlopen
from http.server import ThreadingHTTPServer

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from api.parking import handler
from server import parking


class VercelTests(unittest.TestCase):
    def test_vercel_reads_only_runtime_environment(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve()
            (root / '.env').write_text('PARKING_API_KEY=local-only\n')
            with patch.object(parking, 'ROOT', root), patch.dict(os.environ, {'VERCEL': '1', 'PARKING_API_KEY': ''}):
                self.assertEqual(parking.read_key(), '')
            with patch.object(parking, 'ROOT', root), patch.dict(os.environ, {'VERCEL': '1', 'PARKING_API_KEY': 'runtime-key'}):
                self.assertEqual(parking.read_key(), 'runtime-key')

    def test_function_http_success_validation_and_errors(self):
        server = ThreadingHTTPServer(('127.0.0.1', 0), handler)
        worker = threading.Thread(target=server.serve_forever, daemon=True)
        worker.start()
        base = f'http://127.0.0.1:{server.server_port}/api/parking'
        try:
            with patch.object(parking, 'nearby', return_value=[{'name': '테스트 주차장'}]):
                with urlopen(base + '?resource=oryukdo') as response:
                    self.assertEqual(json.load(response)['parking'][0]['name'], '테스트 주차장')
                    self.assertEqual(response.headers['Cache-Control'], 'no-store')
            with self.assertRaises(HTTPError) as caught:
                urlopen(base + '?resource=invalid')
            self.assertEqual(caught.exception.code, 400)
            with patch.object(parking, 'nearby', side_effect=RuntimeError('private-test-key')):
                with self.assertRaises(HTTPError) as caught:
                    urlopen(base + '?resource=oryukdo')
                self.assertEqual(caught.exception.code, 503)
                self.assertNotIn(b'private-test-key', caught.exception.read())
        finally:
            server.shutdown()
            server.server_close()
            worker.join()

    def test_static_build_excludes_private_files(self):
        spec = importlib.util.spec_from_file_location('build_vercel', ROOT / 'scripts/build_vercel.py')
        builder = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(builder)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve()
            (root / '.env').write_text('private-test-key')
            (root / 'report.html').write_text('<html>public</html>')
            (root / 'assets').mkdir()
            (root / 'assets/.env').write_text('private-test-key')
            (root / 'assets/leak.json').symlink_to(root / '.env')
            (root / 'assets/photo.svg').write_text('<svg/>')
            output = root / 'public'
            with patch.object(builder, 'ROOT', root), patch.object(builder, 'OUTPUT', output):
                builder.build()
            self.assertEqual(sorted(str(p.relative_to(output)) for p in output.rglob('*') if p.is_file()),
                             ['assets/photo.svg', 'report.html'])


if __name__ == '__main__':
    unittest.main()
