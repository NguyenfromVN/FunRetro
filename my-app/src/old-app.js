import React, {useState} from 'react';
import ReactDOM from 'react-dom';
import './index.css';

function Square(props){
  return (
    <button 
      className={['square',props.class].join(' ')} 
      onClick={props.onClick}
    >
      {props.value}
    </button>
  );
}

function Board(props){
  let arr=props.highlight || [];
  function renderSquare(i) {
    return (
      <Square 
        value={props.squares[i]} 
        onClick={()=>props.onClick(i)}
        class={arr.includes(i) ? 'highlight' : ''}  
      />);
  }
  let rows=[];
  let sizeOfBoard=3;
  for (let i=0; i<sizeOfBoard; i++) {
    let cols=[];
    for (let j=0; j<sizeOfBoard; j++) {
      cols.push(renderSquare(i*3+j));
    }
    rows.push(
      <div className="board-row">
        {cols}
      </div>
    );
  }
  return (
    <div>
      {rows}
    </div>
  );
}
  
function Game(props) {
  const [history0,setHistory]=useState([{squares: Array(9).fill(null)}]);
  const [xIsNext0,setXIsNext]=useState(true);
  const [stepNumber0,setStepNumber]=useState(0);
  const [reverseMoves0,setReverseMoves]=useState(false);

  function handleClick(i){
    let history=history0.slice(0,stepNumber0+1);
    let current=history[history.length-1];
    let squares=current.squares.slice();
    if (squares[i] || getWinner(current.squares).winner)
      return;
    let nextSymbol=(xIsNext0 ? 'X' : 'O');
    let xIsNext=!xIsNext0;
    squares[i]=nextSymbol;
    [...history]=history;
    history.push({squares});
    setHistory(history);
    setXIsNext(xIsNext);
    setStepNumber(history.length-1);
  }

  function jumpTo(step) {
    setStepNumber(step);
    setXIsNext((step % 2)==0);
  }

  function render() {
    let history=history0;
    let current=history[stepNumber0];
    let tmp=getWinner(current.squares);
    let winner=tmp.winner;
    let cnt=0;
    for (let i=0; i<current.squares.length; i++)
      cnt+=(current.squares[i] ? 1 : 0);
    let status;
    if (cnt==current.squares.length && !winner)
      status='No one wins. The game is drawn';
    else
      status=(winner ? ('The winner: '+winner) : ('Next player: '+(xIsNext0 ? 'X' : 'O')));
    let lastMove='There is no previous move';
    let moves=history.map((step,id)=>{
      let desc=id ? `Go to move #${id}` : 'Go to game start';
      return (
        <li key={id}>
          <button className={id==stepNumber0 ? 'isSelected' : ''} onClick={()=>jumpTo(id)}>{desc}</button>
        </li>
      );
    });
    if (reverseMoves0)
      moves=moves.reverse();
    if (history.length>1){
      lastMove='';
      for (let i=0; i<current.squares.length; i++)
        if (history[history.length-2].squares[i]!=current.squares[i])
          lastMove='Last move: row '+(Math.floor(i/3)+1)+', column '+(i-3*Math.floor(i/3)+1);
    }
    return (
      <div className="game">
        <div className="game-board">
          <Board 
            squares={current.squares}
            onClick={(i)=>handleClick(i)}
            highlight={tmp.arr}
          />
        </div>
        <div className="game-info">
          <div>{status}</div>
          <button onClick={()=>setReverseMoves(!reverseMoves0)}>Change the order of moves</button>
          <div>{lastMove}</div>
          <ol>{moves}</ol>
        </div>
      </div>
    );
  }

  return render();
}
  
// ========================================
  
ReactDOM.render(
  <Game />,
  document.getElementById('root')
);
  
// helpers

function getWinner(squares){
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (let i=0; i<lines.length; i++){
    let a,b,c;
    ([a,b,c]=lines[i]);
    if (squares[a] && squares[a]==squares[b] && squares[b]==squares[c])
      return {winner:squares[a],arr:lines[i]};
  }
  return {winner:undefined};
}