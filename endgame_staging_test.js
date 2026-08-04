/* endgame_staging_test.js — 待审批次（26 剩余中的第 1 批 10 道）严格审核
 * 不修改 js/endgames.js，不推送。仅用真实引擎 AI 校验：
 *   1) 开局合法性：将帅不照面(kingsFace=false)、双方将存在、红不被将、红有合法走法
 *   2) 根节点评分：红方大师搜索，必胜关(score>0)必须占优；求和关仅记录不卡
 * 更深的可解性（70 步短对弈）在并入 endgames.js 后由 endgame_verify.js 全量复核。
 */
require('./js/constants.js');
require('./js/board.js');
require('./js/rules.js');
require('./js/ai.js');
require('./js/audio.js');
require('./js/endgames.js');

var XQ = globalThis.XQ;

// 第 1 批（本轮网络检索 + 权威目录按真实局名匹配得到）
var STAGING = [
  // —— 适情雅趣（均 红先胜，redMustWin:true）——
  { id: 'SQ-神龟出洛',   name: '适情雅趣·神龟出洛', redMustWin: true,  fen: '3a1k3/1C7/c4a3/8N/3P5/9/8C/B8/r2pnpp2/4K1cRR w' },
  { id: 'SQ-羝羊触藩',   name: '适情雅趣·羝羊触藩', redMustWin: true,  fen: '1rbckaP2/3PaP1r1/1P2b4/1R7/Nn7/CRBp1n3/4C4/9/4p1p2/1c3K3 w' },
  { id: 'SQ-妙振兵铃',   name: '适情雅趣·妙振兵铃', redMustWin: true,  fen: 'r1b1k4/c1PPaRc2/r2ab3n/4C4/7RC/9/9/9/4p4/3K5 w' },
  { id: 'SQ-鹤鸣九皋',   name: '适情雅趣·鹤鸣九皋', redMustWin: true,  fen: '4k1b2/4a3n/1C1ab1R2/1NR6/2r1C4/9/9/4BA3/1n1p1p3/c1rAK1N2 w' },
  { id: 'SQ-忙里偷闲',   name: '适情雅趣·忙里偷闲', redMustWin: true,  fen: 'n1b1kaR2/4a1R2/3nbP3/p2Np4/9/9/4P4/C3C4/3pAp2r/4KAB1c w' },
  // —— 竹香斋（红先和，redMustWin:false）——
  { id: 'ZX-小鸿雁',     name: '竹香斋·小鸿雁',     redMustWin: false, fen: '2ck5/4P4/3r3P1/6C2/6C2/2p3R2/8R/B2p4B/4p4/3K5 w' },
  { id: 'ZX-小车马',     name: '竹香斋·小车马',     redMustWin: false, fen: '3ak4/4a4/4b4/9/2P3NRR/9/4P4/4B4/1r1p1p3/4K4 w' },
  // —— 烂柯神机（和/正和，redMustWin:false）——
  { id: 'LK-解甲归田',   name: '烂柯神机·解甲归田', redMustWin: false, fen: '1r3kcr1/3PP4/3Cb4/5PR2/9/6B2/9/3pB4/C1R1pp3/3K5 w' },
  { id: 'LK-继承先志',   name: '烂柯神机·继承先志', redMustWin: false, fen: '2N5P/3P1k3/2P2a3/6R2/3rCP3/2B6/9/3p5/3p1r3/4KCB2 w' },
  { id: 'LK-入后必穷',   name: '烂柯神机·入后必穷', redMustWin: false, fen: '3k5/4Pn1N1/7c1/7P1/7P1/9/9/8R/2nr1pp2/4K1BNC w' }
];

function kingsFace(b) {
  var rk = b.findKing('red'), bk = b.findKing('black');
  if (!rk || !bk) return 'no-king';
  if (rk.c !== bk.c) return false;
  for (var r = Math.min(rk.r, bk.r) + 1; r < Math.max(rk.r, bk.r); r++) {
    if (b.grid[r][rk.c]) return false;
  }
  return true;
}

var illegal = [], noAdvantage = [];
console.log('=== 待审批次：10 道（开局合法性 + 根节点评分）===\n');
STAGING.forEach(function (S) {
  S.pieces = XQ.parseFen(S.fen);
  var b = new XQ.Board(XQ.buildEndgameBoard(S.pieces));
  var kf = kingsFace(b);
  var inChk = XQ.isInCheck(b, 'red');
  var rMoves = XQ.legalMoves(b, 'red').length;
  var t0 = Date.now();
  var ai = XQ.aiBestMove(b, 'red', 'hard');
  var dt = Date.now() - t0;
  var score = ai ? ai.score : null;
  var mustWin = S.redMustWin !== false;
  var legal = (kf === false) && (inChk === false) && (rMoves > 0);

  console.log('[' + S.id + '] ' + S.name
    + '\n  子数=' + S.pieces.length
    + ' kingsFace=' + kf
    + ' inCheck=' + inChk
    + ' redMoves=' + rMoves
    + '\n  rootScore=' + score + ' (' + dt + 'ms)'
    + (mustWin ? ' [必胜关]' : ' [求和关]'));

  if (!legal) { illegal.push(S.id); return; }
  if (mustWin && (score === null || score <= 0)) noAdvantage.push(S.id);
});

console.log('\n=== 结论 ===');
console.log('开局非法: ' + (illegal.length ? illegal.join(', ') : '无 ✓'));
console.log('必胜关红方未显优势: ' + (noAdvantage.length ? noAdvantage.join(', ') : '无 ✓'));
var allOk = illegal.length === 0 && noAdvantage.length === 0;
console.log(allOk ? '全部通过严格审核（待你确认名称/出处后并入 endgames.js）' : '存在需修正项');
process.exit(allOk ? 0 : 1);
