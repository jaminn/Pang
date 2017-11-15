let express = require('express');  
let app = express();  
let server = require('http').createServer(app);  
let io = require('socket.io')(server);
var p2p = require('socket.io-p2p-server').Server;
let fs = require('fs'); 

let idToRoom = {};
let roomToPName = {};
let idToSocket = {};

let Api = {dir : './src'};
Api.readDir = function(path, callback){
    callback = callback || ((files) => { console.log(files); });
    fs.readdir(`${this.dir}${path}`, 'utf8', (err, files) => {
      callback(files);
    });  
};
Api.readFile = function(path, callback){
    callback = callback || ((text) => { console.log(text); });
    fs.readFile(`${this.dir}${path}`, 'utf8', (err, text) => {
      callback(text);
    });  
};
Api.read = function(path, callback){
    if(path.match(/^.+?\/?\w+?\.\w+$/g))
        this.readFile(path, callback);
    else
        this.readDir(path, callback);
};
Api.writeFile = function(path, data, callback){
    let patt = /\"(.*)\"/g;
    let raw = patt.exec(data);
    data = raw[1];
    callback = callback || ((isSaved) => {
        if(isSaved) console.log("파일이 저장되었습니다.");
        else console.log("파일 저장에 실패하였습니다.");
    });
    fs.writeFile(`${this.dir}${path}`, data, (err) => {
      if (err) callback(false);
      else callback(true);
    });
};
Api.joinRoom = function(socket, name, playerName, callback){
    callback = callback || ((name) => { console.log(`[Api.joinRoom] ${name}방에 접속합니다.`); });
    if(!io.sockets.adapter.sids[socket.id][name]){
      idToRoom[socket.id] = name;
      idToSocket[socket.id] = socket;
      if(!roomToPName[name]) roomToPName[name] = {};
      roomToPName[name][socket.id] = playerName;
      socket.join(name);
      p2p(socket, null, {name: name});
      let ids = Object.keys(socket.adapter.rooms[name].sockets);
      let pNames = Object.values(roomToPName[name]);
      io.sockets.in(name).emit('peer-entered',ids, pNames);
      let cnt = ids.length;
      callback(name,cnt);
    }else{
      //callback(null,0);
    }
};
Api.leaveRoom = function(socket, callback){
    callback = callback || ((name) => { console.log(`[Api.leaveRoom] ${name}방에서 나갑니다.`); });
    let name = idToRoom[socket.id];
    if(roomToPName[name]) delete roomToPName[name][socket.id];
    
//     let clients = Object.keys(roomToPName[name]);
//     clients.forEach((clientId)=>{
//         console.log(clientId);
//         let client = idToSocket[clientId];
//         client.emit('peer-disconnect', {peerId: socket.id});
//     });
    
    if(socket.adapter.rooms[name]){
      socket.leave(name);
      let ids = Object.keys(socket.adapter.rooms[name].sockets);
      delete idToRoom[socket.id];
      let pNames = Object.values(roomToPName[name]);
      io.sockets.in(name).emit('peer-entered',ids, pNames);
      callback(name);
    }
};


io.on('connection', function (socket) {
  socket.on('msg', function (msg, callback) {
    let command;
    if(!msg.includes(' ')) command = [msg, '','',''];
    else command = msg.match(/(?:".+")|(?:[\w\.\/]+)/g);
    
    if(command[0] === 'readDir') Api.readDir(command[1], callback);
    else if(command[0] === 'readFile') Api.readFile(command[1], callback);
    else if(command[0] === 'read') Api.read(command[1], callback);
    else if(command[0] === 'writeFile') Api.writeFile(command[1], command[2], callback);
    else callback("그런 명령어는 없습니다.");
    
  });
  
  socket.on('join-room', (roomName, playerName, callback) => {
    Api.joinRoom(socket, roomName, playerName, callback);
  });
  
  socket.on('leave-room', (callback) => {
    Api.leaveRoom(socket, callback);
  });
  
  socket.on('disconnect', function(){
    let name = idToRoom[socket.id];
    if(!name) return;
    
    if(roomToPName[name]) delete roomToPName[name][socket.id];
    
    if(socket.adapter.rooms[name]){
      let ids = Object.keys(socket.adapter.rooms[name].sockets);
      delete idToRoom[socket.id];
      
      let pNames = Object.values(roomToPName[name]);
      io.sockets.in(name).emit('peer-entered',ids, pNames);
    }
  });
  
});

app.use(express.static('src'));
server.listen(3000);