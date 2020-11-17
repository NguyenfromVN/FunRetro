import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import CreateIcon from '@material-ui/icons/Create';
import { makeStyles } from '@material-ui/core/styles';
import Grid from '@material-ui/core/Grid';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import FiberManualRecordRoundedIcon from '@material-ui/icons/FiberManualRecordRounded';
import Button from '@material-ui/core/Button';
import CloseIcon from '@material-ui/icons/Close';
import TextField from '@material-ui/core/TextField';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Card from '@material-ui/core/Card';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import Modal from '@material-ui/core/Modal';
import AddCircleIcon from '@material-ui/icons/AddCircle';
import DeleteIcon from '@material-ui/icons/Delete';
import { DragDropContext } from 'react-beautiful-dnd';
import { Droppable } from 'react-beautiful-dnd';
import { Draggable } from 'react-beautiful-dnd';
import CssBaseline from '@material-ui/core/CssBaseline';
import Container from '@material-ui/core/Container';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link,
  useLocation
} from "react-router-dom";
import './index.css';

// global WebSocket instance
const ws = (function () {
  let ws = undefined;
  let lazyLoad=0; // number of times when the update is not needed, avoid updating when you are the author of this change
  return {
    createConnection: function(loadBoard){
      const boardId=(new URL(document.location)).searchParams.get('id');
      this.destroyConnection();
      ws = new WebSocket("ws://localhost:3007?boardId=" + boardId);
      console.log('new connection');
      ws.addEventListener("message", ({data}) => {
        // reload the board
        console.log('from server = '+data);
        if (lazyLoad>0)
          lazyLoad-=1;
        else
          loadBoard(boardId);
      });
    },
    destroyConnection: () => {
      console.log('destroy WS');
      if (ws)
        ws.close();
      ws = undefined;
    },
    notifyForChange: () => {
      console.log('ping server for change');
      ws.send("A change has been made");
      lazyLoad+=1;
    }
  }
})();

// CSS for material-ui

const useStyles = makeStyles((theme) => ({
  contentPanel: {
    padding: theme.spacing(1),
    paddingTop: theme.spacing(4),
    flexGrow: 1,
  },
  listBoards: {
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
    paddingTop: theme.spacing(1),
    flexGrow: 1
  },
  box: {
    padding: theme.spacing(1),
    marginBottom: theme.spacing(2),
    color: "#ffffff"
  },
  bgColor1: {
    backgroundColor: "rgb(0,150,136)"
  },
  bgColor2: {
    backgroundColor: "rgb(233,30,99)"
  },
  bgColor3: {
    backgroundColor: "rgb(156,39,176)"
  },
  color1: {
    color: "rgb(0,150,136)"
  },
  color2: {
    color: "rgb(233,30,99)"
  },
  color3: {
    color: "rgb(156,39,176)"
  },
  addButton: {
    width: "100%",
    height: "2rem",
    color: "#ffffff",
    textAlign: "center",
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(2),
    backgroundColor: "#cccccc"
  },
  column: {
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1)
  },
  boardTitle: {
    backgroundColor: "#ffff00",
    padding: theme.spacing(1)
  },
  card: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'rgb(0,192,192)'
  },
  cardContent: {
    flexGrow: 1,
  },
  addCircleButton: {
    cursor: 'pointer',
    marginLeft: theme.spacing(1),
    color: '#555555'
  },
  modalStyle: {
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    position: "absolute",
    width: 400,
    backgroundColor: '#abcbff',
    boxShadow: theme.shadows[5],
    padding: theme.spacing(2, 4, 3)
  },
  paper: {
    marginTop: theme.spacing(8),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  form: {
    width: '100%', // Fix IE 11 issue.
    marginTop: theme.spacing(1),
  },
  submit: {
    margin: theme.spacing(3, 0, 2),
  }
}));

// HELPERS

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

// COMPONENTS

function Tag(props) {
  const [onEdit, setOnEdit] = useState(props.tag.onEdit);
  const [input, setInput] = useState('');
  const classes = useStyles();
  return (
    <Draggable draggableId={props.index + ' ' + Math.random()}>
      {(provided, snapshot) => (
        <Box
          boxShadow={6}
          className={`${classes.box} ${classes[props.bgColor]}`}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >
          <Box>
            <Typography>
              {props.tag.content}
            </Typography>
          </Box>
          <Box display="flex" flexDirection="row-reverse">
            <div className={onEdit ? 'displayNone' : null}>
              <CreateIcon onClick={() => { setOnEdit(!onEdit); setInput(props.tag.content) }} />
            </div>
            <div className={!onEdit ? 'displayNone' : null}>
              <CloseIcon onClick={() => setOnEdit(!onEdit)} />
            </div>
          </Box>
          {/* hidden form */}
          <div className={!onEdit ? 'displayNone' : null}>
            <TextField
              label="Content"
              multiline
              rows={5}
              value={input}
              onChange={e => setInput(e.target.value)}
              className='textarea'
              variant="outlined"
              style={{ marginBottom: "10px" }}
            />
            <div display='flex'>
              <Button
                variant="contained"
                color="primary"
                size="small"
                onClick={() => props.doneButtonTagHandler(input)}
              ><b>DONE</b></Button>
              <Button
                style={{ marginLeft: "10px" }}
                variant="contained"
                color="primary"
                size="small"
                onClick={props.deleteTagButtonHandler}
              ><b>DELETE</b></Button>
            </div>
          </div>
        </Box>
      )}
    </Draggable>
  )
}

function Column(props) {
  const classes = useStyles();
  let tags = [];
  props.tags.forEach((tag, index) => tags.push(
    <Tag
      index={index}
      tag={tag}
      key={tag.id}
      bgColor={props.bgColor}
      deleteTagButtonHandler={() => {
        if (tag.id < 0) {
          // pop the first tag, which is an empty tag
          props.popEmptyTag(props.tags);
        } else {
          props.deleteTagButtonHandler(tag.id, props.tags);
        }
      }}
      doneButtonTagHandler={input => props.doneButtonTagHandler(tag.id, props.tags, input)}
    />
  ));
  return (
    <Grid item xs={4} className={classes.column}>
      <div className='title'>
        <FiberManualRecordRoundedIcon className={classes[props.color]} />
        <p style={{ margin: "0px" }}>{props.name}</p>
      </div>
      <AddButton
        addButtonHandler={props.addButtonHandler}
      />
      <Droppable droppableId={props.name}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            style={{ borderBottom: (snapshot.isDraggingOver ? '10px solid #ffabbb' : null) }}
          >
            {tags}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </Grid>
  );
}

function AddButton(props) {
  const classes = useStyles();
  return (
    <Button className={classes.addButton} onClick={props.addButtonHandler}>
      <h1>+</h1>
    </Button>
  );
}

function BoardTitle(props) {
  const [onEdit, setOnEdit] = useState(false);
  const [input, setInput] = useState('');
  const classes = useStyles();
  let query = useQuery();

  useEffect(() => {
    (async () => {
      let isLogged = await props.createdHook(query.get('id'));
      if (isLogged) {
        props.setIsLoggedIn(true);
        props.createConnection();
      }
    })();
    // hook for onDestroy of lifecycle
    return ()=>{
      console.log('Component destroyed');
      ws.destroyConnection();
    }
  }, []);

  return (
    <Box className={classes.boardTitle}>
      <Box className="title">
        <h2 style={{ margin: "10px 0px" }}>
          {props.name}
        </h2>
        <div className={onEdit ? 'displayNone' : null}>
          <CreateIcon onClick={() => { setOnEdit(!onEdit); setInput(props.name) }} />
        </div>
        <div className={!onEdit ? 'displayNone' : null}>
          <CloseIcon onClick={() => setOnEdit(!onEdit)} />
        </div>
        {/* hidden form */}
        <div className={!onEdit ? 'displayNone' : null}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <TextField
              size='small'
              label="Title"
              value={input}
              onChange={e => setInput(e.target.value)}
              variant="outlined"
              style={{ marginRight: "10px", marginLeft: "5px" }}
            />
            <Button
              variant="contained"
              color="primary"
              size="small"
              onClick={() => props.doneButtonBoardTitleHandler(input)}
            ><b>DONE</b></Button>
            <Button
              style={{ marginLeft: "10px" }}
              variant="contained"
              color="primary"
              size="small"
              onClick={() => setOnEdit(!onEdit)}
            ><b>CANCEL</b></Button>
          </div>
        </div>
      </Box>
    </Box>
  )
}

function NavigationBar(props) {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6">
          <Link to='/'>FunRetro</Link>
        </Typography>
        {/* trick here !!! */}
        <Typography style={{ flexGrow: 1 }}></Typography>
        <Button
          style={{ display: (props.isLoggedIn ? 'inline-flex' : 'none') }}
          color="inherit"
        ><Link to='/profile'>Profile</Link></Button>
        <Button
          style={{ display: (props.isLoggedIn ? 'inline-flex' : 'none') }}
          color="inherit"
          onClick={props.signOutHandler}
        >Sign out</Button>
      </Toolbar>
    </AppBar>
  );
}

function Board(props) {
  const classes = useStyles();
  return (
    <Grid item xs={12} sm={6} md={4}>
      <Card className={classes.card}>
        <CardContent className={classes.cardContent}>
          <Typography gutterBottom variant="h5" component="h2">
            {props.board.board_name}
          </Typography>
        </CardContent>
        <CardActions>
          <Button size="small" color="primary">
            <Link to={`/board?id=${props.board.id}`}><b>View</b></Link>
          </Button>
          <Button size="small" color="primary" onClick={() => { props.setOnShare(true); props.setBoardIdForSharing(props.board.id) }}>
            <b>Share</b>
          </Button>
          {/* trick here !!! */}
          <Typography style={{ flexGrow: 1 }}></Typography>
          <DeleteIcon
            color="primary"
            onClick={() => props.deleteIconHandler(props.board.id)}
          />
        </CardActions>
      </Card>
    </Grid>
  );
}

function BoardsList(props) {
  let cards = props.boards.map((board) => (
    <Board
      key={board.id}
      board={board}
      deleteIconHandler={props.deleteIconHandler}
      setOnShare={props.setOnShare}
      setBoardIdForSharing={props.setBoardIdForSharing}
    />
  ));

  useEffect(() => { props.createdHook(); props.setIsLoggedIn(true); }, []);

  return (
    <Grid container spacing={2}>
      {cards}
    </Grid>
  );
}

function OverlayForm(props) {
  const classes = useStyles();
  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState('');

  const handleOpen = () => {
    setOpen(true);
    setInput('');
  };

  const handleClose = () => {
    setOpen(false);
  };

  const body = (
    <div className={classes.modalStyle}>
      <h2 id='simple-modal-title'>Create new board</h2>
      <div id="simple-modal-description">
        <TextField
          size='small'
          label="Board name"
          value={input}
          onChange={e => setInput(e.target.value)}
          variant="outlined"
          style={{ width: "100%" }}
        />
        <div style={{ display: "flex", flexDirection: "row-reverse", marginTop: "10px" }}>
          <Button
            style={{ marginLeft: "10px" }}
            variant="contained"
            color="primary"
            size="small"
            onClick={handleClose}
          ><b>CANCEL</b></Button>
          <Button
            variant="contained"
            color="primary"
            size="small"
            onClick={() => { props.addNewBoard(input); handleClose(); }}
          ><b>DONE</b></Button>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <AddCircleIcon
        fontSize='large'
        className={classes.addCircleButton}
        onClick={handleOpen}
      />
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="simple-modal-title"
        aria-describedby="simple-modal-description"
      >
        {body}
      </Modal>
    </div>
  );
}

function ShareLinkOverlay(props) {
  const classes = useStyles();

  const handleClose = () => {
    props.setOnShare(false);
  };

  const body = (
    <div className={classes.modalStyle}>
      <h2 id='simple-modal-title'>Public Board URL:</h2>
      <div id="simple-modal-description">
        <TextField
          size='small'
          label="URL"
          value={window.location.href + 'board?id=' + props.boardId}
          variant="outlined"
          style={{ width: "100%" }}
        />
        <div style={{ display: "flex", flexDirection: "row-reverse", marginTop: "10px" }}>
          <Button
            variant="contained"
            color="primary"
            size="small"
            onClick={handleClose}
          ><b>DONE</b></Button>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <Modal
        open={props.onShare}
        onClose={handleClose}
        aria-labelledby="simple-modal-title"
        aria-describedby="simple-modal-description"
      >
        {body}
      </Modal>
    </div>
  );
}

function SignIn(props) {
  const classes = useStyles();
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');

  useEffect(() => props.setIsLoggedIn(false), []);

  return (
    <Container maxWidth="xs">
      <CssBaseline />
      <div className={classes.paper}>
        <Typography component="h1" variant="h5">
          Sign in
        </Typography>
        <form
          className={classes.form}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            let data = { username, password };
            props.submitHandler(data);
          }}
        >
          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            id="username"
            label="Username"
            name="username"
            autoFocus
            onChange={e => setUsername(e.target.value)}
          />
          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            onChange={e => setPassword(e.target.value)}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            className={classes.submit}
          >
            Sign In
          </Button>
          <Grid container>
            <Grid item xs>
              {/* NOTHING */}
            </Grid>
            <Grid item>
              <Link to='/register' variant="body2">
                {"Don't have an account? Register"}
              </Link>
            </Grid>
          </Grid>
        </form>
      </div>
    </Container>
  );
}

function SignUp(props) {
  const [username, setUsername] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const classes = useStyles();

  useEffect(() => props.setIsLoggedIn(false), []);

  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <div className={classes.paper}>
        <Typography component="h1" variant="h5">
          Sign up
        </Typography>
        <form
          className={classes.form}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            let data = { username, email, password };
            props.registerHandler(data);
          }}
        >
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                name="username"
                variant="outlined"
                required
                fullWidth
                id="username"
                label="Username"
                autoFocus
                onChange={e => setUsername(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                variant="outlined"
                required
                fullWidth
                id="email"
                label="Email"
                name="email"
                autoComplete="email"
                onChange={e => setEmail(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                variant="outlined"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="current-password"
                onChange={e => setPassword(e.target.value)}
              />
            </Grid>
          </Grid>
          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            className={classes.submit}
          >
            Sign Up
          </Button>
          <Grid container justify="flex-end">
            <Grid item>
              <Link to='/login' variant="body2">
                Already have an account? Sign in
              </Link>
            </Grid>
          </Grid>
        </form>
      </div>
    </Container>
  );
}

function Profile(props) {
  const [userInfo, setUserInfo] = React.useState({});

  const [username, setUsername] = React.useState('');
  const [onEditUsername, setOnEditUsername] = React.useState(false);

  const [email, setEmail] = React.useState('');
  const [onEditEmail, setOnEditEmail] = React.useState(false);

  const classes = useStyles();

  useEffect(() => props.loadUserProfile({ setUserInfo, setUsername, setEmail }), []);

  async function submitNewUsername(e) {
    if (e.charCode === 13) { // enter is pressed
      let data = { username };
      await props.updateUserInfoHandler(data);
      setUserInfo({ username, email: userInfo.email });
      setOnEditUsername(false);
    }
  }

  async function submitNewEmail(e) {
    if (e.charCode === 13) { // enter is pressed
      let data = { email };
      await props.updateUserInfoHandler(data);
      setUserInfo({ username: userInfo.username, email });
      setOnEditEmail(false);
    }
  }

  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <div className={classes.paper}>
        <Typography component="h1" variant="h5" style={{ marginBottom: "8px" }}>
          Your profile
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Box display="flex">
              <Box flexGrow={1} style={{ marginRight: "5px" }}>
                <TextField
                  name="username"
                  variant="outlined"
                  required
                  fullWidth
                  value={username}
                  id="username"
                  label="Username"
                  InputProps={{
                    readOnly: !onEditUsername,
                  }}
                  onChange={e => setUsername(e.target.value)}
                  onKeyPress={e => submitNewUsername(e)}
                />
              </Box>
              <Box display="flex" flexDirection="column" justifyContent="center">
                <Box className={onEditUsername ? "displayNone" : null}>
                  <CreateIcon onClick={() => { setOnEditUsername(true) }} />
                </Box>
                <Box className={!onEditUsername ? "displayNone" : null}>
                  <CloseIcon onClick={() => { setOnEditUsername(false); setUsername(userInfo.username); }} />
                </Box>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Box display="flex">
              <Box flexGrow={1} style={{ marginRight: "5px" }}>
                <TextField
                  name="email"
                  variant="outlined"
                  required
                  fullWidth
                  value={email}
                  id="email"
                  label="Email"
                  InputProps={{
                    readOnly: !onEditEmail,
                  }}
                  onChange={e => setEmail(e.target.value)}
                  onKeyPress={e => submitNewEmail(e)}
                />
              </Box>
              <Box display="flex" flexDirection="column" justifyContent="center">
                <Box className={onEditEmail ? "displayNone" : null}>
                  <CreateIcon onClick={() => { setOnEditEmail(true) }} />
                </Box>
                <Box className={!onEditEmail ? "displayNone" : null}>
                  <CloseIcon onClick={() => { setOnEditEmail(false); setEmail(userInfo.email); }} />
                </Box>
              </Box>
            </Box>
          </Grid>
          <Grid container>
            <Grid item style={{ paddingLeft: "8px" }}>
              <i>*while editing, press Enter to submit your change</i>
            </Grid>
          </Grid>
        </Grid>
      </div>
    </Container>
  );
}

function Retro() {
  const [action_items, setActionItems] = useState([]);
  const [to_improve, setToImprove] = useState([]);
  const [went_well, setWentWell] = useState([]);
  const columns = [
    { data: action_items, setter: setActionItems, dbTableName: 'action_items' },
    { data: to_improve, setter: setToImprove, dbTableName: 'to_improve' },
    { data: went_well, setter: setWentWell, dbTableName: 'went_well' }
  ];
  const [board, setBoard] = useState({});
  const [boardId, setBoardId] = useState(1);
  const [boards, setBoards] = useState([]);
  const [onShare, setOnShare] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const classes = useStyles();

  // HELPERS

  function invalidToken(response) {
    if (response.invalidToken)
      return true;
    return false;
  }

  function getToken() {
    return localStorage.getItem('token') || '';
  }

  function setToken(token) {
    localStorage.setItem('token', token);
  }

  // API SERVICES

  async function getBoard(id) {
    let token = getToken();
    let response = await fetch('http://localhost:3007/board?id=' + id + '&token=' + token);
    response = await response.json();
    return response;
  }

  async function getBoards() {
    let token = getToken();
    let response = await fetch('http://localhost:3007/boards?token=' + token);
    response = await response.json();
    return response;
  }

  async function deleteTag(dbTableName, id) {
    let token = getToken();
    let response = await fetch('http://localhost:3007/board/tag/delete?id=' + id + '&dbTableName=' + dbTableName + '&token=' + token);
    response = await response.json();
    ws.notifyForChange();
    return response;
  }

  async function addNewTag(dbTableName, boardId, content) {
    let token = getToken();
    let response = await fetch('http://localhost:3007/board/tag/add?dbTableName=' + dbTableName + '&boardId=' + boardId + '&content=' + content + '&token=' + token);
    response = await response.json();
    ws.notifyForChange();
    return response;
  }

  async function updateTag(dbTableName, id, content) {
    let token = getToken();
    let response = await fetch('http://localhost:3007/board/tag/update?dbTableName=' + dbTableName + '&id=' + id + '&boardId=' + boardId + '&content=' + content + '&token=' + token);
    response = await response.json();
    ws.notifyForChange();
    return response;
  }

  async function updateBoardName(boardName) {
    let token = getToken();
    let response = await fetch('http://localhost:3007/board/name/update?boardId=' + boardId + '&name=' + boardName + '&token=' + token);
    response = await response.json();
    ws.notifyForChange();
    return response;
  }

  async function addBoard(boardName) {
    let token = getToken();
    let response = await fetch('http://localhost:3007/board/add?name=' + boardName + '&token=' + token);
    response = await response.json();
    return response;
  }

  async function removeBoard(id) {
    let token = getToken();
    let response = await fetch('http://localhost:3007/board/delete?id=' + id + '&token=' + token);
    response = await response.json();
    return response;
  }

  async function postLogin(data) {
    let response = await fetch('http://localhost:3007/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    response = await response.json();
    if (response.invalidLogin)
      return false;
    return response.token;
  }

  async function register(data) {
    let response = await fetch('http://localhost:3007/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    response = await response.json();
    if (response.invalidRegister)
      return false;
    return response.token;
  }

  function signOut() {
    let token = getToken();
    return fetch('http://localhost:3007/signout?&token=' + token);
  }

  async function loadUserInfo() {
    let token = getToken();
    let response = await fetch('http://localhost:3007/user?token=' + token);
    response = await response.json();
    return response;
  }

  async function updateUserInfo(data) {
    let token = getToken();
    let response = await fetch('http://localhost:3007/user/update?' +
      (data.username ? 'username=' + data.username + '&' : '') +
      (data.email ? 'email=' + data.email + '&' : '') +
      'token=' + token);
    response = await response.json();
    return response;
  }

  // HANDLERS

  async function loadBoard(id) {
    setBoardId(id);
    let response = await getBoard(id);
    if (invalidToken(response)) {
      document.getElementById('hiddenLinkToGetToLoginPage').click();
      return false;
    }
    let action_items, to_improve, went_well, board;
    ({ action_items, to_improve, went_well, board } = response);
    setActionItems(action_items);
    setToImprove(to_improve);
    setWentWell(went_well);
    setBoard(board);
    return true;
  }

  async function loadBoards() {
    let response = await getBoards();
    if (invalidToken(response)) {
      document.getElementById('hiddenLinkToGetToLoginPage').click();
      return;
    }
    let boards = response;
    setBoards(boards);
  }

  function addButtonHandler(tags) {
    // check the first tag, to make sure there is no more than 1 empty tag in a column
    if (tags.length > 0 && tags[0].id < 0)// negative id is invalid
      return;
    let newTags = [];
    newTags.push({ board_id: boardId, content: 'New tag', id: -1, is_deleted: 0, onEdit: true });
    tags.forEach(tag => {
      let tmp;
      ({ ...tmp } = tag);
      newTags.push(tmp);
    })
    columns.forEach(column => {
      if (column.data === tags)
        column.setter(newTags);
    })
  }

  async function doneButtonTagHandler(id, tags, content) {
    // get db table name
    let dbTableName;
    columns.forEach(column => {
      if (tags === column.data)
        dbTableName = column.dbTableName;
    })
    if (id < 0) {
      // add new tag
      let response = await addNewTag(dbTableName, boardId, content);
      if (invalidToken(response)) {
        document.getElementById('hiddenLinkToGetToLoginPage').click();
        return;
      }
    } else {
      // update existing tag
      let response = await updateTag(dbTableName, id, content);
      if (invalidToken(response)) {
        document.getElementById('hiddenLinkToGetToLoginPage').click();
        return;
      }
    }
    await loadBoard(boardId);
  }

  async function deleteTagButtonHandler(id, tags) {
    // get db table name
    let dbTableName;
    columns.forEach(column => {
      if (tags === column.data)
        dbTableName = column.dbTableName;
    })
    let response = await deleteTag(dbTableName, id);
    if (invalidToken(response)) {
      document.getElementById('hiddenLinkToGetToLoginPage').click();
      return;
    }
    await loadBoard(boardId);
  }

  function popEmptyTag(tags) {
    let newTags = [];
    for (let i = 1; i < tags.length; i++) {
      let tmp;
      ({ ...tmp } = tags[i]);
      newTags.push(tmp);
    }
    columns.forEach(column => {
      if (column.data === tags) {
        column.setter(newTags);
      }
    })
  }

  async function doneButtonBoardTitleHandler(input) {
    let response = await updateBoardName(input);
    if (invalidToken(response)) {
      document.getElementById('hiddenLinkToGetToLoginPage').click();
      return;
    }
    await loadBoard(boardId);
  }

  async function addNewBoard(input) {
    let response = await addBoard(input);
    if (invalidToken(response)) {
      document.getElementById('hiddenLinkToGetToLoginPage').click();
      return;
    }
    await loadBoards();
  }

  async function deleteBoard(id) {
    let response = await removeBoard(id);
    if (invalidToken(response)) {
      document.getElementById('hiddenLinkToGetToLoginPage').click();
      return;
    }
    await loadBoards();
  }

  async function dragTagEnd(result) {
    let destination, source, draggableId;
    ({ destination, source, draggableId } = result);
    draggableId = draggableId.split(' ')[0];
    if (!destination)
      return;
    if (destination.droppableId == source.droppableId)
      return;
    function getColumn(columnName) {
      if (columnName[0] == 'W') // 'Went Well'
        return { dbTableName: 'went_well', data: went_well };
      if (columnName[0] == 'T') // 'To Improve'
        return { dbTableName: 'to_improve', data: to_improve };
      if (columnName[0] == 'A') // 'Action Items'
        return { dbTableName: 'action_items', data: action_items };
    }
    const destinationCol = getColumn(destination.droppableId);
    const sourceCol = getColumn(source.droppableId);
    // delete the tag from 'source' column
    let promise1 = deleteTag(sourceCol.dbTableName, sourceCol.data[parseInt(draggableId)].id);
    // add this tag to 'destination' column
    let promise2 = addNewTag(destinationCol.dbTableName, boardId, sourceCol.data[parseInt(draggableId)].content);
    // empty all columns
    setWentWell([]);
    setToImprove([]);
    setActionItems([]);
    let response = await promise1;
    if (invalidToken(response)) {
      return;
    }
    await promise2; // equivalent to Promise.all
    // refresh board
    await loadBoard(boardId);
  }

  async function submitHandler(data) {
    let token = await postLogin(data);
    if (!token) {
      alert('Either Username or Password is incorrect!')
      return;
    }
    setToken(token);
    document.getElementById('hiddenLinkToGetToHomePage').click();
  }

  async function registerHandler(data) {
    let token = await register(data);
    if (!token) {
      alert('Neither Username or Email is not unique!')
      return;
    }
    setToken(token);
    document.getElementById('hiddenLinkToGetToHomePage').click();
  }

  async function signOutHandler() {
    await signOut();
    document.getElementById('hiddenLinkToGetToLoginPage').click();
  }

  async function updateUserInfoHandler(data) {
    let response = await updateUserInfo(data);
    if (response.isDuplicate) {
      alert("Username or Email is not unique!");
      return;
    }
    setToken(response.token);
  }

  async function loadUserProfile(setters) {
    let response = await loadUserInfo();
    if (invalidToken(response)) {
      document.getElementById('hiddenLinkToGetToLoginPage').click();
      return;
    }
    let data = response;
    setters.setUsername(data.username);
    setters.setEmail(data.email);
    setters.setUserInfo(data);
  }

  return (
    <Router>
      <Link id='hiddenLinkToGetToLoginPage' to='/login' style={{ display: 'none' }}>hidden link to get to login page</Link>
      <Link id='hiddenLinkToGetToHomePage' to='/' style={{ display: 'none' }}>hidden link to get to home page</Link>
      <NavigationBar
        isLoggedIn={isLoggedIn}
        signOutHandler={signOutHandler}
      />
      <Switch>
        <Route exact path='/board'>
          <div>
            <BoardTitle
              name={board.board_name}
              doneButtonBoardTitleHandler={doneButtonBoardTitleHandler}
              // attach the function 'loadBoard' here, to let it run and fetch board's data
              createConnection={() => ws.createConnection(loadBoard)}
              createdHook={loadBoard}
              setIsLoggedIn={setIsLoggedIn}
            />
            <div className={classes.contentPanel}>
              <DragDropContext
                onDragEnd={dragTagEnd}
              >
                <Grid container>
                  <Column
                    tags={went_well}
                    bgColor='bgColor1'
                    color='color1'
                    name='Went Well'
                    addButtonHandler={() => addButtonHandler(went_well)}
                    deleteTagButtonHandler={deleteTagButtonHandler}
                    doneButtonTagHandler={doneButtonTagHandler}
                    popEmptyTag={popEmptyTag}
                  />
                  <Column
                    tags={to_improve}
                    bgColor='bgColor2'
                    color='color2'
                    name='To Improve'
                    addButtonHandler={() => addButtonHandler(to_improve)}
                    deleteTagButtonHandler={deleteTagButtonHandler}
                    doneButtonTagHandler={doneButtonTagHandler}
                    popEmptyTag={popEmptyTag}
                  />
                  <Column
                    tags={action_items}
                    bgColor='bgColor3'
                    color='color3'
                    name='Action Items'
                    addButtonHandler={() => addButtonHandler(action_items)}
                    deleteTagButtonHandler={deleteTagButtonHandler}
                    doneButtonTagHandler={doneButtonTagHandler}
                    popEmptyTag={popEmptyTag}
                  />
                </Grid>
              </DragDropContext>
            </div>
          </div>
        </Route>
        <Route exact path='/'>
          <div className={classes.contentPanel}>
            <OverlayForm
              addNewBoard={addNewBoard}
            />
            <ShareLinkOverlay
              onShare={onShare}
              setOnShare={setOnShare}
              boardId={boardId}
            />
            <div className={classes.listBoards}>
              <BoardsList
                // attach the function 'loadBoards' here, to let it run and fetch boards data 
                createdHook={loadBoards}
                boards={boards}
                deleteIconHandler={deleteBoard}
                setOnShare={setOnShare}
                setBoardIdForSharing={setBoardId}
                setIsLoggedIn={setIsLoggedIn}
              />
            </div>
          </div>
        </Route>
        <Route exact path='/login'>
          <SignIn
            submitHandler={submitHandler}
            setIsLoggedIn={setIsLoggedIn}
          />
        </Route>
        <Route exact path='/register'>
          <SignUp
            registerHandler={registerHandler}
            setIsLoggedIn={setIsLoggedIn}
          />
        </Route>
        <Route exact path='/profile'>
          <Profile
            loadUserInfo={loadUserInfo}
            updateUserInfoHandler={updateUserInfoHandler}
            loadUserProfile={loadUserProfile}
          />
        </Route>
      </Switch>
    </Router>
  );
}

ReactDOM.render(
  <Retro />,
  document.getElementById('root')
);