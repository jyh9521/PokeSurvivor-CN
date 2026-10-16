const fs=require('fs'),vm=require('vm');
module.exports=function deviceFixture(pad){let now=1000,pauses=0;const attrs=new Map(),help={hidden:true,textContent:''},listeners={};const style={getPropertyValue:k=>attrs.get(k),setProperty:(k,v)=>attrs.set(k,v)};
const document={hidden:false,documentElement:{style},body:{dataset:{},appendChild(){}},querySelectorAll:()=>[],getElementById:()=>help,createElement:()=>help,addEventListener:(n,f)=>listeners[n]=f};
const G={Settings:{get:k=>({gamepad:true,rumble:true,padLayout:'auto',padBindings:{}}[k]),on(){}},Game:{state:'playing',togglePause:()=>pauses++},Haptics:{stop(){},supported:()=>false,status:{code:'idle'}},UIFocus:{top:()=>null,pages:()=>[]},SelectPopup:{element:null},Input:{bindings:{},moveBindings:{},inject(){}},I18n:{f:s=>s},T:s=>s,U:{norm:(x,y)=>{const n=Math.hypot(x,y)||1;return[x/n,y/n]}},Coop:{ping(){}},Dialog:{open:false}};
const navigator={getGamepads:()=>pad?[null,pad]:[]};const ctx=vm.createContext({G,document,navigator,window:{addEventListener:(n,f)=>listeners[n]=f},MutationObserver:class{observe(){}},performance:{now:()=>now},getComputedStyle:()=>({visibility:'visible'}),Event:class{},console,isSecureContext:true});
if(fs.existsSync('js/core/pad-device.js'))vm.runInContext(fs.readFileSync('js/core/pad-device.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('js/core/gamepad.js','utf8'),ctx);return{G,ctx,document,navigator,setPad:p=>pad=p,tick:()=>{now+=16;G.Gamepad.poll()},get pauses(){return pauses},listeners};
};
