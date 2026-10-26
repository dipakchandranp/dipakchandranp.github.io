function o(c,n){let t=n;const r=new Set;return{getState:()=>t,dispatch(e){const s=c(t,e);s!==t&&(t=s,r.forEach(a=>a()))},subscribe(e){return r.add(e),()=>r.delete(e)}}}export{o as c};
