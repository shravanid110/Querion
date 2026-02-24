import click
import os
import sys
import re
import time
import json
import threading
import subprocess
import requests
import queue
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from colorama import init, Fore, Style

init(autoreset=True)

# Strip ANSI terminal colour/control codes so logs appear as clean text
_ANSI_RE = re.compile(r'\x1b\[[0-9;]*[A-Za-z]|\x1b\][^\x07]*\x07|\x9b[0-9;]*[A-Za-z]|[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]')
def strip_ansi(text: str) -> str:
    return _ANSI_RE.sub('', text).strip()

WATCHED_EXTENSIONS = {'.py', '.js', '.ts', '.tsx', '.jsx', '.env', '.json', '.log', '.txt', '.css', '.html'}
SKIP_DIRS = {'.git', '__pycache__', 'node_modules', 'venv', '.venv', 'dist', '.next', 'build', '.cache'}

# ─── File Watcher ─────────────────────────────────────────────────────────────

class SyncHandler(FileSystemEventHandler):
    def __init__(self, sync_queue):
        self.sync_queue = sync_queue

    def _should_watch(self, path):
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
            self.sync_queue.put({'type': 'file', 'path': rel_path, 'content': content})
            print(Fore.BLUE + f"  [file] {rel_path}")
        except Exception as e:
            pass  # silently skip unreadable files


# ─── Subprocess runner (captures stdout+stderr as logs) ───────────────────────

def run_subprocess(cmd_str, sync_queue, stop_event):
    """Spawn the user's command and stream its output as log lines."""
    print(Fore.CYAN + f"\n  [run] Starting: {cmd_str}\n")
    try:
        proc = subprocess.Popen(
            cmd_str,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding='utf-8',
            errors='replace',
            bufsize=1,
        )

        for line in iter(proc.stdout.readline, ''):
            if stop_event.is_set():
                break
            clean = strip_ansi(line)
            if clean:
                # Echo to console (raw so colours still show locally)
                sys.stdout.write(line)
                sys.stdout.flush()
                # Send clean version to server
                sync_queue.put({'type': 'log', 'line': clean})

        proc.wait()
        if not stop_event.is_set():
            sync_queue.put({'type': 'log', 'line': f'[process exited with code {proc.returncode}]'})
    except Exception as e:
        sync_queue.put({'type': 'log', 'line': f'[run error: {e}]'})


# ─── Stdin capture (for piped usage: python app.py | querion watch ...) ───────

def stdin_capture(sync_queue, stop_event):
    """Capture piped stdin and queue as log lines."""
    try:
        for line in sys.stdin:
            if stop_event.is_set():
                break
            clean = strip_ansi(line)
            if clean:
                sync_queue.put({'type': 'log', 'line': clean})
                sys.stdout.write(line)
                sys.stdout.flush()
    except Exception:
        pass


# ─── Sync worker (batches and POSTs to the server) ────────────────────────────

def sync_worker(server_url, user_id, project_name, sync_queue, stop_event):
    def empty_batch():
        return {'user_id': user_id, 'project_name': project_name, 'files': [], 'logs': []}

    batch = empty_batch()
    last_sync = time.time()

    while not stop_event.is_set():
        # drain the queue
        try:
            while True:
                item = sync_queue.get_nowait()
                if item['type'] == 'file':
                    # deduplicate by path
                    for existing in batch['files']:
                        if existing['file_path'] == item['path']:
                            existing['content'] = item['content']
                            break
                    else:
                        batch['files'].append({'file_path': item['path'], 'content': item['content']})
                elif item['type'] == 'log':
                    batch['logs'].append({'line': item['line']})
        except queue.Empty:
            pass

        now = time.time()
        has_data = batch['files'] or batch['logs']

        if has_data and (now - last_sync >= 0.8):
            payload_str = json.dumps(batch)
            # Trim if over 100KB
            if len(payload_str) > 100_000:
                batch['logs'] = batch['logs'][-30:]
                payload_str = json.dumps(batch)

            try:
                resp = requests.post(
                    f"{server_url}/api/monitor/sync",
                    data=payload_str,
                    headers={'Content-Type': 'application/json'},
                    timeout=5
                )
                if resp.status_code == 200:
                    parts = []
                    if batch['files']:
                        parts.append(f"{len(batch['files'])} file(s)")
                    if batch['logs']:
                        parts.append(f"{len(batch['logs'])} log(s)")
                    print(Fore.GREEN + f"  [synced] {' + '.join(parts)}")
                else:
                    print(Fore.RED + f"  [sync error] HTTP {resp.status_code}: {resp.text[:100]}")
            except requests.exceptions.ConnectionError:
                print(Fore.RED + f"  [sync error] Cannot reach {server_url} — is the backend running?")
            except Exception as e:
                print(Fore.RED + f"  [sync error] {e}")

            batch = empty_batch()
            last_sync = now

        time.sleep(0.1)


# ─── CLI ──────────────────────────────────────────────────────────────────────

@click.group()
def main():
    """Querion CLI — Real-time backend monitoring companion."""
    pass


@main.command()
@click.option('--project', required=True, help='Project name shown in the monitoring dashboard')
@click.option('--user',    default='default_user', show_default=True, help='User ID')
@click.option('--url',     default='http://localhost:4000', show_default=True, help='Querion backend URL')
@click.option('--dir',     'watch_dir', default='.', show_default=True, help='Directory to watch (default: current directory)')
@click.option('--run',     'run_cmd', default=None, help='Command to run AND capture output as live logs (e.g. "npm run dev")')
def watch(project, user, url, watch_dir, run_cmd):
    """
    Watch a project directory and stream file changes + live logs to Querion.

    \b
    Usage examples:
      querion watch --project "MyProject"
      querion watch --project "MyProject" --run "npm run dev"
      querion watch --project "MyProject" --run "python app.py"
      python app.py 2>&1 | querion watch --project "MyProject"
    """
    watch_dir = os.path.abspath(watch_dir)

    print(Style.BRIGHT + Fore.CYAN + "\n  ╔══════════════════════════════════════╗")
    print(Style.BRIGHT + Fore.CYAN +  "  ║   Querion Backend Monitor  v1.1     ║")
    print(Style.BRIGHT + Fore.CYAN +  "  ╚══════════════════════════════════════╝\n")
    print(Fore.GREEN  + f"  Project : {Style.BRIGHT}{project}")
    print(Fore.GREEN  + f"  Dir     : {Style.BRIGHT}{watch_dir}")
    print(Fore.GREEN  + f"  Server  : {Style.BRIGHT}{url}")
    if run_cmd:
        print(Fore.YELLOW + f"  Running : {Style.BRIGHT}{run_cmd}")
    print(Fore.YELLOW + "\n  Watching: .py .js .ts .tsx .env .json .log ...")
    print(Fore.YELLOW + "  Press Ctrl+C to stop.\n")

    sync_queue = queue.Queue()
    stop_event = threading.Event()

    # Thread 1: batch sender
    t_sync = threading.Thread(
        target=sync_worker,
        args=(url, user, project, sync_queue, stop_event),
        daemon=True
    )
    t_sync.start()

    # Thread 2: subprocess runner (if --run was given)
    if run_cmd:
        t_run = threading.Thread(
            target=run_subprocess,
            args=(run_cmd, sync_queue, stop_event),
            daemon=True
        )
        t_run.start()
    elif not sys.stdin.isatty():
        # Thread 2 (alt): stdin capture for piped usage
        t_stdin = threading.Thread(
            target=stdin_capture,
            args=(sync_queue, stop_event),
            daemon=True
        )
        t_stdin.start()

    # Thread 3: file watcher
    event_handler = SyncHandler(sync_queue)
    observer = Observer()
    observer.schedule(event_handler, watch_dir, recursive=True)
    observer.start()

    print(Fore.GREEN + "  ✓ Watching for file changes...")
    if run_cmd:
        print(Fore.GREEN + "  ✓ Capturing command output as live logs...")
    print(Fore.GREEN + f"  ✓ Open http://localhost:3000/monitoring to view\n")

    try:
        while observer.is_alive():
            time.sleep(1)
    except KeyboardInterrupt:
        print(Fore.YELLOW + "\n  Stopping...")
        stop_event.set()
        observer.stop()

    observer.join()
    print(Fore.CYAN + "  Goodbye!\n")


if __name__ == "__main__":
    main()
