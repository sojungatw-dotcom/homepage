"""Vercel Function: GET /api/parking?resource=oryukdo."""
from http.server import BaseHTTPRequestHandler
import json
from urllib.parse import parse_qs, urlsplit

from server.parking import parking_response


class handler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def do_GET(self):
        resource = parse_qs(urlsplit(self.path).query).get('resource', [''])[0]
        status, data = parking_response(resource)
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        self.wfile.write(body)
