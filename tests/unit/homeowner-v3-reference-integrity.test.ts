import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {test,expect} from 'vitest';

test('the supplied reference and integration instructions remain byte-for-byte unchanged',()=>{
  const manifest=JSON.parse(readFileSync('docs/design-v3-integration/pack/PACKAGE_MANIFEST.json','utf8'));
  for(const [name,expected] of Object.entries(manifest.files) as [string,{bytes:number;sha256:string}][]){
    const file=name.startsWith('design-v3/')?'docs/'+name:'docs/design-v3-integration/pack/'+name;
    const bytes=readFileSync(file);
    expect(bytes.length,file).toBe(expected.bytes);
    expect(createHash('sha256').update(bytes).digest('hex'),file).toBe(expected.sha256);
  }
});
