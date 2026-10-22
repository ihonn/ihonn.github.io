const $ = (id) => document.getElementById(id);

function say(text, isError = false) {
  $('msg').textContent = text;
  $('msg').classList.toggle('error', isError);
}

function button(label, onClick) {
  const b = document.createElement('button');
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

async function render() {
  const { packages, active } = await ASV.loadState();
  const list = $('list');
  list.replaceChildren();
  if (!packages.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'No packages yet.';
    list.append(li);
    return;
  }
  for (const pkg of packages) {
    const li = document.createElement('li');
    if (pkg.id === active?.id) li.className = 'active';
    const info = document.createElement('div');
    info.className = 'info';
    const title = document.createElement('strong');
    title.textContent = pkg.title;
    title.title = pkg.title;
    const meta = document.createElement('small');
    meta.textContent = `${pkg.scenes.length} scenes · ${ASV.FORMATS[pkg.format]} · ${pkg.status}`;
    info.append(title, meta);
    li.append(info);
    if (pkg.id !== active?.id) li.append(button('Use', () => ASV.setActive(pkg.id).then(render)));
    li.append(button('Delete', () => ASV.removePackage(pkg.id).then(render)));
    list.append(li);
  }
}

$('import').addEventListener('click', async () => {
  try {
    const pkg = ASV.parsePackage($('raw').value);
    await ASV.savePackage(pkg);
    $('raw').value = '';
    say(`Imported “${pkg.title}”. Open Pictory to fill it.`);
  } catch (err) {
    say(err.message, true);
  }
  render();
});

$('open').addEventListener('click', () => chrome.tabs.create({ url: 'https://app.pictory.ai/' }));

render();
