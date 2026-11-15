// Groups only the authorized server snapshots, never the current sale inventory.
export function organizeLibrary(result={}) {
  const entitlements=new Set((result.entitlements||[]).map(e=>e.productId));
  const products=(result.products||[]).filter(p=>p.kind!=='bundle'&&(p.owned||entitlements.has(p.id)));
  const byId=new Map(products.map(p=>[p.id,p])),grouped=new Set();
  const bundles=(result.bundles||[]).filter(b=>b.owned!==false).map(b=>{
    const items=(b.productIds||[]).map(id=>byId.get(id)).filter(Boolean);
    items.forEach(p=>grouped.add(p.id));return {...b,products:items};
  }).filter(b=>b.products.length);
  return {bundles,other:products.filter(p=>!grouped.has(p.id)),products};
}
