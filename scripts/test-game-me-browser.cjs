// Browser integration with real components/QueryClient and an in-memory API.
// No real auth, Firebase credentials, or external data are used.
// Requires Chrome at http://localhost:9348 (remote debugging).
const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')
const assert = require('node:assert/strict')
const ts = require('typescript')
const createLoader = require('./lib/load-project-ts.cjs')
const firestoreMock = require('./lib/progress-firestore-mock.cjs')
const root = path.resolve(__dirname, '..')
const output = path.join(root, 'node_modules/.cache/game-me-browser')
fs.mkdirSync(output, {recursive:true})

const virtual = {
  'next/link': `const React=require('react'); module.exports=function Link({href,children,prefetch,...props}) {return React.createElement('a',{...props,href,onClick:e=>{e.preventDefault();window.fixtureNavigate(href)}},children)}`,
  'next/navigation': `exports.usePathname=()=>window.fixturePath`,
  '@/components/auth/AuthProvider': `exports.useAuth=()=>({user:window.fixtureUser,loading:false})`,
  '@/components/games/profile/GameProfileProvider': `exports.useGameProfile=()=>({...window.fixtureUser,isLoading:false,error:null})`,
  '@/lib/auth/client-fetch': `exports.fetchWithAuthRetry=(url,options)=>fetch(url,{...options,headers:{'x-fixture-user':window.fixtureUser.id}})`,
}
const entry = `
const React=require('react'); const {createRoot}=require('react-dom/client');
const {QueryClient,QueryClientProvider}=require('@tanstack/react-query');
const Overview=require('@/app/game/me/page').default;
const Subject=require('@/components/game/me/SubjectProgressView').default;
const Sessions=require('@/components/game/me/SessionHistory').default;
const Navigation=require('@/components/game/me/MeNavigation').default;
const CacheSync=require('@/components/game/me/ProgressCacheSync').default;
window.fixtureUser={id:'child',displayName:'Bé kiểm thử',activeGrade:1,primaryGrade:1,activeGame:true};
window.fixturePath='/game/me'; window.fixtureClient=new QueryClient();
function App(){const [revision,setRevision]=React.useState(0);
 window.fixtureNavigate=p=>{window.fixturePath=p;setRevision(n=>n+1)};
 window.fixtureGrade=g=>{window.fixtureUser={...window.fixtureUser,activeGrade:g};setRevision(n=>n+1)};
 const route=window.fixturePath.split('/').at(-1);
 return React.createElement(QueryClientProvider,{client:window.fixtureClient},React.createElement(CacheSync),
  React.createElement('div',{className:'game-typography min-h-screen bg-slate-100'},React.createElement(Navigation),
   React.createElement('main',{className:'game-container py-7'},route==='me'?React.createElement(Overview):route==='session'?React.createElement(Sessions):React.createElement(Subject,{key:route,subjectId:route}))));
}
createRoot(document.getElementById('root')).render(React.createElement(App));
`

// Bundle CommonJS dependencies for the fixture without adding a production dependency.
const modules=[], ids=new Map()
function bundle(name, parent=path.join(root,'fixture.js')) {
  const filename = name==='__entry' || name in virtual ? name : name.startsWith('@/')
    ? resolveSource(path.join(root,'src',name.slice(2))) : require.resolve(name,{paths:[path.dirname(parent)]})
  if(ids.has(filename))return ids.get(filename)
  const id=modules.length; ids.set(filename,id); modules.push('')
  let source=filename==='__entry'?entry:virtual[filename]??fs.readFileSync(filename,'utf8')
  if(/\.tsx?$/.test(filename)) source=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText
  if(filename.endsWith('.json'))source='module.exports='+source
  source=source.replace(/require\((['"])([^'"]+)\1\)/g,(_,quote,dependency)=>`__require(${bundle(dependency,filename==='__entry'||filename in virtual?path.join(root,'fixture.js'):filename)})`)
  modules[id]=`function(module,exports,__require){${source}\n}`
  return id
}
function resolveSource(file) {
  for(const candidate of [file,file+'.ts',file+'.tsx',file+'.js'])if(fs.existsSync(candidate)&&fs.statSync(candidate).isFile())return candidate
  throw new Error('Missing module '+file)
}
// TypeScript relative imports need extension resolution while bundling.
const originalResolve=require.resolve
require.resolve=(name,options)=>{
  if(name.startsWith('.'))return resolveSource(path.resolve(options.paths[0],name))
  return originalResolve(name,options)
}
const entryId=bundle('__entry')
const script=`(()=>{const process={env:{NODE_ENV:'development'}};const modules=[${modules.join(',')}];const cache={};function __require(id){if(cache[id])return cache[id].exports;const module={exports:{}};cache[id]=module;modules[id](module,module.exports,__require);return module.exports;}__require(${entryId});})();`
const cssRoot=path.join(root,'.next/static/css')
const css=fs.existsSync(cssRoot)?fs.readdirSync(cssRoot).filter(file=>file.endsWith('.css')).map(file=>fs.readFileSync(path.join(cssRoot,file),'utf8')).join('\n'):''
const store=firestoreMock()
const now=store.firestore.Timestamp.fromMillis(1700000000000)
for(let index=0;index<25;index++)store.documents.set(`shopbebangcom/game/user_sessions/child/sessions/s${String(index).padStart(2,'0')}`,{
  gameId:'racing',lessonId:'toan-1-bai-1',score:90,totalQuestions:10,correctCount:9,wrongCount:1,duration:138000,completedAt:now,
  results:[{learningKey:'recognize-number-0',correct:true,expectedAnswer:0,selectedAnswer:0,attempt:1,responseTime:250}],
})
store.documents.set('shopbebangcom/game/learning_progress/child_toan-1-bai-1',{keys:{'recognize-number-0':{correct:1,wrong:0,attempts:1}}})
let requests=[]
const server=http.createServer(async(req,res)=>{
  if(req.url.startsWith('/api/game/me')){
    requests.push(req.url)
    if(req.url.includes('resource=goals'))await new Promise(resolve=>setTimeout(resolve,80))
    const load=createLoader({'firebase-admin/firestore':store.firestore,'@/lib/firebaseAdmin':{getAdminDb:()=>store.db},
      '@/lib/auth/current-user':{requireGameUser:async()=>({ok:true,user:{id:req.headers['x-fixture-user']||'child',activeGame:true}})}})
    const response=await load('src/app/api/game/me/route.ts').GET(new Request('http://localhost'+req.url))
    res.writeHead(response.status,{'Content-Type':'application/json'});res.end(await response.text());return
  }
  if(req.url==='/fixture.js'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end(script);return}
  if(req.url==='/fixture.css'){res.writeHead(200,{'Content-Type':'text/css'});res.end(css);return}
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end('<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"><body><div id="root"></div><script src="/fixture.js"></script></body></html>')
})

;(async()=>{
  await new Promise(resolve=>server.listen(3248,'127.0.0.1',resolve))
  const targets=await(await fetch('http://localhost:9348/json')).json()
  const ws=new WebSocket(targets.find(target=>target.type==='page').webSocketDebuggerUrl)
  await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}))
  let id=0;const pending=new Map(),errors=[]
  const cdp=(method,params={})=>new Promise((resolve,reject)=>{const requestId=++id;pending.set(requestId,{resolve,reject});ws.send(JSON.stringify({id:requestId,method,params}))})
  ws.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id){const task=pending.get(message.id);pending.delete(message.id);message.error?task.reject(message.error):task.resolve(message.result)}else if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description)})
  const evaluate=async expression=>{const result=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));return result.result.value}
  const wait=async expression=>{const deadline=Date.now()+15000;while(Date.now()<deadline){if(await evaluate(`Boolean(${expression})`))return;await new Promise(resolve=>setTimeout(resolve,100))}throw new Error(`Timed out: ${expression}; ${errors.join('\n')}`)}
  const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)
  try{
    await cdp('Page.enable');await cdp('Runtime.enable')
    await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true})
    await cdp('Page.navigate',{url:'http://127.0.0.1:3248'})
    await wait(`document.querySelector('main a[href="/game/me/toan"]')`)
    assert.equal(requests.length,0)
    await click('main a[href="/game/me/toan"]')
    await wait(`document.querySelector('[aria-controls="goals-toan-1-bai-1"]')`)
    assert.equal(requests.length,1);assert.equal(store.reads.length,1)
    await click('[aria-controls="goals-toan-1-bai-1"]')
    await wait(`document.querySelector('#goals-toan-1-bai-1').textContent.includes('Chưa đủ dữ liệu')`)
    assert.equal(requests.length,2)
    await click('[aria-controls="goals-toan-1-bai-1"]');await click('[aria-controls="goals-toan-1-bai-1"]')
    await new Promise(resolve=>setTimeout(resolve,200));assert.equal(requests.length,2)
    await click('[aria-controls="goals-toan-1-bai-2"]')
    await wait(`document.querySelector('#goals-toan-1-bai-2').textContent.includes('Mỗi lượt trả lời')`)
    assert.equal(requests.length,3)
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'),true)
    fs.writeFileSync(path.join(output,'subject-mobile.png'),Buffer.from((await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'))
    await evaluate('window.fixtureGrade(2)')
    await wait(`document.querySelector('main').textContent.includes('Chưa có cấu hình bài học Toán lớp 2')`)
    assert.ok(requests.at(-1).includes('grade=2'))
    await click('nav a[href="/game/me/session"]')
    await wait(`document.querySelectorAll('main article').length===20`)
    assert.equal(requests.filter(url=>url.includes('resource=session&')).length,0)
    await click('[aria-controls="session-s24"]')
    await wait(`document.querySelector('#session-s24 tbody tr')`)
    assert.equal(requests.filter(url=>url.includes('resource=session&')).length,1)
    await evaluate(`Array.from(document.querySelectorAll('button')).find(button=>button.textContent==='Xem thêm').click()`)
    await wait(`document.querySelectorAll('main article').length===25`)
    const listRequests=requests.filter(url=>url.includes('resource=sessions'))
    assert.equal(listRequests.length,2);assert.ok(listRequests[1].includes('cursor='))
    await cdp('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false})
    fs.writeFileSync(path.join(output,'sessions-desktop.png'),Buffer.from((await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'))
    assert.deepEqual(errors,[])
    console.log('PASS browser: overview 0 reads, subject 1, lazy goals/cache, grade isolation, 20+5 sessions, lazy details, mobile no overflow. Screenshots: '+output)
  }finally{ws.close();server.closeAllConnections();server.close()}
})().catch(error=>{console.error(error);server.closeAllConnections();server.close();process.exitCode=1})
