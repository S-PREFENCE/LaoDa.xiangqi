// endgame_fen_test.js
// FEN 字符串解析 → pieces → 引擎开局合法性校验
(function () {
  require('./js/constants.js');
  require('./js/board.js');
  require('./js/rules.js');
  require('./js/endgames.js');
  try { require('./js/ai.js'); } catch (e) {}

  var XQ = globalThis.XQ;

  // FEN 字符映射（兼容 xqipu 混用约定）
  // 大写=红方, 小写=黑方
  // K=帅/将, R=车, H/N=马, C=炮, E/B=相/象, A=仕/士, P=兵/卒
  var CHAR2TYPE = {
    'K': 'K', 'k': 'K',
    'R': 'R', 'r': 'R',
    'H': 'H', 'h': 'H', 'N': 'H', 'n': 'H',
    'C': 'C', 'c': 'C',
    'E': 'E', 'e': 'E', 'B': 'E', 'b': 'E',
    'A': 'A', 'a': 'A',
    'P': 'P', 'p': 'P'
  };

  function parseFen(fen) {
    // 去掉 ' w' / ' b' / 空格 / 回车
    var body = fen.trim().split(/\s+/)[0];
    var rows = body.split('/');
    var pieces = [];
    for (var i = 0; i < rows.length && i < 10; i++) {
      var row = rows[i];
      var c = 0;
      for (var j = 0; j < row.length; j++) {
        var ch = row[j];
        if (/[0-9]/.test(ch)) {
          c += parseInt(ch, 10);
        } else {
          var type = CHAR2TYPE[ch];
          if (!type) throw new Error('未知字符: ' + ch);
          var side = (ch === ch.toUpperCase()) ? 'red' : 'black';
          pieces.push({ r: i, c: c, type: type, side: side });
          c++;
        }
      }
    }
    return pieces;
  }

  function buildBoard(pieces) {
    var grid = [];
    for (var r = 0; r < 10; r++) grid.push(new Array(9).fill(null));
    pieces.forEach(function (p) {
      grid[p.r][p.c] = { type: p.type, side: p.side };
    });
    return new XQ.Board(grid);
  }

  function findKing(b, side) {
    for (var r = 0; r < 10; r++) for (var c = 0; c < 9; c++) {
      var p = b.grid[r][c];
      if (p && p.type === 'K' && p.side === side) return { r: r, c: c };
    }
    return null;
  }
  function kingsFace(b) {
    var rk = findKing(b, 'red'), bk = findKing(b, 'black');
    if (!rk || !bk) return false;
    if (rk.c !== bk.c) return false;
    var lo = Math.min(rk.r, bk.r) + 1, hi = Math.max(rk.r, bk.r);
    for (var i = lo; i < hi; i++) if (b.grid[i][rk.c]) return false;
    return true;
  }

  // ==================== 测试数据 ====================
  var PUZZLES = [
    { id: 'hongyan', name: '心武·鸿雁来宾', fen: '2ck5/4P4/3r3P1/6C2/6C2/P1p3R2/9/B2p4R/4p4/3K2B2 w' },
    { id: 'duanqi', name: '烂柯·断汲禁樵', fen: '3k1aRPr/1R2n2n1/4bN3/3P2C2/9/9/9/4pC3/2r1p1p2/5K3 w' },
    { id: 'panhe', name: '渊深·磐河会战', fen: '3k1r3/1P2P4/b8/9/2bPp3C/6RRC/c1P3p2/2p6/4pcr2/2BK5 w' },
    { id: 'xushan', name: '烂柯·虚闪一枪', fen: '6b2/4a4/4ka3/2NP5/1Cb6/9/9/6p2/3pp4/5K3 w' },
    { id: 'youlu', name: '烂柯·诱鹿入蕉', fen: '4k3r/3P3P1/c1PaPa3/6RC1/6b2/9/9/3pp2p1/5K3 w' }
  ];

  var pass = 0, fail = 0;
  PUZZLES.forEach(function (P) {
    try {
      var pieces = parseFen(P.fen);
      var b = buildBoard(pieces);
      var kf = kingsFace(b);
      var rk = findKing(b, 'red'), bk = findKing(b, 'black');
      var kingOK = !!rk && !!bk;
      var moves = XQ.legalMoves(b, 'red');
      var inCheck = XQ.isInCheck(b, 'red');
      var ok = !kf && kingOK && moves.length > 0 && !inCheck;
      var row = '[' + P.id + '] ' + P.name
        + ' | 子数=' + pieces.length
        + ' kingsFace=' + kf
        + ' kingOK=' + kingOK
        + ' redMoves=' + moves.length
        + ' inCheck=' + inCheck
        + ' → ' + (ok ? 'PASS' : 'FAIL');
      console.log(row);
      if (ok) pass++; else fail++;
    } catch (e) {
      console.log('[' + P.id + '] ' + P.name + ' → ERROR: ' + e.message);
      fail++;
    }
  });

  console.log('\n=== ' + pass + '/' + (pass + fail) + ' PASS ===');
  process.exit(fail === 0 ? 0 : 1);
})();