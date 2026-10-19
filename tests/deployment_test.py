"""No Docker daemon, NAS, credentials or real database access."""
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('updater', Path(__file__).resolve().parents[1]/'deploy/update-nas.py')
u = importlib.util.module_from_spec(spec)
spec.loader.exec_module(u)


def container(data, compose=False):
    return {'Id':'old', 'Name':'/game', 'Image':'old-image', 'State':{'Running':True},
            'Mounts':[{'Type':'bind','Source':str(data),'Destination':'/data','RW':True}],
            'Config':{'Env':['PORT=2333','DATA_DIR=/data','REGISTRATION=false','CF_TURN_KEY_ID=key'], 'Labels':({'com.docker.compose.project':'game','com.docker.compose.service':'pokesurvivor'} if compose else {}),'User':'99:100','Cmd':['node','server/start.cjs'],'Entrypoint':None},
            'HostConfig':{'NetworkMode':'bridge','Binds':[str(data)+':/data'],'PortBindings':{'2333/tcp':[{'HostIp':'0.0.0.0','HostPort':'2333'}]},'RestartPolicy':{'Name':'unless-stopped'}}}

GOOD = dict(ok=True,draining=True,ready=True,activeRuns=0,activeRooms=0,**u.EXPECTED)


class Deployment(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup)
        self.data = Path(self.tmp.name); (self.data/'pokesurvivor.sqlite').touch()
        self.c = container(self.data)

    def test_mount_and_ownership(self):
        u.validate(self.c,self.data,'standalone')
        for mutate in [lambda c:c['Mounts'][0].update(Source='/wrong'),lambda c:c['Mounts'][0].update(RW=False), lambda c:c['Config'].update(Labels={'com.docker.compose.project':'other'}), lambda c:c['State'].update(Running=False),lambda c:c['Config']['Env'].append('DATA_DIR=/elsewhere')]:
            c=copy.deepcopy(self.c);mutate(c)
            with self.assertRaises(RuntimeError):u.validate(c,self.data,'standalone')
        (self.data/'pokesurvivor.sqlite').unlink()
        with self.assertRaises(RuntimeError):u.validate(self.c,self.data,'standalone')

    def test_gate_and_version(self):
        u.gate(GOOD);u.check_version(GOOD)
        for k in ['draining','ready','activeRuns','activeRooms']:
            h=GOOD.copy();h[k]=False if k in ('draining','ready') else 1
            with self.assertRaises(RuntimeError):u.gate(h)
        with self.assertRaises(RuntimeError):u.gate({'ok':True})
        for k in u.EXPECTED:
            h=GOOD.copy();h[k]='wrong'
            with self.assertRaises(RuntimeError):u.check_version(h)

    def test_preserve_standalone(self):
        with patch.object(u,'inspect',return_value=self.c):args=u.standalone_args(self.c,'new')
        for value in ['REGISTRATION=false','CF_TURN_KEY_ID=key','PORT=2333','0.0.0.0:2333:2333/tcp',str(self.data)+':/data','99:100']:self.assertIn(value,args)
        self.c['HostConfig']['NetworkMode']='custom'
        with self.assertRaises(RuntimeError):u.standalone_args(self.c,'new')

    def scenario(self, mode='standalone', failure=None, check=False):
        c=container(self.data,mode=='compose'); calls=[]; active='old'; renamed=False; failed=False
        svc={'image':'tag','build':'.','environment':u.env_of(c),'user':'99:100','volumes':[{'source':str(self.data),'target':'/data'}],'ports':[{'published':'2333','target':2333}]}
        def cmd(*args):
            nonlocal active,renamed,failed
            calls.append(args)
            if args[:2]==('docker','inspect'):
                key=args[2]
                if key.startswith('pokesurvivor-cn-nas:update-'):return json.dumps([{'Id':'new-image'}])
                if key=='old-image':return json.dumps([c])
                if key in ('old','game'):
                    if key=='game' and renamed and active=='old':raise RuntimeError('absent')
                    result=copy.deepcopy(c)
                    if active=='new' and key=='game':result.update(Id='new',Image='new-image')
                    if renamed and key=='old':result['Name']='/previous'
                    return json.dumps([result])
                if key=='new':
                    result=copy.deepcopy(c);result.update(Id='new',Image='new-image');return json.dumps([result])
                raise AssertionError(args)
            if 'config' in args:return json.dumps({'services':{'pokesurvivor':svc}})
            if 'ps' in args:return active
            if args[:2]==('docker','build'):
                if failure=='build':raise RuntimeError('build')
                return ''
            if args[:2]==('docker','exec'):
                if 'server/backup.cjs' in args:
                    if failure=='backup':raise RuntimeError('backup')
                    return 'BACKUP_OK'
                if active=='new' and failure in ('health','version'):
                    if failure=='health':raise RuntimeError('dead')
                    return json.dumps(dict(GOOD,protocol=17))
                return json.dumps(GOOD)
            if args[:2]==('docker','run'):
                if 'deployment-version' in args[-1]:return json.dumps(dict(u.EXPECTED,version='wrong') if failure=='metadata' else u.EXPECTED)
                if 'tools/check-turn-config.cjs' in args and failure=='turn':raise RuntimeError('TURN')
                return ''
            if args[:2]==('docker','rename'):renamed=not renamed;return ''
            if args[:2]==('docker','create'):
                if failure=='create':raise RuntimeError('create')
                active='new';return 'new'
            if args[:2]==('docker','rm'):active='old';return ''
            if 'up' in args:
                cfg=json.loads(Path(args[args.index('-f')+1]).read_text())
                image=cfg['services']['pokesurvivor']['image']
                active='new' if image=='new-image' else 'old'
                if failure=='interrupt' and not failed:failed=True;raise KeyboardInterrupt()
                return ''
            if args[:2]==('docker','start') and failure=='interrupt' and not failed:
                failed=True;raise KeyboardInterrupt()
            return ''
        argv=['update',mode,'--data',str(self.data)]+(['--project','game'] if mode=='compose' else ['--container','game'])+(['--check'] if check else [])
        with patch('sys.argv',argv),patch.object(u,'run',side_effect=cmd),patch.object(u.time,'sleep'),patch.object(u.signal,'signal'):
            if failure:
                with self.assertRaises(BaseException):u.main()
            else:u.main()
        return calls

    def test_readonly_both(self):
        for mode in ['standalone','compose']:
            calls=self.scenario(mode,check=True)
            self.assertFalse(any(x[1] in ('build','stop','create','run') for x in calls))

    def test_pre_stop_failures(self):
        for failure in ['build','backup','metadata','turn']:
            for mode in ['standalone','compose']:
                calls=self.scenario(mode,failure)
                self.assertFalse(any(x[:2]==('docker','stop') or 'up' in x for x in calls))

    def test_success_both(self):
        for mode in ['standalone','compose']:
            calls=self.scenario(mode)
            self.assertFalse(any('down' in x for x in calls))
            self.assertTrue(any('server/backup.cjs' in x for x in calls))

    def test_rollback_matrix(self):
        for mode in ['standalone','compose']:
            for failure in ['health','version','interrupt']+(['create'] if mode=='standalone' else []):
                with self.subTest(mode=mode,failure=failure):
                    calls=self.scenario(mode,failure)
                    self.assertTrue(any(x[:2]==('docker','run') and 'copyFileSync' in ' '.join(x) for x in calls))
                    self.assertTrue(any(('up' in x or x[:2]==('docker','start')) for x in calls))

    def test_compose_drift(self):
        c=container(self.data,True)
        svc={'environment':u.env_of(c),'user':'99:100','volumes':[{'source':str(self.data),'target':'/data'}],'ports':[{'published':'2333','target':2333}]}
        with patch.object(u,'run',return_value=json.dumps({'services':{'pokesurvivor':svc}})):
            u.compose_snapshot(['docker','compose'],c,self.data)
        for key,value in [('user','0'),('environment',{'REGISTRATION':'true'}),('ports',[{'published':'8766','target':8080}]),('volumes',[{'source':'/wrong','target':'/data'}])]:
            changed=copy.deepcopy(svc);changed[key]=value
            with patch.object(u,'run',return_value=json.dumps({'services':{'pokesurvivor':changed}})):
                with self.assertRaises(RuntimeError):u.compose_snapshot(['docker','compose'],c,self.data)

    def test_metadata_tracks_sources(self):
        root=Path(__file__).resolve().parents[1]
        self.assertEqual(json.loads((root/'package.json').read_text())['version'],u.EXPECTED['version'])
        self.assertIn('protocol:18',(root/'server/app.cjs').read_text())
        self.assertIn('PRAGMA user_version=3',(root/'server/store.cjs').read_text())

if __name__=='__main__':unittest.main()
