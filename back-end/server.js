const express=require('express');
const app=express();
const bodyParser = require("body-parser");
const cors = require('cors');
const hmacsha256=require('crypto-js/hmac-sha256');
const CryptoJS = require("crypto-js");
const {Base64} = require('js-base64');
const base32 = require('base32');
const ws=require('ws');
const wss=new ws.Server({noServer:true});

app.use(bodyParser.json());
app.use(cors());

const db=import_db();
const baseColumnDBServce=import_baseColumnDBService;
const actionItemsDBService=baseColumnDBServce('action_items');
const toImproveDBService=baseColumnDBServce('to_improve');
const wentWellDBService=baseColumnDBServce('went_well');
const boardDBService=import_boardDBService();
const helpers=import_helpers();
const usersDBService=import_usersDBService();

const secretKey={}; // to store secret key for each user

app.use('/',function(req,res,next){
    // authorize user
    let url=req.url;
    if (url=='/login' || url=='/register')
        next();
    else {
        if (req.query.token && req.query.token.length>0)
            req.query.token=base32.decode(req.query.token);
        else
            req.query.token=undefined;
        if (!helpers.verifyToken(req.query.token)){
            helpers.verifyToken(req.query.token);
            res.send({invalidToken:true});
        } else {
            next();   
        }
    }
})

app.post('/login', async function(req, res){
    let username, password;
    ({username,password}=req.body);
    let user=await usersDBService.getUserByUsername(username);
    let hashPassword=helpers.getHashPassword(user.id,password);
    if (hashPassword==user.hash_password){
        let token=helpers.createToken(user);
        res.send({token:base32.encode(token)});
    } else {
        res.send({invalidLogin:true});
    }
})

app.post('/register', async function(req, res){
    let username,email,password;
    ({username,email,password}=req.body);
    let isUniqueUsername,isUniqueEmail;
    [isUniqueUsername,isUniqueEmail]=await Promise.all([usersDBService.isUniqueUsername(username),usersDBService.isUniqueEmail(email)]);
    if (!isUniqueUsername || !isUniqueEmail)
        res.send({invalidRegister:true});
    else {
        await usersDBService.addNewUser(username,'',email);
        // update hash_password
        let user = await usersDBService.getUserByUsername(username);
        let hashPassword=helpers.getHashPassword(user.id,password);
        user.hash_password=hashPassword;
        let userId=user.id; // the update in sql requires to delete the id field before updating
        await usersDBService.updateUser(user);
        user.id=userId;
        let token=helpers.createToken(user);
        res.send({token:base32.encode(token)});
    }
})

app.get('/signout',function(req, res){
    let obj=helpers.getPayloadFromToken(req.query.token);
    helpers.refrehScretKey(obj.id);
    res.send('LOGGED OUT SUCCESSFULLY!');
})

app.get('/board',async function(req,res){
    let allActionItems;
    let allToImprove;
    let allWentWell;
    let boardId=req.query.id;
    let board;
    //get all needed data
    [allActionItems,allToImprove,allWentWell,board]=await Promise.all([
        actionItemsDBService.getByBoardId(boardId),
        toImproveDBService.getByBoardId(boardId),
        wentWellDBService.getByBoardId(boardId),
        boardDBService.getById(boardId)
    ]);
    let result={
        action_items:allActionItems,
        to_improve:allToImprove,
        went_well:allWentWell,
        board
    }
    res.send(result);
})

app.get('/board/tag/delete',async function(req, res){
    let id,dbTableName;
    ({id,dbTableName}=req.query);
    let result;
    if (dbTableName=='action_items')
        result=await actionItemsDBService.deleteTagById(id);
    if (dbTableName=='to_improve')
        result=await toImproveDBService.deleteTagById(id);
    if (dbTableName=='went_well')
        result=await wentWellDBService.deleteTagById(id);
    res.send(result);
})

app.get('/board/tag/add',async function(req, res){
    let dbTableName,boardId,content;
    ({dbTableName,boardId,content}=req.query);
    let result;
    if (dbTableName=='action_items')
        result=await actionItemsDBService.addNewTag(boardId,content);
    if (dbTableName=='to_improve')
        result=await toImproveDBService.addNewTag(boardId,content);
    if (dbTableName=='went_well')
        result=await wentWellDBService.addNewTag(boardId,content);
    res.send(result);
})

app.get('/board/tag/update',async function(req, res){
    let dbTableName,id,boardId,content;
    ({dbTableName,id,boardId,content}=req.query);
    let result;
    if (dbTableName=='action_items')
        result=await actionItemsDBService.updateTag(id,boardId,content);
    if (dbTableName=='to_improve')
        result=await toImproveDBService.updateTag(id,boardId,content);
    if (dbTableName=='went_well')
        result=await wentWellDBService.updateTag(id,boardId,content);
    res.send(result);
})

app.get('/board/name/update', async function(req, res){
    let boardId, name;
    ({boardId,name}=req.query);
    let result = await boardDBService.updateBoardNameById(boardId,name);
    res.send(result);
})

app.get('/boards', async function(req, res){
    let token=req.query.token;
    let payload=helpers.getPayloadFromToken(token);
    let userId=payload.id;
    let arr=await boardDBService.getAllByUserId(userId);
    res.send(arr);
})

app.get('/board/add',async function(req, res){
    let userId, name;
    name=req.query.name;
    let token=req.query.token;
    let payload=helpers.getPayloadFromToken(token);
    userId=payload.id;
    let result = await boardDBService.addNewBoard(userId,name);
    res.send(result);
})

app.get('/board/delete', async function(req, res){
    let id=req.query.id;
    let result=await boardDBService.deleteBoard(id);
    res.send(result);
})

app.get('/user',async function(req,res){
    let token=req.query.token;
    let username=helpers.getPayloadFromToken(token).username;
    let user=await usersDBService.getUserByUsername(username);
    res.send(user);
})

app.get('/user/update',async function(req, res){
    let oldToken=req.query.token;
    let username=helpers.getPayloadFromToken(oldToken).username;
    let user=await usersDBService.getUserByUsername(username);
    if (req.query.username){
        user.username=req.query.username;
        let isUniqueUsername=await usersDBService.isUniqueUsername(req.query.username);
        if (!isUniqueUsername){
            res.send({isDuplicate:true});
            return;
        }            
    }        
    if (req.query.email){
        user.email=req.query.email;
        let isUniqueEmail=await usersDBService.isUniqueEmail(req.query.email);
        if (!isUniqueEmail){
            res.send({isDuplicate:true});
            return;
        }   
    }       
    let userId=user.id;
    await usersDBService.updateUser(user);
    user=await usersDBService.getUserById(userId);
    let token=helpers.createToken(user);
    res.send({token:base32.encode(token)});
})

//==========file db.js
function import_db(){
    const mysql = require("mysql");
    function createConnection() {
        return mysql.createConnection({
            host: "localhost",
            port: "3306",
            user: "root",
            password: "",
            database: "sprint_retrospective"
        });
    }
    function read(sql){
        return new Promise((resolve, reject) => {
            const con = createConnection();
            con.connect(err => {
                if (err) {
                    reject(err);
                }
            });
            con.query(sql, (error, results, fields) => {
                if (error) {
                    reject(error);
                } else 
                    resolve(results);
            });
            con.end();
        });
    };
    function create(tbName, entity){
        return new Promise((resolve, reject) => {
            const con = createConnection();
            con.connect(err => {
                if (err) {
                    reject(err);
                }
            });
            const sql = `INSERT INTO ${tbName} SET ?`;
            con.query(sql, entity, (error, results, fields) => {
                if (error) 
                    reject(error);
                else 
                    resolve(results);
            });
            con.end();
        });
    };
    function del(tbName, idField, id){
        return new Promise((resolve, reject) => {
            const con = createConnection();
            con.connect(err => {
                if (err) 
                    reject(err);
            });
            let sql = `DELETE FROM ?? WHERE ?? = ?`;
            const params = [tbName, idField, id];
            sql = mysql.format(sql, params);
            con.query(sql, (error, results, fields) => {
                if (error) 
                    reject(error);
                else 
                    resolve(results);
            });
            con.end();
        });
    };
    function update(tbName, idField, entity){
        return new Promise((resolve, reject) => {
            const con = createConnection();
            con.connect(err => {
                if (err) 
                    reject(err);
            });
            const id = entity[idField];
            delete entity[idField];
            let sql = `UPDATE ${tbName} SET ? WHERE ${idField} = "${id}"`;
            sql = mysql.format(sql, entity);
            con.query(sql, (error, results, fields) => {
                if (error) 
                    reject(error);
                else 
                    resolve(results);
            });
            con.end();
        });
    };
    return {
        create,
        read,
        update,
        del
    };
}
//==========file boardDBService.js
function import_boardDBService(){
    async function getAll() {
        let sql='select * from board';
        let arr=await db.read(sql);
        return arr;       
    }
    async function getById(id) {
        let sql=`select * from board where id=${id}`;
        let arr=await db.read(sql);
        return arr[0];       
    }
    async function updateBoardNameById(id,name){
        let board=await getById(id);
        board.board_name=name;
        try {
            await db.update('board','id',board);
        } catch (e) {
            console.log(e);
            return false;
        }
        return true;
    }
    async function getAllByUserId(userId){
        let sql='select * from board where user_id='+userId;
        let arr=await db.read(sql);
        return arr; 
    }
    async function addNewBoard(userId,name){
        board={user_id:userId,board_name:name,is_deleted:0};
        try {
            await db.create('board',board);
        } catch (e) {
            console.log(e);
            return false;
        }
        return true;
    }
    async function deleteBoard(id){
        // delete all tags that belong to this board
        let promise1=actionItemsDBService.getByBoardId(id);
        let promise2=toImproveDBService.getByBoardId(id);
        let promise3=wentWellDBService.getByBoardId(id);
        let tags1=await promise1;
        let tags2=await promise2;
        let tags3=await promise3;
        let promises=[];
        // action_items
        tags1.forEach(x=>{
            promises.push(actionItemsDBService.deleteTagById(x.id));
        })
        // to_improve
        tags2.forEach(x=>{
            promises.push(toImproveDBService.deleteTagById(x.id));
        })
        // went_well
        tags3.forEach(x=>{
            promises.push(wentWellDBService.deleteTagById(x.id));
        })
        await Promise.all(promises);
        try {
            await db.del('board','id',id);
        } catch (e) {
            console.log(e);
            return false;
        }
        return true;
    }
    return {
        getAll,
        getById,
        updateBoardNameById,
        getAllByUserId,
        addNewBoard,
        deleteBoard
    }
}
//==========file baseColumnDBService.js
function import_baseColumnDBService(tableName){
    async function getAll() {
        let sql='select * from '+tableName;
        let arr=await db.read(sql);
        return arr;       
    }
    async function getByBoardId(boardId){
        let sql=`select * from ${tableName} where board_id=${boardId}`;
        let arr=await db.read(sql);
        return arr;
    }
    async function deleteTagById(id){
        try {
            await db.del(tableName,'id',id);
        } catch (e) {
            console.log(e);
            return false;
        }
        return true;
    }
    async function addNewTag(boardId,content){
        let tag={board_id:boardId,content:content,is_deleted:0};
        try {
            await db.create(tableName,tag);
        } catch (e) {
            console.log(e);
            return false;
        }
        return true;
    }
    async function updateTag(id,boardId,content){
        let tag={id,board_id:boardId,content,is_deleted:0};
        try {
            await db.update(tableName,'id',tag);
        } catch (e) {
            console.log(e);
            return false;
        }
        return true;
    }
    return {
        getAll,
        getByBoardId,
        deleteTagById,
        addNewTag,
        updateTag
    }
}
//==========file usersDBService.js
function import_usersDBService(){
    async function getUserByUsername(username){
        let sql=`select * from users where username='${username}'`;
        let arr=await db.read(sql);
        return (arr.length>0 ? arr[0] : {});
    }
    async function isUniqueUsername(username){
        let sql=`select * from users where username='${username}'`;
        let arr=await db.read(sql);
        return (arr.length==0);
    }
    async function isUniqueEmail(email){
        let sql=`select * from users where email='${email}'`;
        let arr=await db.read(sql);
        return (arr.length==0);
    }
    async function addNewUser(username,hashPassword,email){
        let user={username,hash_password:hashPassword,email};
        try {
            await db.create('users',user);
        } catch (e) {
            console.log(e);
            return false;
        }
        return true;
    }
    async function updateUser(user){
        try {
            await db.update('users','id',user);
        } catch (e) {
            console.log(e);
            return false;
        }
        return true;
    }
    async function getUserById(id){
        let sql=`select * from users where id=${id}`;
        let arr=await db.read(sql);
        return arr[0];
    }
    return {
        getUserByUsername,
        isUniqueUsername,
        isUniqueEmail,
        addNewUser,
        updateUser,
        getUserById
    }
}
//==========file helpers.js
function import_helpers(){
    function createToken(user){
        let payload={id:user.id,username:user.username,email:user.email};
        payload=Base64.encode(JSON.stringify(payload));
        if (!secretKey[user.id])
            refrehScretKey(user.id);
        let key=secretKey[user.id];
        return payload+'.'+CryptoJS.enc.Base64.stringify(hmacsha256(payload,key));
    }
    function refrehScretKey(userId){
        secretKey[userId]=Math.random()+'-'+Math.random();
    }
    function verifyToken(token){
        if (!token) // empty token
            return false;
        let arr=token.split('.');
        let payload=arr[0];
        let signature=arr[1];
        let obj=JSON.parse(Base64.decode(payload));
        if (!secretKey[obj.id])
            refrehScretKey(obj.id);
        let key=secretKey[obj.id];
        return (signature==CryptoJS.enc.Base64.stringify(hmacsha256(payload,key)));
    }
    function getPayloadFromToken(token){
        return JSON.parse(Base64.decode(token.split('.')[0]));
    }
    function getHashPassword(id,password){
        return CryptoJS.enc.Base64.stringify(hmacsha256(id,password));
    }
    return {
        createToken,
        refrehScretKey,
        verifyToken,
        getPayloadFromToken,
        getHashPassword
    }
}

// WEB SOCKET
let activeUsers=(()=>{
    // private hash map to store subscribers for each board id
    let activeUsers={};
    
    // private setters
    function add(boardId, socket){
        if (!activeUsers[boardId])
            activeUsers[boardId]=[];
        activeUsers[boardId].push(socket);
    }

    function remove(boardId, socket){
        let newSubscribersForThisBoard=[];
        if (activeUsers[boardId].length==1){
            delete activeUsers[boardId];
            return;
        }
        activeUsers[boardId].forEach(x=>{
            if (x!=socket)
                newSubscribersForThisBoard.push(x);
        })
        activeUsers[boardId]=newSubscribersForThisBoard;
    }

    return {
        addNewSubscriber:function(boardId, socket){
            add(boardId, socket);
        },
        removeSubscriber: function(boardId, socket){
            remove(boardId, socket);
        },
        broadcastToSubscribers: function(boardId){
            let subscribers=activeUsers[boardId] || [];
            subscribers.forEach(x=>{
                // notify changes to subscribers
                console.log('---send notification to users for changes');
                x.send('There are some changes that need to be updated');
            });
        }
    }    
})();

wss.on('connection',(socket,req)=>{
    console.log('a client want to make a connection');

    const boardId=req.url.split('=')[1]; // boardId for each user

    activeUsers.addNewSubscriber(boardId, socket);

    socket.on('message',msg=>{
        // broadcast the changes to subscribers  
        console.log(msg);
        activeUsers.broadcastToSubscribers(boardId);
    });

    socket.on('close',()=>{
        activeUsers.removeSubscriber(boardId, socket);
    })
});

const port = 3007;
const server=app.listen(port, () => console.log(`App is listening on port ${port}`));

server.on('upgrade',(req,socket,head)=>{
    wss.handleUpgrade(req,socket,head,socket=>{
        wss.emit('connection',socket,req);
    });
});