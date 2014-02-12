window.onload = function() {
	var input_username = document.getElementById("content-right-side-user");
	var input_messages = document.getElementById("content-right-side-text");
	var input_pm = document.getElementById("content-right-side-pm");
	var input_rm = document.getElementById("content-right-side-room");
	var header_logo = document.getElementById("header-logo");
	var nav_about = document.getElementById("nav-right-about");
	var nav_clear = document.getElementById("nav-right-log-clear");
	var nav_logout = document.getElementById("nav-right-logout");
	var nav_room_leave = document.getElementById("nav-right-room-leave");
	var nav_room_join = document.getElementById("nav-right-room-join");
	var nav_pm = document.getElementById("nav-right-pm");
	Core.hash.listen();
	if(Core.x) Core.alert.out("Debug mode on");
	try {
		Core.io = io.connect(Core.url);
	} catch(e) {
		input_username.style.color = 'rgb(170,170,170)';
		input_username.value = "Server Offline";
		input_username.disabled = 'true';
		Core.hash.listen();
		window.addEventListener('hashchange',function() {
			Core.hash.listen();
		});
		Core.loaded._ls = true;
		Core._reload(function() {
			window.onload();
		});
		return false;
	}
	Core.io.on('_ls',function(a) {
		Core.room.update(a,function() {
			Core.loaded._ls = true;
		});
	});
	Core.io.on('alert',function(a) {
		if(a.rm) Core.room.ls = a.rm;
		Core.alert.out(a.message,'hide',20000);
	});
	Core.io.on('command',function(a) {
		Core.parseCommand(a);
	});
	Core.io.on('disconnect',function(a) {
		try {
			var d = a.ls;
		} catch(e) {
			Core.alert.write("Connection lost...");
			Core.logout('CONN_LOST');
			Core.io.on('reconnect',function() {
				Core.reconnect();
			});
			return false;
		}
		Core.room.update(a);
		if(a.new_room) Core.alert.write(a.user+" has switched rooms to <b>"+a.new_room+"</b>");
		else Core.alert.write(a.user+" has left the chat");
	});
	Core.io.on('login',function(a) {
		Core.login(a);
	});
	Core.io.on('message',function(a) {
		Core._alert(a);
		Core.room.write(a);
	});
	Core.io.on('new',function(a) {
		Core.room.update(a);
		Core.alert.write(a.user+" has joined the chat");
	});
	Core.io.on('switch',function(a) {
		Core.room._connect(a);
	});
	Core.loaded.page = true;
	$("#content-left-home").on("click",".item-private-b",function() {
		Core.pm($(this).attr('sender'));
	});
	$('#content-right-side-authors-list').on('click','li.list-link',function() {
		var val = $(this).html();
		if($(this).hasClass('list-user')) {
			Core.pm(val);
		} else {
			Core.room.connect(val);
		}
	});
	input_username.focus();
	input_messages.addEventListener('keydown',function(e) {
		if(e.keyCode == 13) {
			e.preventDefault();
			if(this.value != "") {
				if(this.value.match(/^\//gi)) {
					Core.command(this);
				} else if(Core.user.pm) {
					if(input_pm.value != "") {
						var cmd = "/to "+input_pm.value+" "+this.value;
						Core.command(cmd);
						Core.pm();
					} else {
						Core.alert.out("Enter a user to direct message them");
						input_pm.focus();
					}
				} else {
					if(Core.user.muted) {
						Core.alert.write("You have been muted","-e");
					} else {
						var val = this.value;
						if(this.value.match(/^((http|https):\/\/)([^\n])+(png|gif|jpeg|jpg)$/gi)) {
							var name = this.value.split("/");
							name = name[name.length-1]
							val = "<a href='"+this.value+"' target='_blank'><img src='"+this.value+"' alt='"+this.value+"' title='"+this.value+"'/></a>"+name;
						}
						Core.room.emit(val);
					}
				}
				this.value = "";
			}
		}
	});
	input_rm.addEventListener('keydown',function(e) {
		if(e.keyCode == 13) {
			if(this.value == "") {
				Core.alert.out("Please enter a room name");
			} else {
				Core.command("/join "+this.value);
				Core.room.switch();
			}
		}
	});
	input_username.addEventListener('keyup',function(e) {
		if(e.keyCode == 13) {
			input_username.disabled = 'disabled';
			if(Core.user.ready) {
				if(!Core.user.locked) {
					Core.user.locked = true;
					Core.connect(this.value);
				}
			} else {
				input_username.removeAttribute('disabled');
			}
		} else {
			if(this.value.length > Core.user.minchars && this.value.length < Core.user.maxchars) {
				if(this.value.match(/[^a-z0-9\_\-]/gi)) {
					Core.alert.out("Username contains invalid characters");
					Core.user.ready = false;
				} else {
					Core.alert.out("Press ENTER to continue");
					Core.user.ready = true;
				}
			} else if(this.value.length <= Core.user.minchars) {
				if(this.value.length == 0) {
					Core.alert.out("Please enter a username");
				} else {
					Core.alert.out("Username doesn't contain enough characters");
				}
				Core.user.ready = false;
			} else if(this.value.length >= Core.user.maxchars) {
				Core.alert.out("Username contains too many characters");
				Core.user.ready = false;
			}
		}
	});
	header_logo.addEventListener('click',function() {
		window.location.assign("#!/home");
	});
	nav_about.addEventListener('click',function() {
		window.location.assign("#!/about");
	});
	nav_clear.addEventListener('click',function() {
		Core.command("/clear");
	});
	nav_logout.addEventListener('click',function() {
		Core.command("/bye");
	});
	nav_pm.addEventListener('click',function() {
		Core.pm();
	});
	nav_room_leave.addEventListener('click',function() {
		Core.command("/leave");
	});
	nav_room_join.addEventListener('click',function() {
		Core.room.switch();
	});
	window.addEventListener('blur',function() {
		Core.active = false;
	});
	window.addEventListener('focus',function() {
		Core.active = true;
		document.title = Core.title;
	});
	window.addEventListener('hashchange',function() {
		Core.hash.listen();
	});
};