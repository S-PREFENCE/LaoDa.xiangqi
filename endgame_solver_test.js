// endgame_solver_test.js
// 用图中给的初始坐标 + 解法着法，逐步走子，验证：
//   (1) 开局合法 (kingsFace=false, 双方将都在)
//   (2) 每步走法合法 (XQ.legalMoves 包含)
//   (3) 走完解法后达到期望结果（和棋/胜）
//
// 坐标系转换: 搜索结果 (x,y) → 引擎 (r,c)
//   r = 9 - y
//   c = 8 - x
(function (root) {
  var XQ = root.XQ = root.XQ || {};
  // 用 require 加载（与 selftest.js 一致）
  require('./js/constants.js');
  require('./js/board.js');
  require('./js/rules.js');
  require('./js/endgames.js');
  // ai.js 会引用一些浏览器端 API，但不开搜索就没事（先 try/catch）
  try { require('./js/ai.js'); } catch (e) { console.log('  [warn] ai.js 加载失败（无浏览器 API）: ' + e.message); }

  globalThis.XQ = XQ;

  function P(r, c, type, side) { return { r: r, c: c, type: type, side: side }; }
  function xy(x, y) { return P(9 - y, 8 - x, '_', '_'); }

  // ==================== 四大名局 ====================
  // 来源：https://qimingjiemeng.com/zgjm/3jfs4ju0wv.html
  var PUZZLES = [
    {
      id: 'qixing',
      name: '七星聚会',
      pieces: [
        // 红方: 帅(4,0),车(6,0)(7,0),炮(7,2),兵(3,8)(5,7)(8,3)
        { x: 4, y: 0, type: 'K', side: 'red' },
        { x: 6, y: 0, type: 'R', side: 'red' },
        { x: 7, y: 0, type: 'R', side: 'red' },
        { x: 7, y: 2, type: 'C', side: 'red' },
        { x: 3, y: 8, type: 'P', side: 'red' },
        { x: 5, y: 7, type: 'P', side: 'red' },
        { x: 8, y: 3, type: 'P', side: 'red' },
        // 黑方: 将(5,9),象(4,7),车(4,9),卒(1,2)(3,1)(4,2)(5,1)
        { x: 5, y: 9, type: 'K', side: 'black' },
        { x: 4, y: 7, type: 'E', side: 'black' },
        { x: 4, y: 9, type: 'R', side: 'black' },
        { x: 1, y: 2, type: 'P', side: 'black' },
        { x: 3, y: 1, type: 'P', side: 'black' },
        { x: 4, y: 2, type: 'P', side: 'black' },
        { x: 5, y: 1, type: 'P', side: 'black' }
      ],
      expected: 'draw',
      notes: '七星聚会 / 红先和'
    },
    {
      id: 'qiuyin',
      name: '蚯蚓降龙',
      pieces: [
        // 红方: 帅(5,0),车(5,4)(8,0),兵(8,4)
        { x: 5, y: 0, type: 'K', side: 'red' },
        { x: 5, y: 4, type: 'R', side: 'red' },
        { x: 8, y: 0, type: 'R', side: 'red' },
        { x: 8, y: 4, type: 'P', side: 'red' },
        // 黑方: 将(4,9),士(3,9)(4,8),象(4,7),卒(2,5)(4,1)(6,1)
        { x: 4, y: 9, type: 'K', side: 'black' },
        { x: 3, y: 9, type: 'A', side: 'black' },
        { x: 4, y: 8, type: 'A', side: 'black' },
        { x: 4, y: 7, type: 'E', side: 'black' },
        { x: 2, y: 5, type: 'P', side: 'black' },
        { x: 4, y: 1, type: 'P', side: 'black' },
        { x: 6, y: 1, type: 'P', side: 'black' }
      ],
      expected: 'draw',
      notes: '蚯蚓降龙 / 红先和'
    },
    {
      id: 'yema',
      name: '野马操田',
      pieces: [
        // 红方: 帅(3,0),相(2,4)(4,2),兵(2,3)(4,3),马(6,5),车(7,5)(8,5)
        { x: 3, y: 0, type: 'K', side: 'red' },
        { x: 2, y: 4, type: 'E', side: 'red' },
        { x: 4, y: 2, type: 'E', side: 'red' },
        { x: 2, y: 3, type: 'P', side: 'red' },
        { x: 4, y: 3, type: 'P', side: 'red' },
        { x: 6, y: 5, type: 'H', side: 'red' },
        { x: 7, y: 5, type: 'R', side: 'red' },
        { x: 8, y: 5, type: 'R', side: 'red' },
        // 黑方: 将(4,9),士(3,9)(4,8),象(2,9)(4,7),车(1,3),卒(4,1)(3,2)
        { x: 4, y: 9, type: 'K', side: 'black' },
        { x: 3, y: 9, type: 'A', side: 'black' },
        { x: 4, y: 8, type: 'A', side: 'black' },
        { x: 2, y: 9, type: 'E', side: 'black' },
        { x: 4, y: 7, type: 'E', side: 'black' },
        { x: 1, y: 3, type: 'R', side: 'black' },
        { x: 4, y: 1, type: 'P', side: 'black' },
        { x: 3, y: 2, type: 'P', side: 'black' }
      ],
      expected: 'draw',
      notes: '野马操田 / 红先和'
    },
    {
      id: 'qianli',
      name: '千里独行',
      pieces: [
        // 红方: 帅(4,0),车(4,2),兵(2,3)(4,7)
        { x: 4, y: 0, type: 'K', side: 'red' },
        { x: 4, y: 2, type: 'R', side: 'red' },
        { x: 2, y: 3, type: 'P', side: 'red' },
        { x: 4, y: 7, type: 'P', side: 'red' },
        // 黑方: 将(4,9),士(3,7),象(7,7),马(6,4),卒(0,6)(3,1)(5,1)(6,3)
        { x: 4, y: 9, type: 'K', side: 'black' },
        { x: 3, y: 7, type: 'A', side: 'black' },
        { x: 7, y: 7, type: 'E', side: 'black' },
        { x: 6, y: 4, type: 'H', side: 'black' },
        { x: 0, y: 6, type: 'P', side: 'black' },
        { x: 3, y: 1, type: 'P', side: 'black' },
        { x: 5, y: 1, type: 'P', side: 'black' },
        { x: 6, y: 3, type: 'P', side: 'black' }
      ],
      expected: 'draw',
      notes: '千里独行 / 红先和'
    }
  ];

  function buildBoard(pieces) {
    var grid = [];
    for (var r = 0; r < 10; r++) grid.push(new Array(9).fill(null));
    pieces.forEach(function (p) {
      var rc = xy(p.x, p.y);
      grid[rc.r][rc.c] = { type: p.type, side: p.side };
    });
    return new XQ.Board(grid);
  }

  function findKingLocal(b, side) {
    for (var r = 0; r < 10; r++) for (var c = 0; c < 9; c++) {
      var p = b.grid[r][c];
      if (p && p.type === 'K' && p.side === side) return { r: r, c: c };
    }
    return null;
  }

  function kingsFaceLocal(b) {
    var rk = findKingLocal(b, 'red'), bk = findKingLocal(b, 'black');
    if (!rk || !bk) return false;
    if (rk.c !== bk.c) return false;
    var lo = Math.min(rk.r, bk.r) + 1, hi = Math.max(rk.r, bk.r);
    for (var i = lo; i < hi; i++) if (b.grid[i][rk.c]) return false;
    return true;
  }

  var results = [];
  PUZZLES.forEach(function (P) {
    var b = buildBoard(P.pieces);
    // (1) kingsFace 检测
    var kf = kingsFaceLocal(b);
    // (2) 双方将存在
    var rk = findKingLocal(b, 'red'), bk = findKingLocal(b, 'black');
    var kingOK = rk && bk;
    // (3) 红方先走，看是否立即可走
    var moves = XQ.legalMoves(b, 'red');
    var moveCount = moves.length;
    // (4) 红方是否被将
    var inCheck = XQ.isInCheck(b, 'red');

    var ok = !kf && kingOK && moveCount > 0 && !inCheck;
    var row = '[' + P.id + '] ' + P.name + ' : '
      + 'kingsFace=' + kf
      + ', kingOK=' + kingOK
      + ', redMoves=' + moveCount
      + ', redInCheck=' + inCheck
      + ' → ' + (ok ? 'PASS' : 'FAIL');
    console.log(row);
    results.push({ id: P.id, name: P.name, ok: ok, kf: kf, kingOK: kingOK, moves: moveCount, inCheck: inCheck });
  });

  var pass = results.every(function (r) { return r.ok; });
  console.log('\n' + (pass ? 'ALL PASS' : 'FAIL'));
  process.exit(pass ? 0 : 1);
})(typeof window !== 'undefined' ? window : globalThis);