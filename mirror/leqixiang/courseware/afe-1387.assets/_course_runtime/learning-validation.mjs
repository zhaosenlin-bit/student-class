function validate(d){
  const fail=()=>{throw Error('教学记录格式无效，原有记录未覆盖。');};
  if(!d||d.version!==1||!Number.isInteger(d.analysisVersion)||d.analysisVersion<1||typeof d.reviewed!=='boolean')fail();
  if(!Array.isArray(d.segments)||!d.segments.length||d.segments.length>2000)fail();
  let end=0;const ids=new Set();
  for(const s of d.segments){if(!s||typeof s.id!=='string'||s.id.length>80||ids.has(s.id)||typeof s.name!=='string'||s.name.length>80||s.startBar!==end+1||!Number.isInteger(s.endBar)||s.endBar<s.startBar||s.endBar>2000)fail();end=s.endBar;ids.add(s.id);}
  for(const key of ['trackHands','noteHands']){if(!d[key]||Array.isArray(d[key])||typeof d[key]!=='object'||Object.keys(d[key]).length>20000)fail();for(const [id,h]of Object.entries(d[key]))if(id.length>100||!['left','right'].includes(h))fail();}
  if(!d.progress||typeof d.progress!=='object'||Array.isArray(d.progress)||Object.keys(d.progress).length>10000)fail();
  for(const [key,p]of Object.entries(d.progress)){if(key.length>160||!p||!Number.isInteger(p.cursor)||!Number.isInteger(p.total)||p.cursor<0||p.cursor>p.total||p.total>20000||typeof p.completed!=='boolean'||p.completed!==(p.cursor===p.total)||typeof p.updatedAt!=='string'||!Number.isFinite(Date.parse(p.updatedAt)))fail();}
  const p=d.preferences;
  if(d.harmony!==undefined){
    const h=d.harmony,qualities=['major','minor','dim','aug','dominant','maj7','min7','halfDim','dim7','sus2','sus4','sixth','min6','add9'],pitch=n=>Number.isInteger(n)&&n>=0&&n<12;
    if(!h||h.version!==1||typeof h.enabled!=='boolean'||!h.overrides||typeof h.overrides!=='object'||Array.isArray(h.overrides)||Object.keys(h.overrides).length>4000)fail();
    for(const [key,value]of Object.entries(h.overrides)){
      const match=/^bar-([1-9]\d{0,3})-[01]$/.exec(key);
      if(!match||Number(match[1])>end||!value||typeof value!=='object')fail();
      const c=value.chord;if(c!==null&&(!c||!pitch(c.root)||!qualities.includes(c.quality)||(c.bass!==undefined&&!pitch(c.bass))))fail();
    }
  }
  if(!p||!ids.has(p.segmentId)||!['left','right','both'].includes(p.hand)||![.25,.5,.75,1,1.25].includes(p.speed)||!['select','wait'].includes(p.inputMode)||typeof p.loop!=='boolean')fail();
  return d;
}

export {validate};
