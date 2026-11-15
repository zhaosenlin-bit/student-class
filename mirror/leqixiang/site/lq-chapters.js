export function libraryChapters(products=[],fixedChapters=[]){
 const available=new Set(products.map(p=>p.id)),covered=new Set(),chapters=[];
 for(const chapter of fixedChapters){
  const ids=[...new Set((chapter.topics||[]).flatMap(topic=>topic.courseIds||[]))].filter(id=>available.has(id));
  if(!ids.length)continue;
  ids.forEach(id=>covered.add(id));
  chapters.push({id:`fixed-${chapter.id}`,subject:'物理',domain:chapter.domain||'初中',title:chapter.title,ids});
 }
 const derived=new Map();
 for(const product of products){
  if(covered.has(product.id))continue;
  const subject=product.subject||'其他';
  const mappings=product.taxonomy?.length?product.taxonomy:[{domain:(product.stages||[]).join('、')||subject,chapter:product.title}];
  for(const mapping of mappings){
   const domain=mapping.domain||subject,title=mapping.chapter||product.title,key=`${subject}|${domain}|${title}`;
   if(!derived.has(key))derived.set(key,{id:`taxonomy-${key}`,subject,domain,title,ids:[]});
   const item=derived.get(key);if(!item.ids.includes(product.id))item.ids.push(product.id);
  }
 }
 return chapters.concat([...derived.values()]);
}
