// Keep explicit catalogue, purchase and library destinations on refresh.
// A bare site entry still starts at home; lesson links and payment returns
// continue to retain their original destination.
export function prepareSiteEntry({location,history}) {
 const [page,id]=(location.hash.slice(1)||'works').split('/');
 const order=new URLSearchParams(location.search).get('order');
 const paymentReturn=!!order&&/^[a-zA-Z0-9_-]+$/.test(order);
 const browsing=['works','teachers','downloads','free','paid'].includes(page)||(page==='bundle'&&!id);
 if(browsing&&!paymentReturn)history.replaceState(null,'',`${location.pathname}${location.search}#works`);
 history.scrollRestoration='manual';
}
