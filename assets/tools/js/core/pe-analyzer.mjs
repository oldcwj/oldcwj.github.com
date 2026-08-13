const MAX_SECTIONS = 96;
const MAX_IMPORT_DESCRIPTORS = 1024;
const MAX_IMPORTS = 10_000;
const MAX_EXPORTS = 10_000;
const MAX_STRING_BYTES = 4096;
const decoder = new TextDecoder("utf-8", { fatal: false });

const machines = new Map([[0x014c,"x86"],[0x8664,"x64"],[0x01c0,"ARM"],[0x01c4,"ARMv7"],[0xaa64,"ARM64"]]);
const subsystems = new Map([[0,"Unknown"],[1,"Native"],[2,"Windows GUI"],[3,"Windows Console"],[5,"OS/2 Console"],[7,"POSIX Console"],[9,"Windows CE GUI"],[10,"EFI Application"],[11,"EFI Boot Service Driver"],[12,"EFI Runtime Driver"],[13,"EFI ROM"],[14,"Xbox"],[16,"Windows Boot Application"]]);

class BlobReader {
  constructor(blob) { this.blob = blob; this.size = blob.size; }
  async read(offset, length) {
    if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(length) || length < 0 || offset + length > this.size) throw new Error("PE structure points outside the file.");
    return new Uint8Array(await this.blob.slice(offset, offset + length).arrayBuffer());
  }
}

function view(bytes) { return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength); }
function u16(bytes, offset) { if (offset + 2 > bytes.length) throw new Error("Truncated PE structure."); return view(bytes).getUint16(offset, true); }
function u32(bytes, offset) { if (offset + 4 > bytes.length) throw new Error("Truncated PE structure."); return view(bytes).getUint32(offset, true); }
function u64(bytes, offset) { if (offset + 8 > bytes.length) throw new Error("Truncated PE structure."); const v=view(bytes); return (BigInt(v.getUint32(offset+4,true))<<32n)|BigInt(v.getUint32(offset,true)); }
function hex(value, width = 8) { return `0x${BigInt(value).toString(16).toUpperCase().padStart(width,"0")}`; }
function sectionName(bytes) { const end=bytes.indexOf(0); return decoder.decode(end<0?bytes:bytes.subarray(0,end)) || "(unnamed)"; }

function rvaToOffset(rva, sections, sizeOfHeaders) {
  if (!rva) return null;
  if (rva < sizeOfHeaders) return rva;
  for (const section of sections) {
    const span = Math.max(section.virtualSize, section.rawSize);
    if (rva >= section.virtualAddress && rva < section.virtualAddress + span) {
      const delta = rva - section.virtualAddress;
      if (delta >= section.rawSize) return null;
      return section.rawPointer + delta;
    }
  }
  return null;
}

async function readCString(reader, offset) {
  if (offset == null || offset < 0 || offset >= reader.size) return "";
  const bytes = await reader.read(offset, Math.min(MAX_STRING_BYTES, reader.size - offset));
  const end = bytes.indexOf(0);
  return decoder.decode(end < 0 ? bytes : bytes.subarray(0, end));
}

async function entropy(reader, section) {
  if (!section.rawSize || section.rawPointer >= reader.size) return 0;
  const counts = new Uint32Array(256);
  const size = Math.min(section.rawSize, reader.size - section.rawPointer);
  const chunkSize = 1024 * 1024;
  let total = 0;
  for (let offset = 0; offset < size; offset += chunkSize) {
    const chunk = await reader.read(section.rawPointer + offset, Math.min(chunkSize, size - offset));
    total += chunk.length;
    for (const byte of chunk) counts[byte]++;
  }
  let result = 0;
  for (const count of counts) if (count) { const p=count/total; result-=p*Math.log2(p); }
  return Number(result.toFixed(3));
}

async function parseImports(reader, directory, sections, sizeOfHeaders, is64) {
  const imports = [];
  const base = rvaToOffset(directory.rva, sections, sizeOfHeaders);
  if (base == null || directory.size < 20) return imports;
  const descriptorBytes = await reader.read(base, Math.min(directory.size, MAX_IMPORT_DESCRIPTORS * 20, reader.size - base));
  for (let index=0; index+20<=descriptorBytes.length && imports.length<MAX_IMPORTS; index+=20) {
    const originalFirstThunk=u32(descriptorBytes,index), nameRva=u32(descriptorBytes,index+12), firstThunk=u32(descriptorBytes,index+16);
    if (!originalFirstThunk && !nameRva && !firstThunk) break;
    const nameOffset=rvaToOffset(nameRva,sections,sizeOfHeaders);
    const dll=(await readCString(reader,nameOffset)).replace(/[^\x20-\x7e]/g,"�") || "(unnamed DLL)";
    const thunkRva=originalFirstThunk||firstThunk;
    const thunkOffset=rvaToOffset(thunkRva,sections,sizeOfHeaders);
    if (thunkOffset==null) continue;
    const width=is64?8:4;
    const maxBytes=Math.min(reader.size-thunkOffset,(MAX_IMPORTS-imports.length)*width);
    const thunkBytes=await reader.read(thunkOffset,maxBytes);
    for(let position=0;position+width<=thunkBytes.length;position+=width){
      const entry=is64?u64(thunkBytes,position):BigInt(u32(thunkBytes,position));
      if(entry===0n)break;
      const ordinalMask=is64?0x8000000000000000n:0x80000000n;
      if(entry&ordinalMask) imports.push({dll,name:null,ordinal:Number(entry&0xffffn)});
      else {
        const addressMask=is64?0x7fffffffffffffffn:0x7fffffffn;
        const address=entry&addressMask;
        const hintNameOffset=address<=0xffffffffn?rvaToOffset(Number(address),sections,sizeOfHeaders):null;
        const name=hintNameOffset==null?"(invalid name)":await readCString(reader,hintNameOffset+2);
        imports.push({dll,name:name||"(unnamed)",ordinal:null});
      }
      if(imports.length>=MAX_IMPORTS)break;
    }
  }
  return imports;
}

async function parseExports(reader, directory, sections, sizeOfHeaders) {
  const offset=rvaToOffset(directory.rva,sections,sizeOfHeaders);
  if(offset==null||directory.size<40)return [];
  const header=await reader.read(offset,40);
  const ordinalBase=u32(header,16),functionCount=Math.min(u32(header,20),MAX_EXPORTS),nameCount=Math.min(u32(header,24),MAX_EXPORTS);
  const functionsOffset=rvaToOffset(u32(header,28),sections,sizeOfHeaders),namesOffset=rvaToOffset(u32(header,32),sections,sizeOfHeaders),ordinalsOffset=rvaToOffset(u32(header,36),sections,sizeOfHeaders);
  if(functionsOffset==null)return [];
  const functions=await reader.read(functionsOffset,Math.min(functionCount*4,reader.size-functionsOffset));
  const named=new Map();
  if(namesOffset!=null&&ordinalsOffset!=null&&nameCount){
    const nameRvas=await reader.read(namesOffset,Math.min(nameCount*4,reader.size-namesOffset));
    const ordinals=await reader.read(ordinalsOffset,Math.min(nameCount*2,reader.size-ordinalsOffset));
    const count=Math.min(Math.floor(nameRvas.length/4),Math.floor(ordinals.length/2));
    for(let i=0;i<count;i++){
      const ordinalIndex=u16(ordinals,i*2),nameOffset=rvaToOffset(u32(nameRvas,i*4),sections,sizeOfHeaders);
      if(ordinalIndex<functionCount&&nameOffset!=null)named.set(ordinalIndex,await readCString(reader,nameOffset));
    }
  }
  const exports=[];
  for(let i=0;i<Math.floor(functions.length/4);i++){const rva=u32(functions,i*4);if(rva)exports.push({ordinal:ordinalBase+i,name:named.get(i)||null,rva:hex(rva)});}
  return exports;
}

export async function analyzePe(blob) {
  const reader=new BlobReader(blob);
  if(reader.size<64)throw new Error("File is too small to contain a PE header.");
  const dos=await reader.read(0,64);
  if(dos[0]!==0x4d||dos[1]!==0x5a)throw new Error("MZ header was not found.");
  const peOffset=u32(dos,0x3c);
  if(peOffset<64||peOffset+24>reader.size)throw new Error("Invalid PE header offset.");
  const coff=await reader.read(peOffset,24);
  if(coff[0]!==0x50||coff[1]!==0x45||coff[2]!==0||coff[3]!==0)throw new Error("PE signature was not found.");
  const machine=u16(coff,4),sectionCount=u16(coff,6),timestamp=u32(coff,8),optionalSize=u16(coff,20),characteristics=u16(coff,22);
  if(!sectionCount||sectionCount>MAX_SECTIONS)throw new Error(`Invalid or unsupported section count (${sectionCount}).`);
  if(optionalSize<96||peOffset+24+optionalSize+sectionCount*40>reader.size)throw new Error("Optional header or section table is truncated.");
  const optional=await reader.read(peOffset+24,optionalSize);
  const magic=u16(optional,0),is64=magic===0x20b;
  if(magic!==0x10b&&!is64)throw new Error(`Unsupported PE optional header magic ${hex(magic,4)}.`);
  const minimumOptionalSize=is64?112:96;
  if(optional.length<minimumOptionalSize)throw new Error("Optional header is too small for its PE format.");
  const entryPoint=u32(optional,16),imageBase=is64?u64(optional,24):BigInt(u32(optional,28)),sectionAlignment=u32(optional,32),fileAlignment=u32(optional,36),sizeOfImage=u32(optional,56),sizeOfHeaders=u32(optional,60),subsystem=u16(optional,68);
  const directoryCount=Math.min(u32(optional,is64?108:92),16),directoryStart=is64?112:96,directories=[];
  for(let i=0;i<directoryCount&&directoryStart+i*8+8<=optional.length;i++)directories.push({rva:u32(optional,directoryStart+i*8),size:u32(optional,directoryStart+i*8+4)});
  while(directories.length<16)directories.push({rva:0,size:0});
  const sectionBytes=await reader.read(peOffset+24+optionalSize,sectionCount*40),sections=[];
  for(let i=0;i<sectionCount;i++){
    const base=i*40,virtualSize=u32(sectionBytes,base+8),virtualAddress=u32(sectionBytes,base+12),rawSize=u32(sectionBytes,base+16),rawPointer=u32(sectionBytes,base+20),flags=u32(sectionBytes,base+36);
    if(rawSize&&rawPointer+rawSize>reader.size)throw new Error(`Section ${i+1} points outside the file.`);
    sections.push({name:sectionName(sectionBytes.subarray(base,base+8)),virtualAddress,virtualSize,rawSize,rawPointer,characteristics:hex(flags),executable:Boolean(flags&0x20000000),writable:Boolean(flags&0x80000000)});
  }
  for(const section of sections)section.entropy=await entropy(reader,section);
  const imports=await parseImports(reader,directories[1],sections,sizeOfHeaders,is64);
  const exports=await parseExports(reader,directories[0],sections,sizeOfHeaders);
  const highEntropy=sections.filter(section=>section.entropy>=7.2).map(section=>section.name),wx=sections.filter(section=>section.executable&&section.writable).map(section=>section.name);
  const timestampDate=timestamp?new Date(timestamp*1000):null,now=Date.now(),indicators=[];
  if(highEntropy.length)indicators.push({level:"notice",title:"High-entropy section",detail:`Sections: ${highEntropy.join(", ")}. Compressed or packed data is one possible explanation.`});
  if(wx.length)indicators.push({level:"warning",title:"Writable and executable section",detail:`Sections: ${wx.join(", ")}. This is unusual but not proof of malicious behavior.`});
  if(timestampDate&&(timestampDate.getTime()>now+86400000*2||timestampDate.getUTCFullYear()<1990))indicators.push({level:"notice",title:"Unusual linker timestamp",detail:"The timestamp is outside a typical modern build range and may be zeroed, forged, or produced by an unusual toolchain."});
  const securityEnd=BigInt(directories[4].rva)+BigInt(directories[4].size);
  const signed=Boolean(directories[4].size&&directories[4].rva&&securityEnd<=BigInt(reader.size));
  if(!signed)indicators.push({level:"neutral",title:"No valid Authenticode directory detected",detail:"The PE security directory is empty or invalid. This does not determine whether the file is safe."});
  return {kind:characteristics&0x2000?"DLL":"EXE",format:is64?"PE32+":"PE32",architecture:machines.get(machine)||`Unknown (${hex(machine,4)})`,machine:hex(machine,4),entryPoint:hex(entryPoint),imageBase:hex(imageBase,is64?16:8),subsystem:subsystems.get(subsystem)||`Unknown (${subsystem})`,timestamp,timestampText:timestampDate?timestampDate.toISOString():"Not set",sectionAlignment:hex(sectionAlignment),fileAlignment:hex(fileAlignment),sizeOfImage,sizeOfHeaders,sectionCount,characteristics:hex(characteristics,4),isDotNet:Boolean(directories[14].rva&&directories[14].size),signed,sections,imports,exports,indicators,truncated:{imports:imports.length>=MAX_IMPORTS,exports:exports.length>=MAX_EXPORTS}};
}
