/** Pure, shared train/serve lexical feature implementation. No network, labels or model weights. */
export const FEATURE_VERSION = 'url-lexical-v1';
const TLD_NAMES = ['com','net','org','edu','gov','io','co','xyz','top','site','online','ru','cn','br','in','uk','info','biz','app','dev'];
const TOKENS = ['login','signin','verify','account','secure','update','password','auth','bank','wallet','support','confirm'];
export const FEATURE_NAMES = [
  'url_length','hostname_length','domain_length','subdomain_length','subdomain_depth','path_length','query_length',
  'path_depth','query_parameters','digit_ratio_url','digit_ratio_host','entropy_url','entropy_host','percent_count',
  'hostname_dots','hostname_hyphens','hostname_underscores','at_symbols','longest_host_label','longest_token',
  'token_count','host_digit_runs','has_https_scheme','uses_ip_host','has_nondefault_port','punycode_host',
  'tld_length','path_dots','path_hyphens','path_underscores','query_equals','query_ampersands','double_slash_path',
  'url_digit_count','host_digit_count','path_digit_ratio','query_digit_ratio','hex_escape_ratio',
  ...TOKENS.map(x=>`token_${x}`), ...TLD_NAMES.map(x=>`tld_${x}`),
];
const count = (text, regex) => (text.match(regex) || []).length;
const ratio = text => count(text,/\d/g) / Math.max(1,text.length);
function entropy(text) {
  if (!text.length) return 0;
  const frequencies = new Map();
  for(const c of text) frequencies.set(c,(frequencies.get(c)||0)+1);
  let result=0; for(const n of frequencies.values()){const p=n/text.length;result-=p*Math.log2(p);}return result;
}
export function extractFeatures(input, registrableDomain) {
  if (typeof input!=='string' || input.length>4096) throw new Error('Invalid feature input');
  const url=new URL(input);
  if (!['http:','https:'].includes(url.protocol) || url.username || url.password) throw new Error('Unsupported feature URL');
  url.hash='';const full=url.href.toLowerCase(),host=url.hostname.toLowerCase().replace(/\.$/,''),path=url.pathname.toLowerCase(),query=url.search.toLowerCase();
  const domain=registrableDomain || host;
  if(typeof domain!=='string' || domain.length>253 || (registrableDomain && host!==domain && !host.endsWith(`.${domain}`))) throw new Error('Mismatched registrable domain');
  const sub=registrableDomain && host!==domain?host.slice(0,-domain.length-1):'';
  const tokens=full.split(/[^a-z0-9]+/).filter(Boolean),labels=host.split('.');
  const tld=labels.at(-1)||'';
  const v=[full.length,host.length,domain.length,sub.length,sub?sub.split('.').length:0,path.length,query.length,
    path.split('/').filter(Boolean).length,[...url.searchParams].length,ratio(full),ratio(host),entropy(full),entropy(host),count(full,/%/g),
    count(host,/\./g),count(host,/-/g),count(host,/_/g),count(full,/@/g),Math.max(0,...labels.map(x=>x.length)),Math.max(0,...tokens.map(x=>x.length)),
    tokens.length,count(host,/\d+/g),Number(url.protocol==='https:'),Number(/^\[[a-f0-9:]+\]$|^\d+(?:\.\d+){3}$/.test(host)),Number(Boolean(url.port)),Number(host.includes('xn--')),
    tld.length,count(path,/\./g),count(path,/-/g),count(path,/_/g),count(query,/=/g),count(query,/&/g),count(path,/\/\//g),
    count(full,/\d/g),count(host,/\d/g),ratio(path),ratio(query),count(full,/%[a-f0-9]{2}/g)/Math.max(1,full.length),
    ...TOKENS.map(token=>tokens.filter(x=>x===token).length),...TLD_NAMES.map(name=>Number(tld===name)),
  ];
  if(v.length!==FEATURE_NAMES.length || !v.every(Number.isFinite))throw new Error('Invalid feature vector');
  // XGBoost consumes float32. Explicit rounding keeps native and edge split comparisons aligned.
  return v.map(Math.fround);
}
