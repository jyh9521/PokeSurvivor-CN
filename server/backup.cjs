/* Consistent SQLite backup including committed WAL contents. */
const {DatabaseSync,backup}=require('node:sqlite'),path=require('node:path'),fs=require('node:fs');
const data=path.resolve(process.env.DATA_DIR||'data'),out=path.resolve(process.argv[2]||path.join(data,'backups',new Date().toISOString().replace(/[:.]/g,'-')+'.sqlite'));
fs.mkdirSync(path.dirname(out),{recursive:true});const db=new DatabaseSync(path.join(data,'pokesurvivor.sqlite'),{readOnly:true});
backup(db,out).then(()=>{db.close();console.log('BACKUP_OK '+out);}).catch(e=>{db.close();console.error(e.message);process.exitCode=1;});
