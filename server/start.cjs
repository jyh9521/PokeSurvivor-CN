const path=require('node:path'),{createApp}=require('./app.cjs');
const app=createApp({dataDir:path.resolve(process.env.DATA_DIR||'data'),publicOrigin:process.env.PUBLIC_ORIGIN||'',registration:process.env.REGISTRATION!=='false',trustProxy:process.env.TRUST_PROXY==='true'});
app.server.listen(Number(process.env.PORT||8080),process.env.HOST||'0.0.0.0',()=>console.log('NAS backend ready on port '+app.server.address().port));
for(const s of ['SIGTERM','SIGINT'])process.on(s,()=>app.close().then(()=>process.exit(0)));
