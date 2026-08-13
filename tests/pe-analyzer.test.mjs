import test from "node:test";
import assert from "node:assert/strict";
import { analyzePe } from "../assets/tools/js/core/pe-analyzer.mjs";
import { makePe32Fixture, makePe64Fixture } from "./helpers/pe-fixture.mjs";

test("parses PE32 overview, sections, imports and exports", async () => {
  const result=await analyzePe(new Blob([makePe32Fixture()]));
  assert.equal(result.kind,"EXE");assert.equal(result.format,"PE32");assert.equal(result.architecture,"x86");assert.equal(result.entryPoint,"0x00001000");assert.equal(result.imageBase,"0x00400000");assert.equal(result.subsystem,"Windows Console");
  assert.equal(result.sections.length,3);assert.equal(result.sections[0].name,".text");assert.equal(result.imports.length,1);assert.deepEqual(result.imports[0],{dll:"KERNEL32.dll",name:"CreateFileW",ordinal:null});assert.deepEqual(result.exports[0],{ordinal:1,name:"Exported",rva:"0x00001000"});
});

test("distinguishes DLL and detects CLR directory", async () => {
  const result=await analyzePe(new Blob([makePe32Fixture({dll:true,dotNet:true})]));
  assert.equal(result.kind,"DLL");assert.equal(result.isDotNet,true);
});

test("parses PE32+ x64 and ARM64 image bases", async () => {
  const x64=await analyzePe(new Blob([makePe64Fixture()]));
  assert.equal(x64.format,"PE32+");assert.equal(x64.architecture,"x64");assert.equal(x64.imageBase,"0x0000000140000000");assert.equal(x64.subsystem,"Windows GUI");
  const arm64=await analyzePe(new Blob([makePe64Fixture({machine:0xaa64})]));
  assert.equal(arm64.architecture,"ARM64");
});

test("rejects non-PE and out-of-range sections", async () => {
  await assert.rejects(()=>analyzePe(new Blob([new Uint8Array(64)])),/MZ header/);
  await assert.rejects(()=>analyzePe(new Blob([makePe32Fixture({malformedSection:true})])),/outside the file/);
});

test("rejects invalid PE header offsets and excessive section counts", async () => {
  const badOffset=makePe32Fixture();new DataView(badOffset.buffer).setUint32(0x3c,0xffffffff,true);
  await assert.rejects(()=>analyzePe(new Blob([badOffset])),/Invalid PE header offset/);
  const tooMany=makePe32Fixture();new DataView(tooMany.buffer).setUint16(0x80+6,97,true);
  await assert.rejects(()=>analyzePe(new Blob([tooMany])),/section count/);
});
