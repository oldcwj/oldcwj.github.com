function putAscii(bytes, offset, value, length = value.length) {
  for (let i=0;i<length;i++) bytes[offset+i]=i<value.length?value.charCodeAt(i):0;
}

function section(bytes, offset, name, virtualSize, virtualAddress, rawSize, rawPointer, characteristics) {
  const view=new DataView(bytes.buffer);putAscii(bytes,offset,name,8);view.setUint32(offset+8,virtualSize,true);view.setUint32(offset+12,virtualAddress,true);view.setUint32(offset+16,rawSize,true);view.setUint32(offset+20,rawPointer,true);view.setUint32(offset+36,characteristics,true);
}

export function makePe32Fixture({dll=false,dotNet=false,malformedSection=false}={}) {
  const bytes=new Uint8Array(0x800),view=new DataView(bytes.buffer),pe=0x80,optional=pe+24;
  bytes[0]=0x4d;bytes[1]=0x5a;view.setUint32(0x3c,pe,true);putAscii(bytes,pe,"PE\0\0");
  view.setUint16(pe+4,0x014c,true);view.setUint16(pe+6,3,true);view.setUint32(pe+8,1_700_000_000,true);view.setUint16(pe+20,0xe0,true);view.setUint16(pe+22,0x0102|(dll?0x2000:0),true);
  view.setUint16(optional,0x10b,true);view.setUint32(optional+16,0x1000,true);view.setUint32(optional+28,0x400000,true);view.setUint32(optional+32,0x1000,true);view.setUint32(optional+36,0x200,true);view.setUint32(optional+56,0x4000,true);view.setUint32(optional+60,0x200,true);view.setUint16(optional+68,3,true);view.setUint32(optional+92,16,true);
  view.setUint32(optional+96,0x3000,true);view.setUint32(optional+100,0x80,true);view.setUint32(optional+104,0x2000,true);view.setUint32(optional+108,0x40,true);
  if(dotNet){view.setUint32(optional+96+14*8,0x2100,true);view.setUint32(optional+100+14*8,0x48,true);}
  const table=optional+0xe0;
  section(bytes,table,".text",0x100,0x1000,0x200,malformedSection?0x900:0x200,0x60000020);
  section(bytes,table+40,".idata",0x200,0x2000,0x200,0x400,0xc0000040);
  section(bytes,table+80,".edata",0x200,0x3000,0x200,0x600,0x40000040);
  bytes.fill(0x90,0x200,0x300);
  view.setUint32(0x400,0x2050,true);view.setUint32(0x40c,0x2040,true);view.setUint32(0x410,0x2060,true);putAscii(bytes,0x440,"KERNEL32.dll\0");view.setUint32(0x450,0x2070,true);view.setUint32(0x460,0x2070,true);view.setUint16(0x470,7,true);putAscii(bytes,0x472,"CreateFileW\0");
  view.setUint32(0x610,1,true);view.setUint32(0x614,1,true);view.setUint32(0x618,1,true);view.setUint32(0x61c,0x3040,true);view.setUint32(0x620,0x3044,true);view.setUint32(0x624,0x3048,true);view.setUint32(0x640,0x1000,true);view.setUint32(0x644,0x3050,true);view.setUint16(0x648,0,true);putAscii(bytes,0x650,"Exported\0");
  return bytes;
}

export function makePe64Fixture({machine=0x8664}={}) {
  const bytes=new Uint8Array(0x400),view=new DataView(bytes.buffer),pe=0x80,optional=pe+24;
  bytes[0]=0x4d;bytes[1]=0x5a;view.setUint32(0x3c,pe,true);putAscii(bytes,pe,"PE\0\0");view.setUint16(pe+4,machine,true);view.setUint16(pe+6,1,true);view.setUint16(pe+20,0xf0,true);view.setUint16(pe+22,0x0022,true);
  view.setUint16(optional,0x20b,true);view.setUint32(optional+16,0x1000,true);view.setUint32(optional+24,0x40000000,true);view.setUint32(optional+28,0x00000001,true);view.setUint32(optional+32,0x1000,true);view.setUint32(optional+36,0x200,true);view.setUint32(optional+56,0x2000,true);view.setUint32(optional+60,0x200,true);view.setUint16(optional+68,2,true);view.setUint32(optional+108,16,true);
  section(bytes,optional+0xf0,".text",0x100,0x1000,0x200,0x200,0x60000020);bytes.fill(0x90,0x200,0x300);return bytes;
}
