const paths=[
"/prod/uploads/public/users/oHsVr21m-ekfFt6s-nYO1y8MsjQ4/mtvdc6iw-%E6%8A%A2%E7%AD%94%E7%8E%8B%E8%80%85/%E5%B1%8F%E5%B9%95%E6%88%AA%E5%9B%BE_10-9-2026_18031_.jpeg",
"/prod/uploads/public/users/oHsVr2781R5avdh9zljJ3zO2aYC0/mtmkvueb-%E7%A9%BA%E9%97%B4%E5%90%91%E9%87%8F%E6%95%B0%E9%87%8F%E7%A7%AF%20%C2%B7%20%E5%87%A0%E4%BD%95%E6%84%8F%E4%B9%89%E6%95%99%E5%AD%A6%E5%B7%A5%E5%85%B7/cover_1788503590413.png",
"/prod/uploads/public/users/oHsVr23ugeVVgfNXRt_-Mbl7Wg7U/mtgx0bka-%E5%87%BD%E6%95%B0%E5%9B%BE%E5%83%8F%E7%94%9F%E6%88%90%E5%99%A8/(Y7BLO843%7D%7D%24DA(OJR%5B%60DT4.png",
"/prod/uploads/public/users/oHsVr23ugeVVgfNXRt_-Mbl7Wg7U/mtcq16s4-%E6%95%B0%E5%AD%A6%E5%88%87%E8%B1%86%E8%85%90%E9%97%AE%E9%A2%98/LDRZ%5DPO4%246R%24S7L%7B%7BZ6%25I%24H.png"];
const UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36";
const variants=[
 ["plain",{}],
 ["ua",{"User-Agent":UA}],
 ["ua+ref",{"User-Agent":UA,Referer:"https://aifunengjiaoyu.com/"}],
 ["ua+ref+origin",{"User-Agent":UA,Referer:"https://aifunengjiaoyu.com/",Origin:"https://aifunengjiaoyu.com"}],
 ["ua+accept",{"User-Agent":UA,Referer:"https://aifunengjiaoyu.com/","Accept":"image/avif,image/webp,image/*,*/*;q=0.8"}],
];
for(const [name,h] of variants){
  const out=[];
  for(const p of paths){
    try{const r=await fetch("https://static.aifunengjiaoyu.com"+p,{headers:h});out.push(r.status);}
    catch(e){out.push("ERR "+e.message.slice(0,30));}
  }
  console.log(name.padEnd(16), out.join("  "));
}
