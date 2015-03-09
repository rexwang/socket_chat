exports.initialize = function(server) {

	// Since socket.io works with the communication layer, we need to set
	// it up to listen to the http server
	var io = require('socket.io').listen( server );
	io.configure('development', function(){
		io.set('transports', ['xhr-polling']);
	});

	// data contains all the HTTP request information and the accept is a callback
	// The authorization method is called when the socket.io connection is requested
	// but before it is established
	io.set('authorization', function(data, accept) {
		if ( data.headers.cookie ) {
			data.cookie = require('cookie').parse(data.headers.cookie);
			data.sessionID = data.cookie['express.sid'].split('.')[0];
			data.nickname = data.cookie['nickname'];
		} else {
			return accept('No cookie transmitted.', false);
		}

		accept(null, true);
	});

	var self = this;

	this.chatInfra = io.of('/chat_infra');
	this.chatInfra.on('connection', function(socket) {

		socket.on('join_room', function( room ) {

			// Fetch the nickname from the socket.handshake property
			var nickname = socket.handshake.nickname;

			socket.set('nickname', nickname, function() {
				socket.emit('name_set', {
					'name': socket.handshake.nickname
				});

				socket.send(JSON.stringify({
					type: 'serverMessage',
					message: 'Welcome to Turbo1003'
				}));

				socket.join( room.name );

				// Join the room in the chat_com namespace
        // To do this, we will need to obtain the socket object,
        // corresponding to the current socket object in the chat_com
        // namespace and then call the join method.
        // To get the corresponding socket object on chat_com, we fetch it
        // using the current socket object's id form the scokets array in the
        // chat_com namespace object
				var comSocket = self.chatCom.sockets[ socket.id ];
				comSocket.join( room.name );

				comSocket.room = room.name;
				socket.in( room.name ).broadcast.emit('user_entered', {'name': nickname});
			});

		});

		socket.on('get_rooms', function() {
			var rooms = {};

			for ( var room in io.sockets.manager.rooms ) {
				if ( room.indexOf('/chat_infra/') == 0 ) {
					var roomName = room.replace('/chat_infra/', '');
					rooms[roomName] = io.sockets.manager.rooms[room].length;
				}
			}

			socket.emit('room_list', rooms);
		});
	});

	this.chatCom = io.of('/chat_com');
	this.chatCom.on('connection', function(socket) {
		socket.on('message', function(message) {
      message = JSON.parse( message );
      if ( message.type == 'userMessage' ) {
        socket.get('nickname', function(err, nickname) {
          message.username = nickname;
          
          socket.in( socket.room ).broadcast.send( JSON.stringify( message) );
          message.type = 'myMessage';
          socket.send( JSON.stringify( message ) );
        });
      }
		});
	});

};
