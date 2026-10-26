import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const project=fileURLToPath(new URL('../',import.meta.url));
const dist=resolve(project,'dist');
let html=await readFile(resolve(dist,'index.html'),'utf8');
const script=[...html.matchAll(/<script[^>]+src="([^"]+)"[^>]*><\/script>/g)];
for(const match of script){
  const code=await readFile(resolve(dist,match[1].replace(/^\//,'')),'utf8');
  html=html.replace(match[0],()=>`<script type="module">\n${code.replace(/<\/script/gi,'<\\/script')}\n</script>`);
}
const styles=[...html.matchAll(/<link[^>]+href="([^"]+\.css)"[^>]*>/g)];
for(const match of styles){
  const css=await readFile(resolve(dist,match[1].replace(/^\//,'')),'utf8');
  html=html.replace(match[0],()=>`<style>\n${css}\n</style>`);
}
const outsideScripts=html.replace(/<script\b[\s\S]*?<\/script>/gi,'');
if(/<link[^>]+href=/.test(outsideScripts))throw new Error('Standalone game still contains external references.');
await writeFile(resolve(project,'玄刃-即点即玩.html'),html);
console.log('离线游戏已打包：玄刃-即点即玩.html');
