#!/usr/bin/env python3
"""Offline-testable Docker updater. Never discovers a target by a guessed name."""
import argparse
import copy
import fcntl
import hashlib
import json
import os
from pathlib import Path
import signal
import subprocess
import tempfile
import time

EXPECTED = {'version': '0.19.0', 'protocol': 18, 'schema': 3}
ROOT = Path(__file__).resolve().parents[1]


def run(*args):
    # Do not echo commands: inspect/config contain TURN credentials.
    p = subprocess.run(args, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if p.returncode:
        raise RuntimeError('Command failed: ' + ' '.join(args[:2]))
    return p.stdout.strip()


def inspect(target):
    return json.loads(run('docker', 'inspect', target))[0]


def env_of(c):
    return dict(e.split('=', 1) for e in c['Config']['Env'])


def validate(c, data, mode):
    labels = c['Config'].get('Labels') or {}
    managed = bool(labels.get('com.docker.compose.project'))
    if managed != (mode == 'compose'):
        raise RuntimeError('Container ownership differs; use the matching compose/standalone entry point')
    mounts = c['Mounts']
    if len(mounts) != 1 or mounts[0]['Type'] != 'bind' or mounts[0]['Destination'] != '/data' or not mounts[0]['RW']:
        raise RuntimeError('Require exactly one writable /data bind mount')
    if Path(mounts[0]['Source']).resolve() != data.resolve() or not (data / 'pokesurvivor.sqlite').is_file():
        raise RuntimeError('Original database/mount not found; refusing an empty installation')
    e = env_of(c)
    if e.get('DATA_DIR', '/data') != '/data':
        raise RuntimeError('Unsupported DATA_DIR')
    if not c['State']['Running']:
        raise RuntimeError('Target must be running')
    if len(c.get('NetworkSettings', {}).get('Networks', {})) > 1:
        raise RuntimeError('Multiple attached networks require manual migration')
    if c['HostConfig']['NetworkMode'] in ('host', 'none') or c['HostConfig'].get('Privileged'):
        raise RuntimeError('Unsupported network or privileged container')
    return e


HEALTH = '''const p=process.env.PORT||8080;fetch('http://127.0.0.1:'+p+'/api/health',{headers:{Origin:process.env.PUBLIC_ORIGIN||'http://localhost:'+p},signal:AbortSignal.timeout(5000)}).then(async r=>{if(!r.ok)throw Error('health');console.log(JSON.stringify(await r.json()))}).catch(()=>process.exit(1))'''


def health(cid):
    return json.loads(run('docker', 'exec', cid, 'node', '-e', HEALTH))


def gate(h):
    if not h.get('ok') or h.get('draining') is not True or h.get('ready') is not True or h.get('activeRuns') != 0 or h.get('activeRooms') != 0:
        raise RuntimeError('Enable maintenance and wait for all runs/rooms to drain; legacy servers require a separate manual upgrade')


def check_version(h):
    if any(h.get(k) != v for k, v in EXPECTED.items()):
        raise RuntimeError('Candidate version/protocol/schema mismatch')


def standalone_args(c, image):
    h = c['HostConfig']
    # Only configurations we can reproduce faithfully are accepted.
    if h['NetworkMode'] not in ('default', 'bridge') or h.get('Binds') is None or h.get('Devices') or h.get('ExtraHosts') or h.get('PortBindings') is None:
        raise RuntimeError('Unsupported standalone options; migrate manually')
    if h.get('PidMode') or h.get('IpcMode') not in (None, '', 'private') or h.get('VolumesFrom') or h.get('PublishAllPorts') or h.get('Mounts'):
        raise RuntimeError('Unsupported namespace or mount options')
    if h.get('CapAdd') or h.get('ReadonlyRootfs') or h.get('Links') or h.get('Dns') or h.get('Tmpfs') or h.get('Memory', 0) or h.get('NanoCpus', 0):
        raise RuntimeError('Unsupported standalone host options')
    cfg = c['Config']
    args = ['docker', 'create', '--name', c['Name'].lstrip('/'), '--network', h['NetworkMode'], '--restart', h['RestartPolicy']['Name']]
    if h['RestartPolicy'].get('MaximumRetryCount'):
        raise RuntimeError('Unsupported restart retry count')
    for key, flag in [('User', '--user'), ('WorkingDir', '--workdir')]:
        if cfg.get(key): args += [flag, cfg[key]]
    for value in cfg['Env']: args += ['-e', value]
    for value in h.get('Binds') or []: args += ['-v', value]
    for value in h.get('CapDrop') or []: args += ['--cap-drop', value]
    for value in h.get('SecurityOpt') or []: args += ['--security-opt', value]
    for key, value in (cfg.get('Labels') or {}).items(): args += ['--label', key + '=' + value]
    for port, bindings in h['PortBindings'].items():
        for b in bindings or []:
            ip = b.get('HostIp') or '0.0.0.0'
            if ':' in ip: ip = '[' + ip + ']'
            args += ['-p', ip + ':' + b['HostPort'] + ':' + port]
    # Keep image's command/entrypoint; refuse local overrides rather than dropping them.
    old = inspect(c['Image'])['Config']
    if cfg.get('Cmd') != old.get('Cmd') or cfg.get('Entrypoint') != old.get('Entrypoint'):
        raise RuntimeError('Custom command/entrypoint requires manual migration')
    args += ['--health-cmd', "node -e \"fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))\""]
    return args + [image]


def compose_snapshot(base, c, data):
    cfg = json.loads(run(*base, 'config', '--format', 'json'))
    svc = cfg['services']['pokesurvivor']
    e = env_of(c)
    if any(str(v) != e.get(k) for k, v in svc.get('environment', {}).items()):
        raise RuntimeError('Compose environment drift; reconcile .env with live container first')
    volumes = svc.get('volumes', [])
    if len(volumes) != 1 or Path(volumes[0].get('source', '')).resolve() != data.resolve() or volumes[0].get('target') != '/data':
        raise RuntimeError('Compose data mount drift')
    desired = {(str(p.get('host_ip') or '0.0.0.0'), str(p['published']), str(p['target'])+'/'+p.get('protocol','tcp')) for p in svc.get('ports', [])}
    actual = {(b.get('HostIp') or '0.0.0.0', b['HostPort'], p) for p, bs in c['HostConfig']['PortBindings'].items() for b in bs or [] if b.get('HostIp') != '::'}
    if desired != actual or svc.get('user', '') != c['Config'].get('User', ''):
        raise RuntimeError('Compose port/user drift')
    svc.pop('build', None)
    svc.pop('depends_on', None)
    cfg['services'] = {'pokesurvivor': svc}
    return cfg


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('mode', choices=['compose', 'standalone'])
    ap.add_argument('--data', required=True, type=Path)
    ap.add_argument('--container')
    ap.add_argument('--project')
    ap.add_argument('--file', default=str(ROOT / 'compose.yaml'))
    ap.add_argument('--check', action='store_true', help='read-only preflight; no build, backup or restart')
    a = ap.parse_args()
    base = ['docker', 'compose', '--project-directory', str(ROOT), '-f', str(Path(a.file).resolve())]
    if a.mode == 'compose':
        if not a.project or a.container: ap.error('compose requires --project and forbids --container')
        base += ['-p', a.project]
        ids = run(*base, 'ps', '-q', 'pokesurvivor').splitlines()
        if len(ids) != 1: raise RuntimeError('Expected exactly one compose service container')
        target = ids[0]
    else:
        if not a.container or a.project: ap.error('standalone requires --container and forbids --project')
        target = a.container
    c = inspect(target)
    # Host-local lock is held through rollback. No lock files in user data.
    lock_key = hashlib.sha256(str(a.data.resolve()).encode()).hexdigest()
    with open('/tmp/pokesurvivor-update-' + lock_key + '.lock', 'w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        e = validate(c, a.data, a.mode)
        labels = c['Config'].get('Labels') or {}
        if a.mode == 'compose' and (labels.get('com.docker.compose.project') != a.project or labels.get('com.docker.compose.service') != 'pokesurvivor'):
            raise RuntimeError('Compose labels differ')
        cfg = compose_snapshot(base, c, a.data) if a.mode == 'compose' else None
        if not cfg: standalone_args(c, c['Image'])
        gate(health(c['Id']))
        print('Preflight OK:', c['Name'], 'ports=', json.dumps(c['HostConfig']['PortBindings']), 'data=', a.data)
        if a.check: return
        stamp = str(time.time_ns())
        image = 'pokesurvivor-cn-nas:update-' + stamp
        run('docker', 'build', '-t', image, str(ROOT))
        candidate = inspect(image)['Id']
        rollback_image = 'pokesurvivor-cn-nas:rollback-' + stamp
        run('docker', 'image', 'tag', c['Image'], rollback_image)
        meta = json.loads(run('docker', 'run', '--rm', '--network', 'none', candidate, 'node', '-e', "console.log(JSON.stringify(require('./server/deployment-version.cjs')))"))
        check_version(meta)
        # Validate preserved TURN settings in an isolated container without touching /data.
        if e.get('CF_TURN_KEY_ID') or e.get('CF_TURN_KEY_API_TOKEN'):
            with tempfile.NamedTemporaryFile(mode='w') as f:
                os.chmod(f.name, 0o600)
                if any('\n' in v or '\r' in v for k,v in e.items() if k.startswith('CF_')):
                    raise RuntimeError('Invalid multiline TURN environment')
                f.write('\n'.join(k+'='+v for k,v in e.items() if k.startswith('CF_'))+'\n'); f.flush()
                run('docker', 'run', '--rm', '--env-file', f.name, candidate, 'node', 'tools/check-turn-config.cjs')
        gate(health(c['Id']))
        backup = '/data/backups/pre-0.19.0-' + stamp + '.sqlite'
        run('docker', 'exec', c['Id'], 'node', 'server/backup.cjs', backup)
        name = c['Name'].lstrip('/')
        previous = name + '-previous-' + stamp
        changed = False
        new_id = None
        def interrupted(*_): raise RuntimeError('Interrupted; rolling back')
        for sig in (signal.SIGINT, signal.SIGTERM, signal.SIGHUP): signal.signal(sig, interrupted)
        with tempfile.TemporaryDirectory(prefix='pokesurvivor-update-') as tmp:
            def compose_up(image_id):
                snapshot = copy.deepcopy(cfg)
                snapshot['services']['pokesurvivor']['image'] = image_id
                file = Path(tmp) / 'compose.json'
                file.write_text(json.dumps(snapshot)); file.chmod(0o600)
                cmd = ['docker', 'compose', '--project-directory', str(ROOT), '-p', a.project, '-f', str(file)]
                run(*cmd, 'up', '-d', '--no-deps', '--no-build', '--force-recreate', 'pokesurvivor')
                ids = run(*cmd, 'ps', '-q', 'pokesurvivor').splitlines()
                if len(ids) != 1: raise RuntimeError('Replacement missing')
                return ids[0]
            try:
                changed = True
                if cfg:
                    new_id = compose_up(candidate)
                else:
                    run('docker', 'stop', c['Id'])
                    run('docker', 'rename', c['Id'], previous)
                    new_id = run(*standalone_args(c, candidate))
                    run('docker', 'start', new_id)
                for attempt in range(12):
                    try:
                        new = inspect(new_id)
                        validate(new, a.data, a.mode)
                        if new['Image'] != candidate: raise RuntimeError('Wrong image')
                        h = health(new_id); check_version(h); gate(h)
                        break
                    except RuntimeError:
                        if attempt == 11: raise
                        time.sleep(2)
                print('Original image:', rollback_image, '(', c['Image'], ')')
                if not cfg: print('Previous container:', previous)
                print('Upgrade OK; maintenance remains enabled. Backup:', str(a.data / backup.removeprefix('/data/')))
            except BaseException:
                for sig in (signal.SIGINT, signal.SIGTERM, signal.SIGHUP): signal.signal(sig, signal.SIG_IGN)
                if changed:
                    # Resolve only this exact name and require matching ownership/image before touching it.
                    try:
                        current = inspect(name)
                    except RuntimeError:
                        # A failed Compose recreate may already have removed the old container.
                        current = None
                    if current and current['Id'] != c['Id']:
                        if current['Image'] != candidate: raise RuntimeError('Unexpected replacement; manual recovery required')
                        stopped_check = copy.deepcopy(current)
                        stopped_check['State']['Running'] = True
                        validate(stopped_check, a.data, a.mode)
                        if cfg and any((current['Config'].get('Labels') or {}).get(k) != labels.get(k) for k in ('com.docker.compose.project', 'com.docker.compose.service')):
                            raise RuntimeError('Replacement ownership changed; manual recovery required')
                        run('docker', 'stop', current['Id'])
                        run('docker', 'rm', current['Id'])
                    elif current:
                        run('docker', 'stop', c['Id'])
                    elif not cfg:
                        old = inspect(c['Id'])
                        run('docker', 'stop', old['Id'])
                    # Restore consistent snapshot, preserving the failed database/WAL for investigation.
                    restore = "const fs=require('fs');const p='/data/pokesurvivor.sqlite';for(const s of ['', '-wal','-shm'])if(fs.existsSync(p+s))fs.renameSync(p+s,p+s+'.failed-"+stamp+"');fs.copyFileSync(process.argv[1],p);"
                    run('docker', 'run', '--rm', '--network', 'none', '--user', c['Config']['User'] or '0', '-v', str(a.data.resolve())+':/data', c['Image'], 'node', '-e', restore, backup)
                    if cfg: restored = compose_up(c['Image'])
                    else:
                        old = inspect(c['Id'])
                        if old['Name'].lstrip('/') != name: run('docker', 'rename', c['Id'], name)
                        run('docker', 'start', c['Id']); restored = c['Id']
                    for attempt in range(12):
                        try:
                            gate(health(restored)); break
                        except RuntimeError:
                            if attempt == 11: raise
                            time.sleep(2)
                    print('Rolled back original image and SQLite snapshot; maintenance remains enabled.')
                raise


if __name__ == '__main__':
    try: main()
    except (Exception, KeyboardInterrupt) as exc:
        print('Update failed:', exc, flush=True)
        raise SystemExit(1)
