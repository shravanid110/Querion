import click
import os
import sys
import time
import json
import threading
import requests
import queue
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from colorama import init, Fore, Style

init(autoreset=True)

WATCHED_EXTENSIONS = {'.py', '.js', '.env', '.json', '.log', '.txt'}
SKIP_DIRS = {'.git', '__pycache__', 'node_modules', 'venv', '.venv', 'dist', '.next'}

class SyncHandler(FileSystemEventHandler):
    def __init__(self, project_name, sync_queue):
        self.project_name = project_name
        self.sync_queue = sync_queue

    def _should_watch(self, path):
        # Skip unwanted directories
        parts = path.replace('\\', '/').split('/')
        for p in parts:
            if p in SKIP_DIRS:
                return False
        ext = os.path.splitext(path)[1]
        return ext in WATCHED_EXTENSIONS

    def on_modified(self, event):
        if not event.is_directory and self._should_watch(event.src_path):
            self._enqueue_file(event.src_path)

    def on_created(self, event):
        if not event.is_directory and self._should_watch(event.src_path):
            self._enqueue_file(event.src_path)

    def _enqueue_file(self, path):
        try:
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            rel_path = os.path.relpath(path)
            self.sync_queue.put({
                'type': 'file',
                'path': rel_path,
                'content': content
            })
            print(Fore.BLUE + f"  [File Changed] {rel_path}")
        except Exception as e:
            print(Fore.RED + f"  Error reading {path}: {str(e)}")


def terminal_capture(sync_queue):
    """Captures stdin (piped output) and queues it as log lines."""
    try:
        for line in sys.stdin:
            if not line:
                continue
            stripped = line.strip()
            if stripped:
                sync_queue.put({'type': 'log', 'line': stripped})
            # Echo back to console
            sys.stdout.write(line)
            sys.stdout.flush()
    except Exception:
        pass


def sync_worker(server_url, user_id, project_name, sync_queue):
    """Batches and sends updates to the server every 800ms."""
    def empty_batch():
        return {'user_id': user_id, 'project_name': project_name, 'files': [], 'logs': []}

    current_batch = empty_batch()
    last_sync = time.time()

    while True:
        # Drain queue
        try:
            while True:
                item = sync_queue.get_nowait()
                if item['type'] == 'file':
                    # Deduplicate: update existing entry if same path
                    for existing in current_batch['files']:
                        if existing['file_path'] == item['path']:
                            existing['content'] = item['content']
                            break
                    else:
                        current_batch['files'].append({
                            'file_path': item['path'],
                            'content': item['content']
                        })
                elif item['type'] == 'log':
                    current_batch['logs'].append({'line': item['line']})
        except queue.Empty:
            pass

        now = time.time()
        has_data = current_batch['files'] or current_batch['logs']

        if has_data and (now - last_sync >= 0.8):
            # Enforce 50KB limit
            payload_str = json.dumps(current_batch)
            if len(payload_str) > 50_000:
                print(Fore.YELLOW + "  [Sync] Batch too large, trimming logs...")
                current_batch['logs'] = current_batch['logs'][-20:]
                payload_str = json.dumps(current_batch)

            try:
                resp = requests.post(
                    f"{server_url}/api/monitor/sync",
                    json=json.loads(payload_str),
                    timeout=5
                )
                if resp.status_code == 200:
                    n_files = len(current_batch['files'])
                    n_logs = len(current_batch['logs'])
                    parts = []
                    if n_files:
                        parts.append(f"{n_files} file{'s' if n_files > 1 else ''}")
                    if n_logs:
                        parts.append(f"{n_logs} log line{'s' if n_logs > 1 else ''}")
                    print(Fore.GREEN + f"  [Synced] {', '.join(parts)}")
                else:
                    print(Fore.RED + f"  [Sync Error] HTTP {resp.status_code}")
            except requests.exceptions.ConnectionError:
                print(Fore.RED + f"  [Sync Error] Cannot reach {server_url} — is the backend running?")
            except Exception as e:
                print(Fore.RED + f"  [Sync Error] {str(e)}")

            current_batch = empty_batch()
            last_sync = now

        time.sleep(0.1)


@click.group()
def main():
    """Querion CLI — Real-time backend monitoring companion."""
    pass


@main.command()
@click.option('--project', required=True, help='Name of the project to watch')
@click.option('--user', default='default_user', show_default=True, help='User ID')
@click.option('--url', default='http://localhost:4000', show_default=True, help='Querion backend URL')
@click.option('--dir', 'watch_dir', default='.', show_default=True, help='Directory to watch (default: current dir)')
def watch(project, user, url, watch_dir):
    """Watch a project directory and stream updates to Querion."""
    watch_dir = os.path.abspath(watch_dir)

    print(Style.BRIGHT + Fore.CYAN + "\n  ╔═══════════════════════════════════╗")
    print(Style.BRIGHT + Fore.CYAN +  "  ║  Querion Backend Monitor  v1.0    ║")
    print(Style.BRIGHT + Fore.CYAN +  "  ╚═══════════════════════════════════╝\n")
    print(Fore.GREEN  + f"  Project : {Style.BRIGHT}{project}")
    print(Fore.GREEN  + f"  Dir     : {Style.BRIGHT}{watch_dir}")
    print(Fore.GREEN  + f"  Server  : {Style.BRIGHT}{url}")
    print(Fore.YELLOW + "\n  Watching for .py .js .env .json .log .txt changes...")
    print(Fore.YELLOW + "  Pipe your app output in: python app.py 2>&1 | querion watch --project \"Name\"")
    print(Fore.YELLOW + "  Press Ctrl+C to stop.\n")

    sync_queue = queue.Queue()

    # Thread: send batches to server
    t_sync = threading.Thread(target=sync_worker, args=(url, user, project, sync_queue), daemon=True)
    t_sync.start()

    # Thread: capture stdin (piped terminal output)
    if not sys.stdin.isatty():
        t_stdin = threading.Thread(target=terminal_capture, args=(sync_queue,), daemon=True)
        t_stdin.start()

    # File watcher
    event_handler = SyncHandler(project, sync_queue)
    observer = Observer()
    observer.schedule(event_handler, watch_dir, recursive=True)
    observer.start()

    try:
        while observer.is_alive():
            time.sleep(1)
    except KeyboardInterrupt:
        print(Fore.YELLOW + "\n  Stopping watcher...")
        observer.stop()
    observer.join()
    print(Fore.CYAN + "  Done. Goodbye!\n")


if __name__ == "__main__":
    main()
