require('./js/constants.js');
require('./js/board.js');
require('./js/rules.js');
require('./js/ai.js');
require('./js/audio.js');
require('./js/endgames.js');
var XQ = globalThis.XQ;
function P(r,c,t,s){return {r:r,c:c,type:t,side:s};}

var candidates = {
  'L1-B rook+pawn vs K+1A': [P(9,3,'K','red'),P(5,0,'R','red'),P(6,4,'P','red'),P(0,4,'K','black'),P(0,3,'A','black')],
  'L1-C rook vs K+1A (no pawn)': [P(9,3,'K','red'),P(5,0,'R','red'),P(0,4,'K','black'),P(0,3,'A','black')],
  'L14-X 2H+pawn vs lone K': [P(9,4,'K','red'),P(7,2,'H','red'),P(7,6,'H','red'),P(6,4,'P','red'),P(0,4,'K','black')],
  'L14-Y 2H vs K+1A': [P(9,4,'K','red'),P(7,2,'H','red'),P(7,6,'H','red'),P(0,4,'K','black'),P(0,3,'A','black')]
};

function rootScore(pieces){
  var b=new XQ.Board(XQ.buildEndgameBoard(pieces));
  return XQ.aiBestMove(b,'red','hard').score;
}
function playout(pieces, maxPly){
  var b=new XQ.Board(XQ.buildEndgameBoard(pieces));
  var side='red';
  for(var p=0;p<maxPly;p++){
    var r=XQ.aiBestMove(b,side,'hard'); // 双方都用大师，验证真能赢
    if(!r) return {w:XQ.opponent(side),ply:p};
    b.move(r.move);
    var res=XQ.getResult(b,XQ.opponent(side));
    if(res.over) return {w:side,ply:p+1};
    side=XQ.opponent(side);
  }
  return {w:'draw',ply:maxPly};
}

Object.keys(candidates).forEach(function(name){
  var pc=candidates[name];
  // 合法性
  var b=new XQ.Board(XQ.buildEndgameBoard(pc));
  var legal = XQ.legalMoves(b,'red').length>0 && !XQ.isInCheck(b,'red') && !b.kingsFace();
  var sc=rootScore(pc);
  var pl=playout(pc,120);
  console.log(name+' | 合法='+legal+' | 根分='+sc+' | hard vs hard 120步='+pl.w+'('+pl.ply+')');
});
