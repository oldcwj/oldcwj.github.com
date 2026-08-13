import { formatBytes } from "./core/file-detection.mjs";
import { bindFileDropZone, setDropZoneBusy } from "./core/tool-ui.mjs";

const input = document.querySelector("#strings-file-input");
const status = document.querySelector("#strings-status");
const panel = document.querySelector("#strings-results");
const list = document.querySelector("#strings-list");
const search = document.querySelector("#strings-search");
const minimum = document.querySelector("#strings-minimum");
let file = null;
let results = [];
let worker = null;
const drop=document.querySelector("#strings-drop-zone");
const cancel=document.querySelector("#strings-cancel");

function say(message, kind="working") { status.textContent=message;status.dataset.kind=kind;status.hidden=false; }
function filtered() { const query=search.value.toLowerCase();return query ? results.filter((item)=>item.value.toLowerCase().includes(query)) : results; }
function render() {
  const visible=filtered().slice(0,5000);
  list.textContent=visible.length ? visible.map((item)=>`${item.offset.toString(16).padStart(8,"0").toUpperCase()}  ${item.value}`).join("\n") : "No matching strings.";
  document.querySelector("#strings-count").textContent=`${filtered().length.toLocaleString()} result${filtered().length===1?"":"s"}${filtered().length>5000?" · showing first 5,000":""}`;
}
function scan() {
  if (!file) return;
  if (worker) worker.terminate();
  worker=new Worker("../assets/tools/js/workers/strings-worker.mjs",{type:"module"});results=[];panel.hidden=false;cancel.hidden=false;setDropZoneBusy(drop,true);say("Scanning locally… 0%");
  worker.addEventListener("message",(event)=>{
    if(event.data.type==="progress")say(`Scanning locally… ${event.data.value}%`);
    if(event.data.type==="done"){results=event.data.results;render();say(`Scan complete: ${results.length.toLocaleString()} strings${event.data.truncated?" (safety limit reached)":""}.`,"success");worker.terminate();worker=null;cancel.hidden=true;setDropZoneBusy(drop,false);}
    if(event.data.type==="error"){say(event.data.message,"error");worker.terminate();worker=null;cancel.hidden=true;setDropZoneBusy(drop,false);}
  });
  worker.postMessage({type:"scan",file,minimum:Number(minimum.value)});
}
function select(selected){if(!selected)return;file=selected;document.querySelector("#strings-file-name").textContent=`${file.name} · ${formatBytes(file.size)}`;scan();}
bindFileDropZone({dropZone:drop,input,chooseButton:document.querySelector("#strings-file-choose"),onFile:select});
cancel.addEventListener("click",()=>{if(!worker)return;worker.terminate();worker=null;cancel.hidden=true;setDropZoneBusy(drop,false);say("String scan cancelled.","error")});
minimum.addEventListener("change",scan);search.addEventListener("input",render);
document.querySelector("#strings-copy").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(filtered().map(i=>i.value).join("\n"));say("Visible filtered strings copied.","success")}catch{say("Copy is unavailable in this browser. Use Export TXT instead.","error")}});
document.querySelector("#strings-export").addEventListener("click",()=>{const blob=new Blob([filtered().map(i=>`0x${i.offset.toString(16).toUpperCase()}\t${i.value}`).join("\n")],{type:"text/plain"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`${file?.name||"file"}-strings.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)});
