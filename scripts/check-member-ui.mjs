import assert from 'node:assert/strict';

const origin = process.env.APP_URL || 'http://localhost:3000';
for (const role of ['member', 'admin']) {
  const email = `${role}@example.test`;
  const login = await fetch(origin + (role === 'admin' ? '/api/admin/auth' : '/api/auth'), {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'signin', email, password: 'SukoonDemo123!' }),
  });
  assert.equal(login.status, 200, 'Development demo login succeeds');
  const cookie = login.headers.get('set-cookie')?.split(';')[0];
  assert.ok(cookie);
  try {
    const response = await fetch(origin + '/api/app', { headers: { Cookie: cookie } });
    assert.equal(response.status, 200);
    const state = await response.json();
    assert.equal(state.account.email, email, 'The account belongs to the signed-in person');
    assert.equal(state.admin, role === 'admin', 'Navigation reflects real admin permission');
    const page = await fetch(origin + '/discover', { headers: { Cookie: cookie } });
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.ok(html.includes(state.me?.name || email), 'Sidebar renders the real account identity');
    assert.doesNotMatch(html, /Your preview profile|Explore preview|Fictional profiles|Sample profiles/);
    assert.match(html, /role="combobox"/, 'Custom filter controls render');
    assert.match(html, /Find your connection/);
    assert.match(html, /aria-controls="member-navigation" aria-expanded="false"/);
    assert.doesNotMatch(html, /<select/, 'Discovery no longer uses unstyled native dropdowns');
    if (!state.me) {
      assert.equal(state.matches.length, 0, 'Unregistered accounts do not receive sample matches');
      assert.equal(state.requests.length, 0, 'Unregistered accounts do not receive fake requests');
    }
    const asset = html.match(/href="([^\"]+\.css[^\"]*)"/)?.[1];
    assert.ok(asset);
    const css = await (await fetch(new URL(asset.replaceAll('&amp;', '&'), origin))).text();
    assert.match(css, /801px/, 'Desktop/mobile breakpoint compiles');
    assert.match(css, /translate-x-full/, 'Off-canvas mobile navigation utilities compile');
    console.log('PASS', role, 'identity, real account state, filter markup, responsive utilities');
  } finally {
    await fetch(origin + '/auth/signout', { method: 'POST', headers: { Cookie: cookie, Origin: origin }, redirect: 'manual' });
  }
}
