let express = require('express');  
let app = express();  
let server = require('http').createServer(app);  
let io = require('socket.io')(server);
// var p2p = require('socket.io-p2p-server').Server;
let fs = require('fs'); 

let idToRoom = {};
let roomToPName = {};
let idToSocket = {};
let idToHp = {};

let Api = {
  dir : './src',
  readDir : function(path, callback){
    callback = callback || ((files) => { console.log(files); });
    fs.readdir(`${this.dir}${path}`, 'utf8', (err, files) => {
      callback(files);
    });  
  },
  readFile : function(path, callback){
    callback = callback || ((text) => { console.log(text); });
    fs.readFile(`${this.dir}${path}`, 'utf8', (err, text) => {
      callback(text);
    });  
  },
  read : function(path, callback){
    if(path.match(/^.+?\/?\w+?\.\w+$/g))
        this.readFile(path, callback);
    else
        this.readDir(path, callback);
  },
  writeFile : function(path, data, callback){
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
  },
  joinRoom : function(socket, name, playerName, callback){
    callback = callback || ((name) => { console.log(`[Api.joinRoom] ${name}방에 접속합니다.`); });
    if(!io.sockets.adapter.sids[socket.id][name]){
      idToRoom[socket.id] = name;
      if(!roomToPName[name]) roomToPName[name] = {};
      roomToPName[name][socket.id] = playerName;
      socket.join(name);

      idToHp[socket.id] = 100;

      let ids = Object.keys(socket.adapter.rooms[name].sockets);
      let pNames = Object.values(roomToPName[name]);
      let hps = ids.map((id)=> idToHp[id]);

      io.sockets.in(name).emit('peer-entered',ids, pNames, hps);
      socket.on('peer-msg', msg => { 
        socket.broadcast.to(name).emit('peer-msg', msg) 
      });
      socket.on('other-shooted', id =>{
        //console.log(`${id}가 총알에 맞았습니다.`);
        let delta = 5;
        if(0 < idToHp[id] - delta) idToHp[id] = idToHp[id] - delta;
        else idToHp[id] = 0;

        io.sockets.in(name).emit('hp-changed', {id: id, hp: idToHp[id]});
        if(idToHp[id] === 0) this.leaveRoom(idToSocket[id]);
      
      });
      let cnt = ids.length;
      callback(name,cnt);
    }else{;
    }
  },
  leaveRoom : function(socket, callback){
    callback = callback || ((name) => { console.log(`[Api.leaveRoom] ${name}방에서 나갑니다.`); });
    let name = idToRoom[socket.id];
    if(roomToPName[name]) delete roomToPName[name][socket.id];
    
    if(socket.adapter.rooms[name]){
      socket.leave(name);
      let ids = Object.keys(socket.adapter.rooms[name].sockets);
      delete idToRoom[socket.id];
      delete idToHp[socket.id];
      let pNames = Object.values(roomToPName[name]);
      io.sockets.in(name).emit('peer-entered',ids, pNames);
      callback(name);
    }
  }
}



io.on('connection', function (socket) {
  idToSocket[socket.id] = socket;
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
    delete idToSocket[socket.id];
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
server.listen(process.env.PORT || 3000);