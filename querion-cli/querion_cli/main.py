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

# Ensure utf-8 stdout encoding on Windows
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Strip ANSI terminal colour/control codes so logs appear as clean text
_ANSI_RE = re.compile(r'\x1b\[[0-9;]*[A-Za-z]|\x1b\][^\x07]*\x07|\x9b[0-9;]*[A-Za-z]|[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]')
def strip_ansi(text: str) -> str:
    return _ANSI_RE.sub('', text).strip()

WATCHED_EXTENSIONS = {'.py', '.js', '.ts', '.tsx', '.jsx', '.env', '.json', '.log', '.txt', '.css', '.html', '.sql', '.md', '.yml', '.yaml'}
SKIP_DIRS = {'.git', '__pycache__', 'node_modules', 'venv', '.venv', 'dist', '.next', 'build', '.cache'}

# ─── Project Auto-Runner Detection ─────────────────────────────────────────────

def detect_run_command(watch_dir: str):
    """Auto-detect the command to run the whole project code."""
    # Find Python executable
    py_exec = sys.executable or "python"
    venv_py = os.path.join(watch_dir, "venv", "Scripts", "python.exe")
    dot_venv_py = os.path.join(watch_dir, ".venv", "Scripts", "python.exe")
    if os.path.isfile(venv_py):
        py_exec = venv_py
    elif os.path.isfile(dot_venv_py):
        py_exec = dot_venv_py

    # 1. Django (has manage.py)
    manage_py = os.path.join(watch_dir, "manage.py")
    if os.path.isfile(manage_py):
        return f'"{py_exec}" manage.py runserver 8000'

    # 2. Node / Next / React / Vite (has package.json)
    pkg_json = os.path.join(watch_dir, "package.json")
    if os.path.isfile(pkg_json):
        try:
            with open(pkg_json, 'r', encoding='utf-8') as f:
                data = json.load(f)
            scripts = data.get("scripts", {})
            if "dev" in scripts:
                return "npm run dev"
            if "start" in scripts:
                return "npm start"
        except Exception:
            return "npm start"

    # 3. Python standard entrypoints
    for candidate in ["app.py", "main.py", "server.py", "run.py", "wsgi.py"]:
        full_path = os.path.join(watch_dir, candidate)
        if os.path.isfile(full_path):
            return f'"{py_exec}" {candidate}'

    return None


# ─── AI Error Solver ──────────────────────────────────────────────────────────

_SOLVING_LOCK = threading.Lock()

def solve_error_with_ai(error_block: str, server_url: str, project_name: str):
    """Send captured error traceback to Querion backend AI and print solution."""
    with _SOLVING_LOCK:
        try:
            resp = requests.post(
                f"{server_url}/api/monitor/analyze-error-v2",
                json={"log": error_block},
                headers={"Content-Type": "application/json"},
                timeout=45
            )
            if resp.status_code == 200:
                data = resp.json()
                explanation = data.get("explanation") or data.get("suggested_fix") or "Error analysis completed."
                error_type = data.get("error_type") or "Runtime Error"
                affected_file = data.get("affected_file") or "Project Code"
                fix_code = data.get("generated_fix_code") or data.get("correct_code") or data.get("suggested_fix")

                print(Style.BRIGHT + Fore.RED + "\n  " + "="*70)
                print(Style.BRIGHT + Fore.RED + f"  [!] AI ERROR DIAGNOSIS & SOLUTION -- {project_name.upper()}")
                print(Style.BRIGHT + Fore.RED + "  " + "="*70)
                print(Fore.YELLOW + f"  Issue Type : {Style.BRIGHT}{error_type}")
                print(Fore.YELLOW + f"  Location   : {Style.BRIGHT}{affected_file}")
                print(Fore.CYAN   + "\n  [AI Solution Explanation]:")
                for line in explanation.splitlines()[:15]:
                    print(Fore.WHITE + f"    {line}")

                if fix_code and fix_code != explanation:
                    print(Fore.GREEN + "\n  [Recommended Fix Code]:")
                    for line in str(fix_code).splitlines()[:20]:
                        print(Fore.GREEN + f"    {line}")

                print(Style.BRIGHT + Fore.RED + "  " + "="*70)
                print(Fore.CYAN + "  ✓ Live AI report synced to http://localhost:3000/monitoring\n")
        except Exception:
            pass


# ─── File Watcher ─────────────────────────────────────────────────────────────

class SyncHandler(FileSystemEventHandler):
    def __init__(self, sync_queue, watch_dir):
        super().__init__()
        self.sync_queue = sync_queue
        self.watch_dir = watch_dir
        self.log_file_positions = {}

    def _should_watch(self, path):
        parts = path.replace('\\', '/').split('/')
        for p in parts:
            if p in SKIP_DIRS or p.startswith('.'):
                return False
        
        filename = os.path.basename(path).lower()
        if filename in ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml']:
            return False

        ext = os.path.splitext(path)[1].lower()
        return ext in WATCHED_EXTENSIONS

    def on_modified(self, event):
        if not event.is_directory and self._should_watch(event.src_path):
            self._enqueue_file(event.src_path)
            self._check_file_errors(event.src_path)

    def on_created(self, event):
        if not event.is_directory and self._should_watch(event.src_path):
            self._enqueue_file(event.src_path)
            self._check_file_errors(event.src_path)

    def _check_file_errors(self, path):
        """Detect syntax and compilation errors in edited files immediately and send to Log Detection."""
        try:
            ext = os.path.splitext(path)[1].lower()
            rel_path = os.path.relpath(path, self.watch_dir).replace('\\', '/')

            # 1. JavaScript / TypeScript syntax check
            if ext in ['.js', '.jsx', '.ts', '.tsx']:
                res = subprocess.run(["node", "-c", path], capture_output=True, text=True, timeout=5)
                if res.returncode != 0:
                    err_lines = strip_ansi(res.stderr or res.stdout).strip().splitlines()
                    if err_lines:
                        print(Style.BRIGHT + Fore.RED + f"\n  [!] Error detected in {rel_path}:")
                        for el in err_lines:
                            print(Fore.RED + f"      {el}")
                        self.sync_queue.put({'type': 'log', 'line': f"ERROR in {rel_path}:"})
                        for el in err_lines:
                            self.sync_queue.put({'type': 'log', 'line': el})
                        print(Fore.CYAN + "  [+] Error sent to Querion Log Detection dashboard\n")

            # 2. Python syntax check
            elif ext == '.py':
                res = subprocess.run([sys.executable, "-m", "py_compile", path], capture_output=True, text=True, timeout=5)
                if res.returncode != 0:
                    err_lines = strip_ansi(res.stderr or res.stdout).strip().splitlines()
                    if err_lines:
                        print(Style.BRIGHT + Fore.RED + f"\n  [!] Python syntax error in {rel_path}:")
                        for el in err_lines:
                            print(Fore.RED + f"      {el}")
                        self.sync_queue.put({'type': 'log', 'line': f"SyntaxError in {rel_path}:"})
                        for el in err_lines:
                            self.sync_queue.put({'type': 'log', 'line': el})
                        print(Fore.CYAN + "  [+] Error sent to Querion Log Detection dashboard\n")
        except Exception:
            pass

    def _enqueue_file(self, path, is_initial=False):
        try:
            ext = os.path.splitext(path)[1].lower()
            rel_path = os.path.relpath(path, self.watch_dir).replace('\\', '/')

            # If it's a log file, read newly appended lines into live logs
            if ext == '.log':
                try:
                    with open(path, 'r', encoding='utf-8', errors='ignore') as lf:
                        pos = self.log_file_positions.get(path, 0)
                        if is_initial:
                            lines = lf.readlines()
                            for line in lines[-50:]:
                                clean = strip_ansi(line)
                                if clean:
                                    self.sync_queue.put({'type': 'log', 'line': clean})
                            self.log_file_positions[path] = lf.tell()
                        else:
                            lf.seek(pos)
                            lines = lf.readlines()
                            self.log_file_positions[path] = lf.tell()
                            for line in lines:
                                clean = strip_ansi(line)
                                if clean:
                                    self.sync_queue.put({'type': 'log', 'line': clean})
                except Exception:
                    pass

            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()

            self.sync_queue.put({'type': 'file', 'path': rel_path, 'content': content})
            if not is_initial:
                print(Fore.BLUE + f"  [file] {rel_path}")
        except Exception:
            pass


def initial_scan(watch_dir, sync_queue, handler):
    """Scan existing directory files on startup so all project files are known immediately."""
    count = 0
    for root, dirs, files in os.walk(watch_dir):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith('.')]
        for f in files:
            full_p = os.path.join(root, f)
            if handler._should_watch(full_p):
                handler._enqueue_file(full_p, is_initial=True)
                count += 1
    return count


# ─── Subprocess runner (runs project & captures logs & solves errors) ─────────

ERROR_KEYWORDS = [
    "traceback (most recent call last)",
    "exception:",
    "error:",
    "syntaxerror",
    "modulenotfounderror",
    "importerror",
    "operationalerror",
    "nameerror",
    "attributeerror",
    "typeerror",
    "unhandledpromiserejection",
    "uncaughtexception",
    "django.core.exceptions"
]

def run_subprocess(cmd_str, watch_dir, server_url, project_name, sync_queue, stop_event):
    """Spawn the user's project command, stream live logs, and solve any runtime error with AI."""
    print(Style.BRIGHT + Fore.CYAN + f"\n  [run] Executing: {cmd_str}\n")
    env = os.environ.copy()
    env["PYTHONUNBUFFERED"] = "1"
    env["FORCE_COLOR"] = "1"

    error_buffer = []
    in_error = False
    last_error_time = 0

    try:
        proc = subprocess.Popen(
            cmd_str,
            cwd=watch_dir,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding='utf-8',
            errors='replace',
            bufsize=1,
            env=env
        )

        for line in iter(proc.stdout.readline, ''):
            if stop_event.is_set():
                break

            clean = strip_ansi(line)
            if clean:
                sys.stdout.write(line)
                sys.stdout.flush()
                sync_queue.put({'type': 'log', 'line': clean})

                line_lower = clean.lower()
                now = time.time()

                # Detect beginning of traceback / error
                if any(kw in line_lower for kw in ERROR_KEYWORDS):
                    in_error = True
                    error_buffer.append(clean)
                    last_error_time = now
                elif in_error:
                    # Accumulate error block lines
                    error_buffer.append(clean)
                    last_error_time = now
                    # Check if error block ended (e.g. 10 lines or specific terminator)
                    if len(error_buffer) >= 20:
                        full_err = "\n".join(error_buffer)
                        threading.Thread(
                            target=solve_error_with_ai,
                            args=(full_err, server_url, project_name),
                            daemon=True
                        ).start()
                        error_buffer = []
                        in_error = False

            # If we were in error and 1.5 seconds elapsed without error lines, flush and solve
            if in_error and error_buffer and (time.time() - last_error_time > 1.5):
                full_err = "\n".join(error_buffer)
                threading.Thread(
                    target=solve_error_with_ai,
                    args=(full_err, server_url, project_name),
                    daemon=True
                ).start()
                error_buffer = []
                in_error = False

        proc.wait()

        # Flush any trailing error
        if error_buffer:
            full_err = "\n".join(error_buffer)
            threading.Thread(
                target=solve_error_with_ai,
                args=(full_err, server_url, project_name),
                daemon=True
            ).start()

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

def sync_worker(server_url, user_id, project_name, watch_dir, sync_queue, stop_event):
    def empty_batch():
        return {'user_id': user_id, 'project_name': project_name, 'files': [], 'logs': []}

    # Initial registration ping so project card appears immediately
    try:
        init_payload = {
            'user_id': user_id,
            'project_name': project_name,
            'files': [],
            'logs': [
                {'line': f"[Querion Monitor] Connected to project: '{project_name}' ({watch_dir})"}
            ]
        }
        requests.post(
            f"{server_url}/api/monitor/sync",
            json=init_payload,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
    except Exception:
        pass

    batch = empty_batch()
    last_sync = time.time()
    last_heartbeat = time.time()

    while not stop_event.is_set():
        # drain the queue
        try:
            while True:
                item = sync_queue.get_nowait()
                if item['type'] == 'file':
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
            if len(payload_str) > 100_000:
                batch['logs'] = batch['logs'][-30:]
                payload_str = json.dumps(batch)

            try:
                resp = requests.post(
                    f"{server_url}/api/monitor/sync",
                    data=payload_str,
                    headers={'Content-Type': 'application/json'},
                    timeout=30
                )
                if resp.status_code == 200:
                    parts = []
                    if batch['files']:
                        parts.append(f"{len(batch['files'])} file(s)")
                    if batch['logs']:
                        parts.append(f"{len(batch['logs'])} log(s)")
                    print(Fore.GREEN + f"  [synced] {' + '.join(parts)}")
                    last_heartbeat = now
                else:
                    print(Fore.RED + f"  [sync error] HTTP {resp.status_code}: {resp.text[:100]}")
            except requests.exceptions.ConnectionError:
                print(Fore.RED + f"  [sync error] Cannot reach {server_url} -- is the backend running?")
            except Exception as e:
                print(Fore.RED + f"  [sync error] {e}")

            batch = empty_batch()
            last_sync = now

        # Periodic heartbeat every 10 seconds to keep project "Live"
        elif (now - last_heartbeat >= 10.0):
            try:
                requests.post(
                    f"{server_url}/api/monitor/sync",
                    json={'user_id': user_id, 'project_name': project_name},
                    headers={'Content-Type': 'application/json'},
                    timeout=5
                )
                last_heartbeat = now
            except Exception:
                pass

        time.sleep(0.1)


# ─── CLI Entrypoint ───────────────────────────────────────────────────────────

@click.group()
def main():
    """Querion CLI -- Real-time backend monitoring and error solving companion."""
    pass


@main.command()
@click.option('--project', default=None, help='Project name shown in monitoring dashboard (default: folder name)')
@click.option('--user',    default='default_user', show_default=True, help='User ID')
@click.option('--url',     default='http://localhost:4000', show_default=True, help='Querion backend URL')
@click.option('--dir',     'watch_dir', default='.', show_default=True, help='Directory to watch (default: current directory)')
@click.option('--run',     'run_cmd', default=None, help='Custom command to run (auto-detected if omitted, e.g. "python manage.py runserver")')
def watch(project, user, url, watch_dir, run_cmd):
    """
    Watch a project directory, execute the code, stream logs, and auto-solve errors with AI.

    \b
    Usage examples:
      querion watch
      querion watch --project "myproject"
      querion watch --run "python manage.py runserver"
    """
    _execute_watcher(project, user, url, watch_dir, run_cmd)


@main.command()
@click.option('--project', default=None, help='Project name shown in monitoring dashboard (default: folder name)')
@click.option('--user',    default='default_user', show_default=True, help='User ID')
@click.option('--url',     default='http://localhost:4000', show_default=True, help='Querion backend URL')
@click.option('--dir',     'watch_dir', default='.', show_default=True, help='Directory to run (default: current directory)')
@click.option('--run',     'run_cmd', default=None, help='Custom command to run (auto-detected if omitted)')
def run(project, user, url, watch_dir, run_cmd):
    """
    Run your project with real-time live monitoring and automatic AI error solving.
    """
    _execute_watcher(project, user, url, watch_dir, run_cmd)


def _execute_watcher(project, user, url, watch_dir, run_cmd):
    watch_dir = os.path.abspath(watch_dir)
    if not project:
        project = os.path.basename(watch_dir.rstrip("/\\")) or "Project"

    # Auto-detect run command if not specified
    if not run_cmd:
        detected = detect_run_command(watch_dir)
        if detected:
            run_cmd = detected
            print(Fore.GREEN + f"  [+] Auto-detected project start command: {Style.BRIGHT}{run_cmd}")
        else:
            print(Fore.YELLOW + "  [-] No default entrypoint detected (e.g. manage.py, app.py, package.json).")
            print(Fore.YELLOW + "      To run a custom command: querion watch --run \"<command>\"")

    print(Style.BRIGHT + Fore.CYAN + "\n  +--------------------------------------+")
    print(Style.BRIGHT + Fore.CYAN +  "  |   Querion Backend Monitor  v1.3      |")
    print(Style.BRIGHT + Fore.CYAN +  "  |   Live Execution & AI Error Solver   |")
    print(Style.BRIGHT + Fore.CYAN +  "  +--------------------------------------+\n")
    print(Fore.GREEN  + f"  Project  : {Style.BRIGHT}{project}")
    print(Fore.GREEN  + f"  Dir      : {Style.BRIGHT}{watch_dir}")
    print(Fore.GREEN  + f"  Server   : {Style.BRIGHT}{url}")
    if run_cmd:
        print(Fore.YELLOW + f"  Running  : {Style.BRIGHT}{run_cmd}")
    print(Fore.YELLOW + "  Press Ctrl+C to stop.\n")

    sync_queue = queue.Queue()
    stop_event = threading.Event()

    # Initial file scan to populate existing project files immediately
    event_handler = SyncHandler(sync_queue, watch_dir)
    scanned_count = initial_scan(watch_dir, sync_queue, event_handler)
    print(Fore.GREEN + f"  [+] Indexed {scanned_count} project file(s) for '{project}'")

    # Thread 1: batch sender
    t_sync = threading.Thread(
        target=sync_worker,
        args=(url, user, project, watch_dir, sync_queue, stop_event),
        daemon=True
    )
    t_sync.start()

    # Thread 2: code execution runner & AI error solver
    if run_cmd:
        t_run = threading.Thread(
            target=run_subprocess,
            args=(run_cmd, watch_dir, url, project, sync_queue, stop_event),
            daemon=True
        )
        t_run.start()
    elif not sys.stdin.isatty():
        # Piped usage
        t_stdin = threading.Thread(
            target=stdin_capture,
            args=(sync_queue, stop_event),
            daemon=True
        )
        t_stdin.start()

    # Thread 3: file watcher
    observer = Observer()
    observer.schedule(event_handler, watch_dir, recursive=True)
    observer.start()

    print(Fore.GREEN + "  [+] Watching for real-time file changes...")
    print(Fore.GREEN + f"  [+] Monitoring Dashboard live at: http://localhost:3000/monitoring\n")

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
