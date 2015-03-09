var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

var messages = [];

messages.push({
  username: "Rex",
  type: "user",
  msg: "Hi!"
});

app.get('/messages', function(req, res){
  res.send(messages);
});

io.on('connection', function(socket){
  console.log('a user connected');
});

io.on('connection', function(socket){
  socket.on('user question', function(msg){
    messages.push(msg);

    if (msg.type === 'user') {
      io.emit('needs approval', msg);
    }
  });

  socket.on('question approved', function(response){
    messages.push(response.rep_response);
    messages.push(response.msg);
    io.emit('get approved questions', response);
  });
});

http.listen(3000, function(){
  console.log('listening on 3000');
});