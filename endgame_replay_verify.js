/* endgame_replay_verify.js — 古谱「着法回放」交叉校验（最硬的审核手段）
 *
 * 原理：xqipu 棋谱页的「简介」字段是坐标串着法，每 4 字符一步：
 *   [fromCol][fromRow][toCol][toRow]，列 a..i 从左到右，行 0..9 从下到上。
 * 转引擎坐标：c = letter - 'a'，r = 9 - digit（引擎 r=0 为黑方底线）。
 *
 * 若古谱原解的每一步在本引擎规则下都合法，则说明：
 *   1) FEN 转录无误（错一个子，着法必然在某步非法）
 *   2) 本引擎的走法/将军/飞将规则与古谱一致
 * 这是比「AI 评分」强得多的正确性证据。
 */
require('./js/constants.js');
require('./js/board.js');
require('./js/rules.js');
require('./js/ai.js');
require('./js/audio.js');
require('./js/endgames.js');

var XQ = globalThis.XQ;

// 本轮网络检索所得：FEN + 古谱原解坐标串（均来自 xqipu 棋谱页）
var CASES = [
  // —— 橘中秘 ——
  { id: 'JZM-双马饮泉', name: '橘中秘·双马饮泉', result: '红先胜',
    fen: '4kab2/1N1Pa4/4b4/3N5/9/9/8n/9/4Ap3/3AK3c w',
    mv: 'b8d7i3g2d8d9e9d9d7b8d9e9d6c8e9d9c8e7d9e9e7g8e9f1g2f8i0e0' },

  // —— 梦入神机 ——
  { id: 'MRS-胶柱鼓瑟', name: '梦入神机·胶柱鼓瑟', result: '红先和',
    fen: '3k5/9/9/6p2/9/9/P8/C2A4B/6p1r/4K4 w',
    mv: 'a2a0g1g0i2g0g6g5g0i2d9d8a3a4d8d9a4a5d9d8a5b5d8d9b5c5i1d1a0d0d9d8c5d5d8d9d5d6d1c1d6d7c1d1d0a0d1b1a0c0b1c1c0d0c1d1d7c7d9d8c7c8d8d9c8b8d9d8' },
  { id: 'MRS-四面旋绕', name: '梦入神机·四面旋绕', result: '红先和',
    fen: 'r1b2a3/5k3/b2P5/9/2p4P1/9/9/1C6C/4K4/9 w',
    mv: 'b2f2c9e7f2f1f8e8d7e7e8d8f1f8a7c9i2i8d8d9e7d7a9a1e1e0c9e7d7d8d9e9e0f0a1a0f0f1f9e8d8e8e9f9i8i1a0f0f1e1f0f8e8f8f9f8' },
  { id: 'MRS-狐兔争穴', name: '梦入神机·狐兔争穴', result: '红先和',
    fen: '3k5/5P3/2P1c1N2/6n2/9/9/9/4B4/2ppA4/4KA3 w',
    mv: 'c7d7c1c0d7e7g6f4g7e6f4e6e7e8e6f8e8f8' },
  { id: 'MRS-翻藻掀萍', name: '梦入神机·翻藻掀萍', result: '红先胜',
    fen: '4kaR2/3Pa4/4b3b/2p1p4/1N3P3/9/5p3/4C4/3pp2r1/5KB2 w',
    mv: 'd8e8e9e8b5d6e8e9d6c8e9d9c8e7d9e9e7f9f3e3f9e7e9e8g9e9e8d8e7c6d8d7e9d9' },
  { id: 'MRS-寒雁偎卢', name: '梦入神机·寒雁偎卢', result: '红先胜',
    fen: '3ara3/8C/P2kb1N2/9/6b2/2N6/9/5A3/2pr1p3/R3K3c w',
    mv: 'c4e5d7d8e5c6d8d7g7e8f1f0e0f0e7c5e8c9' },

  // —— 竹香斋象戏谱 ——
  { id: 'ZXZ-云台霜戟', name: '竹香斋·云台霜戟', result: '红先和',
    fen: '1r1k2P2/4P4/c7b/c8/2b5p/7R1/2P4R1/6pCB/2prp4/5KC2 w',
    mv: 'h3d3a6d6d3d1b9b0g0b0c1d1h4a4i7g9a4a6d6b6a6a4b6d6b0b1g2f2a4f4f2f1f4f1e1f1b1f1d6f6f1g1g9i7h2h1a7f7f0e0f6e6h1d1i5i4d1d0f7e7e0f0e6e8f0f1' },
  { id: 'ZXZ-群真归洞', name: '竹香斋·群真归洞', result: '红先和',
    fen: '3n1k3/4P2r1/6P2/9/2r6/9/R8/3p2R2/1nc1p1p2/3K5 w',
    mv: 'g2f2c5f5f2f5d9f8e8f8h8f8f5f8f9f8a3f3f8e8f3e3e8d8e3e1b1c3d0e0d2d1e1e6d1d0e0e1g1f1e1f1c3d1e6e1c1e1f1e1' },
  { id: 'ZXZ-幽涧鸣泉', name: '竹香斋·幽涧鸣泉', result: '红先和',
    fen: '3rk4/P2n1PC2/5a3/9/9/2p6/3r5/B1pn2R2/2p4p1/3KCp3 w',
    mv: 'g2e2d3e3e2e3d2e4e0e4d9b9e4d4d8e6e3e6e9d9a8b8c2d2e6e1d2d1e1d1c1d1d0d1b9b8g8b8c4d4b8b1h1h0b1b0d9e9b0d0d4e4d0h0e4d4h0h6e9d9h6b6d9d8b6b0f0e0a2c0d8d7b0e0d7e7d1d0f7e8c0e2e7f7' },
  { id: 'ZXZ-霸桥飞絮', name: '竹香斋·霸桥飞絮', result: '红先和',
    fen: '3k5/4PP3/7P1/9/4N4/9/9/9/2pp1pp2/4K4 w',
    mv: 'e8d8d9e9f8e8e9f9e5f3f1e1f3e1c1c0e1f3c0d0e0f0d1e1e8e9f9f8d8e8f8e8f3e1d0e0f0e0g1f1' },
  { id: 'ZXZ-秀色钟南', name: '竹香斋·秀色钟南', result: '红先和',
    fen: '1rb1k4/5n1R1/4bR3/9/9/9/1r5pP/4p4/3pp4/2B2K3 w',
    mv: 'f7f8b3f3f8f3e1e0f0e0b9b0h8c8e7c5f3e3e9f9c8c9f9f8c9c5e2e1e3e1d1e1e0e1b0b1e1e0b1f1i3i4h3g3i4i5g3g2i5h5f1f4c5e5g2g1h5g5f4f0e0e1g1f1e1d1f0c0g5f5c0c4d1d2c4a4f5f6a4a2d2d1a2a6f6e6a6a1d1d2a1e1e5e1f1e1' },

  // —— 渊深海阔 ——
  { id: 'YSH-金台招士', name: '渊深海阔·金台招士', result: '红先和',
    fen: '3k1nb2/4PP3/1P2b4/p8/9/P1p3R2/4R1P2/2p1BA1p1/3r1p3/4K4 w',
    mv: 'g4d4d1d4f2e1c2c1e3f3f1e1e0e1h2g2e2c4d4d1e1e0d1d0e0e1c1d1e1f1g2g1f1f2d0f0f2e2f0f3f8f9f3f9b7c7f9f4c7c8f4d4e2f2g9i7g3g4d4d3c8d8d3d8e8d8d9d8' },
  { id: 'YSH-八虎征西', name: '渊深海阔·八虎征西', result: '红先和',
    fen: '4rk3/3P5/b3bPP2/9/9/N7C/9/4n3C/1c1p1r3/4K1R1R w',
    mv: 'i2f2f1f2i4f4e2f4f7f8f9f8g7g8f8f9g8f8f9f8d8e8e9e8g0g8f8f9i0i9e7g9g8e8f2e2e8e2f4e2i9g9f9f8a4c3e2g1g9g1b1g1c3d1' },
  { id: 'YSH-霸王卸甲', name: '渊深海阔·霸王卸甲', result: '红先和',
    fen: '1c3kb2/3PP4/4br3/4p1p2/7N1/9/9/6C2/1p2p4/3K5 w',
    mv: 'g2f2f7h7h5f4h7f7f4e6f7h7e6f4h7f7f4g6f7g7f2a2b9a9a2a8g7g8e8f8g8f8g6e7f8e8a8e8g9e7e8e1' },

  // —— 心武残编 ——
  { id: 'XWC-八轮共驾', name: '心武残编·八轮共驾', result: '红先和',
    fen: '5k1P1/2PPP4/b3b4/9/9/9/1r6R/Br6R/2ppAc3/4K1n1C w',
    mv: 'i2f2g0f2i3b3f1i1e0f0b2b3d8d9b3b9c8c9b9c9d9c9a7c9e1f2d1e1i0g0c1d1g0i0' },
  { id: 'XWC-炮打四门', name: '心武残编·炮打四门', result: '红先和',
    fen: 'c1b1ka2N/7C1/3ab2RR/9/1P7/9/9/9/4p4/1p1K5 w',
    mv: 'h7e7c9e7i9g8e9d9g8e7f9e8i7i9a9i9h8h0i9i0h0b0i0b0e7d5b0a0d5c7d9e9c7a6e8f7b5c5a0a3c5d5a3i3a6b8i3i8b8c6i8c8d5e5c8c9c6b8c9c8b8c6' },
  { id: 'XWC-笙磬同音', name: '心武残编·笙磬同音', result: '红先和',
    fen: '2n1k2P1/5P3/9/3c3P1/2b6/6B2/9/8R/2p1r4/3K1p2C w',
    mv: 'i2e2e9d9e2e1d6d1e1e9d9d8i0i8d8d7e9d9d7e7g4e2d1i1d9e9e7f7f8g8i1i0e2g0f0g0e9e0i0e0i8i7f7e7h6h7e7e8h7g7c9d7g7f7e8d8d0e0d7e5f7g7c1d1h9g9g0h0' },
  { id: 'XWC-隔断红尘', name: '心武残编·隔断红尘（诠改图）', result: '红先和',
    fen: '1r2kab2/3Pa4/4b2CN/6R2/8P/2B3B2/6C2/c8/3pcp3/4K4 w',
    mv: 'h7h0g9i7c4a2e1e5h0h9i7g9g6c6' },

  // —— 适情雅趣（本轮新增，均带坐标串）——
  { id: 'SQY-赤壁鏖战', name: '适情雅趣·赤壁鏖战（第317局）', result: '红先胜',
    fen: 'c2a1k3/3Pa4/n3b4/5P1CP/6b2/1rB6/9/9/3pp4/2B2K1R1 w',
    mv: 'f6f7e8f7h6f6f7e8f6f8f9e9h0h9e8f9f8i8e7g9h9g9d9e8i8i9e8f7g9g5f9e8g5g9e8f9d8e8e9e8g9g8e8e7i9i7f7e8g8g7e8f7g7f7e7e8f7f8e8e7i6h6' },
  { id: 'SQY-头辆舆轮', name: '适情雅趣·头辆舆轮（第063局）', result: '红先胜',
    fen: '3akarr1/1NC2P2C/9/9/R8/9/6p2/4B4/2n1p4/5K3 w',
    mv: 'f8e8d9e8a5a9e8d9c8h8f9e8a9d9e8d9b8d7' },
  { id: 'SQY-远交近攻', name: '适情雅趣·远交近攻（第046局）', result: '红先胜',
    fen: '3k5/4aN3/2R2a3/5n3/2R6/9/1pP6/B1n1BA1N1/1r2A1p2/c4K3 w',
    mv: 'c7c9d9d8c9c8d8d9c8e8b1b0e2c0b0c0e1d0c0d0e8e0' },
  { id: 'SQY-跃鲤吞饵', name: '适情雅趣·跃鲤吞饵（第263局）', result: '红先胜',
    fen: '6b2/1N1R5/5k3/9/9/9/9/4p4/2Rp1p2r/4K4 w',
    mv: 'c1c7g9e7c7e7f7e7b8c6e7f7c6e5f7e7e5g6e7f7d8f8' },
  { id: 'SQY-退思补过', name: '适情雅趣·退思补过（第325局）', result: '红先胜',
    fen: '5a3/2P1k4/r2Pba3/7C1/p7P/9/9/9/p3p3p/5K3 w',
    mv: 'h6e6e7c5c8d8e8e9d7e7f9e8e7e8e9f9d8d9a7a9d9e9a9e9e6e9c5e7e9d9i1h1d9d1e1d1f0f1' },
  { id: 'SQY-金鸡抱卵', name: '适情雅趣·金鸡抱卵（第310局）', result: '红先胜',
    fen: '3k1ab2/2R1aP3/2n1b3r/9/5R3/9/3r5/N3B4/4AC3/4K3c w',
    mv: 'f8e8f9e8c8e8c7e8f5f9d9d8f1f8' },

  // —— 橘中秘（双马饮泉源数据损坏，改用带坐标串的两道）——
  { id: 'JZM-车底兵胜车', name: '橘中秘·车底兵胜车（第037局）', result: '红先胜',
    fen: '2P2R3/4r4/3k5/9/9/9/9/9/5K3/9 w',
    mv: 'f1f0e8h8f9e9h8g8f0e0g8h8e9e5h8h0e0e1h0d0e5e9' },
  { id: 'JZM-炮兵胜双卒', name: '橘中秘·炮兵胜双卒（第088局）', result: '红先胜',
    fen: '3k5/9/9/6p2/9/4P4/9/7C1/5p3/4K4 w',
    mv: 'e4e5d9e9h2e2e9d9e5f5d9e9e0d0f1e1e2e7e9e8e7g7e8e9f5f6g6g5f6g6' },

  // —— 已入 git、本次补做回放校验 ——
  { id: 'GIT-磐河会战', name: '渊深海阔·磐河会战（第180局，已入库）', result: '红先和',
    fen: '3k1r3/1P2P4/b8/9/2bPp3C/6RRC/c1P3p2/2p6/4pcr2/2BK5 w',
    mv: 'i5i9f9i9g4g3f1f7g3g1a3a0c0a2f7d7h4d4d7d4g1e1i9i4e1e5i4i0d0d1c2c1d1d2i0d0d2e2d0e0e2d2e0e5d5e5a0e0e5f5e0i0b8c8i0i8c8d8i8d8e8d8d9d8' },

  // —— 本轮补做回放校验的 5 道「和」局（FEN 已与 xqipu 核对一致，补取 简介坐标串）——
  { id: 'LK-解甲归田', name: '烂柯神机·解甲归田（正和）', result: '红先和',
    fen: '1r3kcr1/3PP4/3Cb4/5PR2/9/6B2/9/3pB4/C1R1pp3/3K5 w',
    mv: 'e8f8f9e9g6g9h9g9c1c9b9c9f8e8e9f9a1f1e1f1f6f7g9g8d7d4d2d1d0d1f1e1d1d0e1d1d0d1c9c1d1d0c1f1d4e4e7c5e8f8g8f8f7f8f1f8e4c4f8d8d0e0d8d4c4c0f9e9g4i2d4e4i2g0' },
  { id: 'LK-继承先志', name: '烂柯神机·继承先志（正和）', result: '红先和',
    fen: '2N5P/3P1k3/2P2a3/6R2/3rCP3/2B6/9/3p5/3p1r3/4KCB2 w',
    mv: 'd8e8f7e8g6f6e8f7f6f7f8f7f5f6f7f8e5f5d5f5f0f5f1f5c9d7f8f9i9h9f5g5g0i2g5g1h9g9g1g9f6f7g9g8f7f8g8f8d7f8f9f8i2g0' },
  { id: 'LK-入后必穷', name: '烂柯神机·入后必穷（红胜/正和）', result: '红先和',
    fen: '3k5/4Pn1N1/7c1/7P1/7P1/9/9/8R/2nr1pp2/4K1BNC w',
    mv: 'i2i9f8h9i9h9h7h9i0i9h9h6h8f9h6h9f9h8h9h5h8f9h5h9f9g7h9h7g7h9' },
  { id: 'ZX-小鸿雁', name: '竹香斋·小鸿雁（二集，正和）', result: '红先和',
    fen: '2ck5/4P4/3r3P1/6C2/6C2/2p3R2/8R/B2p4B/4p4/3K5 w',
    mv: 'g6d6d7d6g5d5d6f6i3i9f6f9g4d4c4d4d5d2d4e4i9f9c9f9h7g7f9f3g7f7f3e3f7f8e3e8f8e8e4e3i2g0e3f3d2d8f3f2e8e9d9e9d8b8' },
  { id: 'ZX-小车马', name: '竹香斋·小车马（二集第027局，正和）', result: '红先和',
    fen: '3ak4/4a4/4b4/9/2P3NRR/9/4P4/4B4/1r1p1p3/4K4 w',
    mv: 'h5h9e7g9h9g9e8f9g5f7e9e8f7d6e8d8d6b7b1b7i5d5d8e8d5d1b7b0d1d0b0b1d0a0b1e1e0d0f1f0g9g0f0g0a0a8e8e9e2g0e1e3a8d8' },

  // —— 原 git 第 6-8 关（烂柯神机×3 + 心武残编），补取 xqipu 简介坐标串做严格回放校验 ——
  { id: 'GIT-断汲禁樵', name: '烂柯神机·断汲禁樵（红胜）', result: '红先胜',
    fen: '3k1aRPr/1R2n2n1/4bN3/3P2C2/9/9/9/4pC3/2r1p1p2/5K3 w',
    mv: 'b8d8d9d8d6d7d8d7f7e5d7d8f2f8d8d9g9f9h8f9g6g9f9d8g9i9' },
  { id: 'GIT-诱鹿入蕉', name: '烂柯神机·诱鹿入蕉（红胜）', result: '红先胜',
    fen: '4k3r/3P3P1/c1PaPa3/6RC1/6b2/9/9/9/3pp2p1/5K3 w',
    mv: 'g6g9i9g9h6e6d7e8e7e8e9f9d8d9e1e0f0f1h1g1f1f2g5e7d9e9' },
  { id: 'GIT-虚闪一枪', name: '烂柯神机·虚闪一枪（红胜）', result: '红先胜',
    fen: '6b2/4a4/4ka3/2NP5/1Cb6/9/9/6p2/3pp4/5K3 w',
    mv: 'd6e6e7d7b5a5c5a7a5g5e8f9g5g7f7e8e6e7' }
];

function parseMoves(s) {
  var out = [];
  for (var i = 0; i + 3 < s.length; i += 4) {
    out.push({
      from: { c: s.charCodeAt(i) - 97, r: 9 - (s.charCodeAt(i + 1) - 48) },
      to:   { c: s.charCodeAt(i + 2) - 97, r: 9 - (s.charCodeAt(i + 3) - 48) }
    });
  }
  return out;
}

function inList(moves, m) {
  for (var i = 0; i < moves.length; i++) {
    if (moves[i].from.r === m.from.r && moves[i].from.c === m.from.c &&
        moves[i].to.r === m.to.r && moves[i].to.c === m.to.c) return true;
  }
  return false;
}

var pass = [], fail = [];
console.log('=== 古谱原解回放校验（' + CASES.length + ' 道）===\n');

CASES.forEach(function (C) {
  var b, pieces;
  try {
    pieces = XQ.parseFen(C.fen);
    b = new XQ.Board(XQ.buildEndgameBoard(pieces));
  } catch (e) {
    console.log('[' + C.id + '] ✗ FEN 解析失败: ' + e.message);
    fail.push(C.id + '(FEN解析)');
    return;
  }

  var mvs = parseMoves(C.mv);
  var side = 'red';
  var badAt = -1, badWhy = '';

  for (var i = 0; i < mvs.length; i++) {
    var m = mvs[i];
    if (m.from.r < 0 || m.from.r > 9 || m.from.c < 0 || m.from.c > 8 ||
        m.to.r < 0 || m.to.r > 9 || m.to.c < 0 || m.to.c > 8) {
      badAt = i; badWhy = '坐标越界'; break;
    }
    var p = b.grid[m.from.r][m.from.c];
    if (!p) { badAt = i; badWhy = '起点无子'; break; }
    if (p.side !== side) { badAt = i; badWhy = '起点是' + p.side + '子，应为' + side; break; }
    if (!inList(XQ.legalMoves(b, side), m)) { badAt = i; badWhy = '非法着法(' + p.type + ')'; break; }
    b = XQ.applyMove(b, m);
    side = (side === 'red') ? 'black' : 'red';
  }

  var total = mvs.length;
  if (badAt < 0) {
    // 全部合法，看终局
    var endMoves = XQ.legalMoves(b, side).length;
    var mate = (endMoves === 0) ? (side === 'black' ? '黑方无着(红胜)' : '红方无着(红负)') : '未终结';
    console.log('[' + C.id + '] ✓ ' + C.name + ' | ' + C.result
      + ' | 子数=' + pieces.length + ' | 原解 ' + total + ' 步全部合法 | 终局: ' + mate);
    pass.push(C.id);
  } else {
    console.log('[' + C.id + '] ✗ ' + C.name + ' | ' + C.result
      + ' | 子数=' + pieces.length + ' | 第 ' + (badAt + 1) + '/' + total + ' 步失败: ' + badWhy);
    fail.push(C.id + '(第' + (badAt + 1) + '步)');
  }
});

console.log('\n=== 结论 ===');
console.log('通过: ' + pass.length + '/' + CASES.length);
if (fail.length) console.log('未通过: ' + fail.join(', '));
console.log(fail.length === 0
  ? '全部古谱原解可在本引擎完整重现 → FEN 与规则双向验证通过'
  : '存在未通过项，需逐个复核 FEN 或规则');
