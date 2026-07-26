require('./js/constants.js');
require('./js/board.js');
require('./js/rules.js');
require('./js/ai.js');
require('./js/audio.js');
require('./js/endgames.js');
var XQ = globalThis.XQ;

function play(L, maxPly, redDiff, blackDiff) {
  var b = new XQ.Board(XQ.buildEndgameBoard(L.pieces));
  var side = 'red';
  for (var p = 0; p < maxPly; p++) {
    var diff = side === 'red' ? redDiff : blackDiff;
    var r = XQ.aiBestMove(b, side, diff);
    if (!r) return { w: XQ.opponent(side), ply: p };
    b.move(r.move);
    var res = XQ.getResult(b, XQ.opponent(side));
    if (res.over) return { w: side, ply: p + 1 };
    side = XQ.opponent(side);
  }
  return { w: 'draw', ply: maxPly };
}

var L16 = XQ.ENDGAMES.filter(function (x) { return x.id === 16; })[0];
var a = play(L16, 140, 'hard', 'medium');
console.log('L16 红(hard) vs 黑(medium) 140步 →', a.w, '第', a.ply, '步');
var b2 = play(L16, 140, 'hard', 'hard');
console.log('L16 红(hard) vs 黑(hard)   140步 →', b2.w, '第', b2.ply, '步');
