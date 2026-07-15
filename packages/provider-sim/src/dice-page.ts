// Página HTML autocontenida del juego Dice (la sirve el provider-sim y el
// casino la abre en un <iframe>, igual que un juego de Pragmatic/BGaming).
// `base` es el prefijo de las rutas de API (vacío como servidor propio;
// "/sim" cuando corre integrado dentro de la API del operador).
export function dicePage(token: string, base = ""): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Capri Dice</title>
<style>
  :root{--night:#080b14;--card:#141c30;--line:#202b49;--gold:#d4af37;--gold-b:#ecc960;
        --ink:#f2efe6;--soft:#b8bfd4;--mute:#7c86a3;--win:#3ddc97;--lose:#e5484d;--azure:#38b6da}
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--night);color:var(--ink);font:15px/1.5 system-ui,sans-serif;
       display:flex;justify-content:center;padding:16px;min-height:100vh}
  .game{width:100%;max-width:520px}
  .head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
  .brand{font-weight:700;letter-spacing:.18em;color:var(--gold-b);font-size:.85rem}
  .balance{background:rgba(212,175,55,.12);border:1px solid rgba(212,175,55,.35);
           border-radius:999px;padding:6px 14px;font-weight:600;color:var(--gold-b);font-size:.9rem}
  .panel{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:20px}
  .result{height:120px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px}
  .roll{font-size:3rem;font-weight:800;font-variant-numeric:tabular-nums;transition:color .2s}
  .roll.win{color:var(--win)} .roll.lose{color:var(--lose)}
  .verdict{font-size:.85rem;color:var(--mute);min-height:1.2em}
  .track{position:relative;height:10px;border-radius:999px;margin:18px 0 6px;
         background:linear-gradient(to right,var(--win) 0%,var(--win) var(--t,50%),#3a2430 var(--t,50%))}
  .marker{position:absolute;top:-7px;width:4px;height:24px;background:var(--ink);border-radius:2px;
          transform:translateX(-2px);transition:left .35s cubic-bezier(.2,.8,.3,1.2)}
  .labels{display:flex;justify-content:space-between;color:var(--mute);font-size:.7rem;margin-bottom:14px}
  label{display:block;color:var(--mute);font-size:.72rem;text-transform:uppercase;letter-spacing:.1em;margin:12px 0 5px}
  input[type=range]{width:100%;accent-color:var(--gold)}
  .row{display:flex;gap:10px}
  .row>div{flex:1}
  input[type=number]{width:100%;background:var(--night);border:1px solid var(--line);color:var(--ink);
        border-radius:10px;padding:10px 12px;font-size:1rem}
  .stat{background:var(--night);border:1px solid var(--line);border-radius:10px;padding:10px 12px}
  .stat b{display:block;font-size:1rem} .stat span{font-size:.68rem;color:var(--mute);text-transform:uppercase;letter-spacing:.08em}
  button{cursor:pointer;border:0;border-radius:999px;font-weight:700}
  .play{width:100%;margin-top:16px;padding:14px;background:var(--gold);color:#080b14;font-size:1.05rem;transition:transform .15s}
  .play:hover{background:var(--gold-b);transform:translateY(-1px)}
  .play:disabled{opacity:.5;cursor:wait;transform:none}
  .fair{margin-top:14px;border:1px dashed var(--line);border-radius:12px;padding:10px 12px;font-size:.7rem;color:var(--mute);word-break:break-all}
  .fair b{color:var(--azure)}
  .err{color:var(--lose);font-size:.8rem;min-height:1.2em;margin-top:8px;text-align:center}
</style>
</head>
<body>
<div class="game">
  <div class="head">
    <span class="brand">CAPRI DICE</span>
    <span class="balance" id="balance">…</span>
  </div>
  <div class="panel">
    <div class="result">
      <div class="roll" id="roll">—</div>
      <div class="verdict" id="verdict">Tira por debajo del objetivo para ganar</div>
    </div>
    <div class="track" id="track"><div class="marker" id="marker" style="left:50%"></div></div>
    <div class="labels"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>

    <label for="target">Objetivo: ganar si sale menos de <span id="targetLabel">50</span>.00</label>
    <input type="range" id="target" min="2" max="98" value="50">

    <div class="row" style="margin-top:12px">
      <div>
        <label for="amount">Apuesta (USD)</label>
        <input type="number" id="amount" min="1" step="1" value="10">
      </div>
      <div>
        <label>&nbsp;</label>
        <div class="stat"><b id="multi">1.98×</b><span>multiplicador</span></div>
      </div>
      <div>
        <label>&nbsp;</label>
        <div class="stat"><b id="chance">50%</b><span>probabilidad</span></div>
      </div>
    </div>

    <button class="play" id="play">Tirar el dado</button>
    <div class="err" id="err"></div>

    <div class="fair">
      <b>Provably fair</b> · hash de la semilla del servidor (publicado ANTES de tu apuesta):
      <div id="seedHash">…</div>
      <div style="margin-top:4px">semilla cliente: <span id="clientSeed">…</span> · nonce: <span id="nonce">0</span></div>
    </div>
  </div>
</div>
<script>
const token = ${JSON.stringify(token)};
const BASE = ${JSON.stringify(base)};
const $ = (id) => document.getElementById(id);
const fun = (c) => (c/100).toLocaleString('es-ES',{minimumFractionDigits:2}) + ' USD';

function syncTarget(){
  const t = Number($('target').value);
  $('targetLabel').textContent = t;
  $('multi').textContent = (Math.floor(99/t*100)/100).toFixed(2) + '×';
  $('chance').textContent = t + '%';
  $('track').style.setProperty('--t', t + '%');
}
$('target').addEventListener('input', syncTarget);
syncTarget();

async function state(){
  const r = await fetch(BASE + '/api/dice/state?token=' + encodeURIComponent(token));
  const s = await r.json();
  if (s.error){ $('err').textContent = s.error; return; }
  $('balance').textContent = fun(s.balance);
  $('seedHash').textContent = s.serverSeedHash;
  $('clientSeed').textContent = s.clientSeed;
  $('nonce').textContent = s.nonce;
}
state();

$('play').addEventListener('click', async () => {
  $('err').textContent = '';
  const amount = Math.round(Number($('amount').value) * 100);
  if (!amount || amount <= 0){ $('err').textContent = 'Apuesta inválida'; return; }
  $('play').disabled = true;
  try {
    const r = await fetch(BASE + '/api/dice/roll', {
      method:'POST', headers:{'content-type':'application/json'},
      body: JSON.stringify({ token, amount, target: Number($('target').value) })
    });
    const res = await r.json();
    if (res.error){ $('err').textContent = res.error; return; }
    const shown = (res.rollValue/100).toFixed(2);
    $('roll').textContent = shown;
    $('roll').className = 'roll ' + (res.win ? 'win':'lose');
    $('marker').style.left = (res.rollValue/100) + '%';
    $('verdict').textContent = res.win
      ? '¡Ganaste ' + fun(res.payout) + '!'
      : 'Perdiste ' + fun(amount) + '. Suerte en la próxima';
    $('balance').textContent = fun(res.balance);
    $('nonce').textContent = res.nonce;
  } catch {
    $('err').textContent = 'Error de conexión con el proveedor';
  } finally {
    $('play').disabled = false;
  }
});
</script>
</body>
</html>`;
}
