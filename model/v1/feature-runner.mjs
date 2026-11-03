import { createRequire } from 'node:module';
import { createInterface } from 'node:readline';
import { extractFeatures } from './features.mjs';
const require=createRequire(new URL('../backend-worker/package.json',import.meta.url));
const { parse }=require('tldts');
const ipaddr=require('ipaddr.js');
for await(const line of createInterface({input:process.stdin,crlfDelay:Infinity})){
  try{
    const row=JSON.parse(line),url=new URL(row.url);url.hash='';
    if(url.href.length>4096 || url.username || url.password || !['http:','https:'].includes(url.protocol))throw Error('URL');
    const host=url.hostname.toLowerCase().replace(/\.$/,'');url.hostname=host;
    const parsed=parse(host,{allowPrivateDomains:true}),domain=parsed.domain;
    const bare=host.replace(/^\[|\]$/g,''),isIp=ipaddr.isValid(bare);
    if(isIp){const address=ipaddr.process(bare);if(address.range()!=='unicast'||/^(?:192\.0\.0\.|192\.0\.2\.|198\.51\.100\.|203\.0\.113\.|192\.88\.99\.)/.test(address.toString()))throw Error('Private address');}
    else if(!domain||(!parsed.isIcann&&!parsed.isPrivate)||/(?:^|\.)(?:localhost|local|internal|invalid|test|onion)$/.test(host))throw Error('Domain');
    const canonical=url.href;
    process.stdout.write(`${JSON.stringify({url:canonical,domain:domain||host,label:row.label,date:row.date||null,source:row.source,features:extractFeatures(canonical,domain)})}\n`);
  }catch{process.stdout.write('null\n');}
}
