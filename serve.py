#!/usr/bin/env python3
"""Static server for the GoingTo prototype that disables caching,
so edits are always visible on refresh instead of serving stale HTML/CSS/JS."""
import http.server
import sys

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8935
    http.server.test(HandlerClass=NoCacheHandler, port=port)
