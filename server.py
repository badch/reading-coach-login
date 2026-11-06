#!/usr/bin/env python3
"""
智慧朗讀教練 - 本地伺服器啟動腳本
提供安全上下文 (Secure Context: http://localhost:8080)，確保瀏覽器麥克風與 Web Worker 順暢運作。
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def run():
    os.chdir(DIRECTORY)
    # 允許重用端口
    socketserver.TCPServer.allow_reuse_address = True
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        url = f"http://localhost:{PORT}"
        print("=" * 60)
        print("🎉 智慧朗讀教練 (Reading Coach) 本地伺服器已啟動！")
        print(f"🌐 訪問網址: {url}")
        print("💡 提示：按 Ctrl + C 可停止伺服器")
        print("=" * 60)
        
        # 自動打開預設瀏覽器
        try:
            webbrowser.open(url)
        except Exception:
            pass

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n👋 伺服器已正常停止。")

if __name__ == '__main__':
    run()
