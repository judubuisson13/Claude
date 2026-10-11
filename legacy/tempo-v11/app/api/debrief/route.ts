import {env} from 'cloudflare:workers';
import {headers} from 'next/headers';
export async function POST(req:Request){
 const h=await headers(),user=h.get('oai-authenticated-user-id');
 if(!user||!env.DB)return Response.json({error:'Connecte-toi pour enregistrer ce débrief. Tes réponses restent à l’écran.'},{status:401});
 try{
 const body:any=await req.json(),entries=body.items;
 const kinds=['account','contact','candidate','consultant','opportunity','task','activity','topic'];
 if(!Array.isArray(entries)||!entries.length||entries.length>160||new Set(entries.map((x:any)=>x.id)).size!==entries.length||entries.some((x:any)=>!x.id||typeof x.id!=='string'||!kinds.includes(x.kind)||!Number.isInteger(x.version)||x.version<1||!x.data||typeof x.data!=='object'))return Response.json({error:'Débrief invalide.'},{status:400});
 const timestamp=new Date().toISOString();const statements=[];
 for(const r of entries){const json=JSON.stringify(r.data);if(json.length>50000)return Response.json({error:'Un compte rendu est trop long.'},{status:400});
 if(r.version===1){statements.push(env.DB.prepare('INSERT INTO records(user_id,id,kind,data,version,updated_at) VALUES(?,?,?,?,1,?) ON CONFLICT(user_id,id) DO NOTHING').bind(user,r.id,r.kind,json,timestamp));}
 else {statements.push(env.DB.prepare('UPDATE records SET data=?,version=?,updated_at=? WHERE user_id=? AND id=? AND kind=? AND version=?').bind(json,r.version,timestamp,user,r.id,r.kind,r.version-1));}
 // Fail the transaction if a write conflicted. Exact retries are accepted.
 statements.push(env.DB.prepare('INSERT INTO records(user_id,id,kind,data,version,updated_at) SELECT ?,NULL,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM records WHERE user_id=? AND id=? AND kind=? AND version=? AND data=?)').bind(user,r.kind,json,r.version,timestamp,user,r.id,r.kind,r.version,json));
 }
 await env.DB.batch(statements);
 return Response.json({items:entries});
 }catch{return Response.json({error:'Le débrief n’a pas été enregistré. Vérifie ta connexion ; si une fiche a changé, recharge puis reprends la validation.'},{status:409})}
}
