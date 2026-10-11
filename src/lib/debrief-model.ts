export type RecordItem={id:string;kind:string;version:number;data:any};
export const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Paris'});
export const empty=()=>({client:'',contact:'',role:'',service:'',story:'',need:'',budget:'',skills:'',opportunityId:'',stage:'À qualifier',evidence:'',action:'',owner:'Moi',due:'',candidate:'',candidateRole:'',candidateSkills:'',availability:'',consultant:'',consultantRole:'',hotTopic:''});
export type Exchange=ReturnType<typeof empty>;
const norm=(s:string)=>s.trim().toLocaleLowerCase('fr');
const combine=(a:string,b:string)=>Array.from(new Map([...(a||'').split(','),...(b||'').split(',')].map(s=>[norm(s),s.trim()])).values()).filter(Boolean).join(', ');

function newId(){if(typeof crypto.randomUUID==='function')return crypto.randomUUID();const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;}

export function dateAnswer(value:string){
 const v=norm(value),base=today();
 if(v==='aujourd’hui'||v==="aujourd'hui")return base;
 if(v==='demain'){const d=new Date(base+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10)}
 const m=v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
 const iso=m?`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:v;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(iso))return '';
 const d=new Date(iso+'T12:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===iso?iso:'';
}

// Limited, explicit extraction. These suggestions are always shown before validation.
// No inference about deal probability, trust, or an unmentioned person's identity.
export function extractFacts(text:string,items:RecordItem[],current:Exchange){
 const facts:Partial<Exchange>={};
 const fields:Record<string,keyof Exchange>={'client':'client','compte':'client','interlocuteur':'contact','contact':'contact','fonction':'role','service':'service','besoin':'need','budget':'budget','tjm':'budget','compétences':'skills','technologies':'skills','prochaine action':'action','action':'action','responsable':'owner','échéance':'due','date de relance':'due','candidat':'candidate','consultant':'consultant','disponibilité':'availability','poste':'candidateRole'};
 const keys=Object.keys(fields).sort((a,b)=>b.length-a.length).join('|');
 const regex=new RegExp(`(?:^|[.;\\n]\\s*)(${keys})\\s*:\\s*([^;\\n]+?)(?=\\.\\s+[A-ZÀ-Ü]|[;\\n]|$)`,'gimu');
 for(const match of text.matchAll(regex)){const key=fields[norm(match[1])],value=match[2].trim().replace(/\.$/,'');if(value&&!current[key]){if(key==='due'){const date=dateAnswer(value);if(date)facts.due=date;}else facts[key]=value;}}
 const mentions=(kind:string)=>items.filter(i=>i.kind===kind&&i.data.name&&norm(text).includes(norm(i.data.name)));
 const accounts=mentions('account');if(!current.client&&!facts.client&&accounts.length===1)facts.client=accounts[0].data.name;
 const client=current.client||facts.client;
 const account=items.find(i=>i.kind==='account'&&norm(i.data.name||'')===norm(client||''));
 const contacts=mentions('contact').filter(i=>account&&i.data.accountId===account.id);
 if(!current.contact&&!facts.contact&&contacts.length===1)facts.contact=contacts[0].data.name;
 const rate=text.match(/\bTJM\s*(?:de|à|:)?\s*(\d[\d\s]*(?:[,.]\d+)?)\s*(?:€|euros?)/i);
 if(!current.budget&&!facts.budget&&rate)facts.budget=rate[0];
 return facts;
}

export function buildPlan(exchanges:Exchange[],items:RecordItem[]){
 const out=new Map<string,RecordItem>(),original=new Map(items.map(i=>[i.id,i]));
 const all=()=>Array.from(new Map([...items,...out.values()].map(i=>[i.id,i])).values());
 const find=(kind:string,name:string,extra:(i:RecordItem)=>boolean=()=>true)=>all().find(i=>i.kind===kind&&norm(i.data.name||'')===norm(name)&&extra(i));
 const create=(kind:string,data:any)=>{const r={id:newId(),kind,version:1,data};out.set(r.id,r);return r};
 const update=(old:RecordItem,patch:any)=>{const data={...(out.get(old.id)||old).data,...patch};const base=original.get(old.id);const r={...old,data,version:base?base.version+1:1};if(JSON.stringify(base?.data)!==JSON.stringify(data))out.set(r.id,r);return r;};
 for(const e of exchanges){
  let account:RecordItem|undefined;
  if(e.client.trim()){
   const old=find('account',e.client);
   account=old?update(old,{lastContact:today(),...(e.due?{nextContact:e.due}:{}),...(e.skills?{technologies:combine(old.data.technologies,e.skills)}:{})}):create('account',{name:e.client.trim(),sector:'À préciser',status:'Prospect',technologies:e.skills,positioning:e.need,lastContact:today(),nextContact:e.due,cadence:30});
  }
  let contact:RecordItem|undefined,candidate:RecordItem|undefined,consultant:RecordItem|undefined,opportunity:RecordItem|undefined,task:RecordItem|undefined,topic:RecordItem|undefined;
  if(e.contact.trim()){
   const old=find('contact',e.contact,i=>i.data.accountId===(account?.id||''));
   contact=old?update(old,{...(e.role?{role:e.role}:{}),...(e.service?{service:e.service}:{})}):create('contact',{name:e.contact.trim(),role:e.role||'À préciser',service:e.service,accountId:account?.id||'',influence:'À qualifier',managerId:''});
  }
  if(e.candidate.trim()){
   const old=find('candidate',e.candidate);
   candidate=old?update(old,{...(e.candidateRole?{role:e.candidateRole}:{}),...(e.candidateSkills?{skills:combine(old.data.skills,e.candidateSkills)}:{}),...(e.availability?{availability:e.availability}:{})}):create('candidate',{name:e.candidate.trim(),role:e.candidateRole||'À préciser',reference:'T-'+newId().slice(0,6),status:'À qualifier',skills:e.candidateSkills,summary:e.story,experience:'',education:'',availability:e.availability||'À préciser',cvRequired:true,avatar:'🧑‍💻'});
  }
  if(e.consultant.trim()){
   const old=find('consultant',e.consultant);
   consultant=old?update(old,{...(e.consultantRole?{role:e.consultantRole}:{}),...(e.client?{client:e.client,accountId:account?.id}:{}),...(e.due?{followUp:e.due}:{})}):create('consultant',{name:e.consultant.trim(),role:e.consultantRole||'À préciser',client:e.client,accountId:account?.id||'',status:'À venir',skills:'',tjm:0,cost:0,followUp:e.due,birth:'',avatar:'🧑‍🚀'});
  }
  if(e.need.trim()){
   const old=all().find(i=>i.kind==='opportunity'&&(e.opportunityId?i.id===e.opportunityId:norm(i.data.title||'')===norm(e.need)&&norm(i.data.client||'')===norm(e.client)));
   const data={title:e.need,client:e.client,accountId:account?.id||'',contactId:contact?.id||old?.data.contactId||'',stage:e.stage,brief:e.story||old?.data.brief||'',requirements:e.skills?combine((old?.data.requirements||[]).join(', '),e.skills).split(', '):old?.data.requirements||[],budgetNote:e.budget||old?.data.budgetNote||'À confirmer',stageEvidence:e.evidence||old?.data.stageEvidence||'',amount:old?.data.amount||0};
   opportunity=old?update(old,data):create('opportunity',data);
  }
  const activityId=newId();
  if(e.action.trim())task=create('task',{title:e.action,category:'Compte rendu',priority:e.hotTopic?'Haute':'Normale',status:'À faire',due:e.due,owner:e.owner,accountId:account?.id||'',contactId:contact?.id||'',opportunityId:opportunity?.id||'',candidateId:candidate?.id||'',consultantId:consultant?.id||'',client:e.client,sourceActivityId:activityId});
  if(e.hotTopic.trim())topic=create('topic',{title:e.hotTopic,client:e.client,accountId:account?.id||'',status:'Ouvert',priority:'Haute',urgency:'À surveiller',next:e.action,steps:[e.action||'Définir la prochaine action'],done:0,nextStep:e.action,due:e.due,notes:e.story,taskId:task?.id||''});
  const missing=[e.client&&!e.contact&&'Interlocuteur à préciser',e.contact&&!e.role&&'Fonction à préciser',e.contact&&!e.service&&'Service à préciser',e.need&&!e.budget&&'Budget à confirmer',e.need&&!e.skills&&'Compétences du besoin à préciser',!e.action&&'Prochaine action à définir',e.action&&!e.due&&'Date de relance à préciser',candidate?.data.cvRequired&&'CV à ajouter',e.consultant&&!e.consultantRole&&'Expertise du consultant à préciser'].filter(Boolean);
  const links=[e.contact&&e.client&&e.client+' ↔ '+e.contact,e.need&&e.client&&e.client+' ↔ '+e.need,e.consultant&&e.client&&e.client+' ↔ '+e.consultant,e.candidate&&e.need&&e.candidate+' ↔ '+e.need,e.action&&(e.client||e.candidate||e.consultant)&&(e.client||e.candidate||e.consultant)+' → '+e.action].filter(Boolean);
  out.set(activityId,{id:activityId,kind:'activity',version:1,data:{title:'Débrief · '+(e.client||e.candidate||e.consultant||'Ma journée'),text:e.story,source:'Débrief guidé',createdAt:new Date().toISOString(),accounts:e.client?[e.client]:[],consultants:e.consultant?[e.consultant]:[],candidates:e.candidate?[e.candidate]:[],opportunities:e.need?[e.need]:[],actions:e.action?[e.action]:[],relatedIds:[account,contact,candidate,consultant,opportunity,task,topic].filter(Boolean).map(r=>r!.id),links,missing,qualityChecked:missing.length===0,completeness:Math.max(0,100-missing.length*12),tone:e.hotTopic?'À surveiller':'Neutre',details:e}});
 }
 return Array.from(out.values());
}

export function gameProgress(items:RecordItem[]){
 const activities=items.filter(i=>i.kind==='activity'),count=(kind:string)=>items.filter(i=>i.kind===kind).length;
 const links=new Set(activities.flatMap(i=>i.data.links||[])).size;
 const actions=activities.reduce((n,i)=>n+(i.data.actions?.length||0),0);
 const completed=items.filter(i=>i.kind==='task'&&i.data.status==='Terminé').length;
 const opportunities=items.filter(i=>i.kind==='opportunity'&&i.data.stage!=='Perdu').length;
 const xp=activities.length*120+actions*25+completed*45+count('meeting')*15+opportunities*45+count('candidate')*30+links*20;
 const level=Math.floor(xp/300)+1;
 return {xp,level,next:level*300,into:xp%300};
}
