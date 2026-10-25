import assert from 'node:assert/strict';

const origin = process.env.APP_URL || 'http://localhost:3000';
for (const path of ['/', '/how-it-works', '/privacy', '/auth', '/admin/login', '/robots.txt', '/sitemap.xml', '/opengraph-image']) {
  const response = await fetch(origin + path, { redirect: 'manual' });
  assert.equal(response.status, 200, `${path} should load`);
  if (path === '/opengraph-image') {
    assert.match(response.headers.get('content-type'), /image\/png/);
    console.log('PASS', path, 'PNG');
    continue;
  }
  const html = await response.text();
  assert.ok(!html.includes('Internal Server Error'), `${path} rendered without server errors`);
  if (['/', '/how-it-works', '/privacy'].includes(path)) {
    assert.match(html, /<h1[\s>]/, `${path} has server-rendered content`);
    assert.match(html, /rel="canonical"/, `${path} has a canonical URL`);
    assert.match(html, /<meta name="description"/, `${path} has a description`);
  }
  if (path === '/') {
    assert.match(html, /Shared faith/);
    const assets = [...html.matchAll(/href="([^"]+\.css[^\"]*)"/g)];
    assert.ok(assets.length, 'Tailwind CSS assets are included');
    for (const [,asset] of assets) {
      const css = await (await fetch(new URL(asset.replaceAll('&amp;','&'), origin))).text();
      assert.match(css, /grid-template-columns/, 'Layout utilities are compiled');
      assert.match(css, /--color-primary/, 'Configured brand tokens are compiled');
      assert.match(css, /\.bg-primary\b/, 'Named brand utilities are compiled');
      assert.match(css, /\.fixed/, 'Member utilities are compiled');
    }
  }
  if(path === '/auth') {
    assert.match(html, /name="robots" content="noindex, nofollow"/);
    assert.match(html, /name="email"/);
    assert.match(html, /name="password"/);
    assert.doesNotMatch(html, /ONE-CLICK|quickLogin|demoRole|groom@sukoon|bride@sukoon/);
    assert.doesNotMatch(html, /Admin demo|admin@example\.test/);
  }
  if(path === '/admin/login') assert.match(html, /Admin sign in/);
  if(path === '/sitemap.xml') assert.ok(!html.includes('/discover') && !html.includes('/admin'));
  console.log('PASS', path, html.length, 'bytes');
}
const shortcut = await fetch(origin + '/api/auth', {
  method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' },
  body: JSON.stringify({ demoRole: 'admin' }),
});
assert.equal(shortcut.status, 400, 'Role-only requests cannot sign in');
assert.equal(shortcut.headers.get('set-cookie'), null, 'No shortcut session is created');
console.log('PASS authentication requires credentials');
for(const path of ['/discover','/admin']) {
  const response = await fetch(origin+path,{redirect:'manual'});
  assert.ok([303,307,308].includes(response.status), `${path} redirects unauthenticated visitors`);
  assert.ok(response.headers.get('location')?.includes(path === '/admin' ? '/admin/login' : '/auth'));
  console.log('PASS',path,'protected');
}
