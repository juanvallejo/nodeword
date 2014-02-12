var Core = {
	active:true,
	alert:{},
	errors:[],
	hash:{
		url:'home',
		rm:['home','rooms','users','help']
	},
	loaded:{
		_ls:false,
		node:false,
		page:false
	},
	page:{
		update:{}
	},
	room:{
		lobby:'lobby',
		ls:[],
		name:'undefined',
		mod:false,
		mods:[],
		switching:false
	},
	title:'Chat',
	user:{
		_ls:[],
		key:null,
		lastpm:null,
		ls:[],
		loggedin:false,
		locked:false,
		name:'undefined',
		maxchars:15,
		minchars:2,
		muted:false,
		pm:false,
		ready:false,
		room:false
	},
	url:undefined,
	x:false
};
Core._alert = function(a,b) {
	if(Core.user.loggedin) {
		if(!Core.active) {
			if(a.user != Core.user.name) {
				var b = b || "[New Message]";
				document.title = Core.title+" "+b;
			}
		}
	}
};
Core._help = function() {
	window.location.assign("#!/help");
};
Core._load = function() {
	var addr;
	 if(Core.x) {
	 	addr = 'http://localhost:8080/socket.io/socket.io.js';
	 	Core.url = 'http://localhost:8080';
	 } else {
	 	addr = 'https://pi-piengine.rhcloud.com:8443/socket.io/socket.io.js';
	 	Core.url = 'https://pi-piengine.rhcloud.com:8443/';
	 }
	var node = document.createElement("script");
	node.type = "text/javascript";
	node.src = addr;
	node.id = "script-node";
	var head = document.getElementsByTagName("head")[0];
	head.insertBefore(node,document.getElementsByTagName("script")[1]);
	node.addEventListener('load',function() {
		Core.loaded.node = true;
	});
};
Core._reload = function(a) {
	var callback = a;
	b();
	function b() {
		if(!Core.loaded.node) {
			var node = document.getElementById("script-node");
			Core.alert.out("Attemping to establish connection...");
			document.getElementsByTagName("head")[0].removeChild(node);
			Core._load();
			setTimeout(function() {
				b();
			},5000);
		} else {
			callback.call();
			Core.reconnect();
			Core.alert.out("Server connection established, welcome");
		}
	}
};
Core.alert.clear = function(a) {
	if(a === undefined) a = "content-right-side-alert";
	$('#'+a).html('');
};
Core.alert.out = function(a,b,c) {
	var delay,hide = false;
	if(b) {
		delay = c || 8000;
		hide = true;
		if(b == 'hide') {
			var b = "content-right-side-alert";
		} else {
			var b = b;
		}
	} else {
		var b = "content-right-side-alert";
	}
	$('#'+b).html(a);
	if(hide) {
		$('#'+b).show();
		$('#'+b).delay(delay).fadeOut('normal');
	} else {
		$('#'+b).fadeIn('normal');
	}
};
Core.alert.write = function(a,b,c) {
	var b = b || "-s";
	var data = {message:a};
	Core.room.write(data,b,c);
}
Core.command = function(a) {
	var val = typeof a == 'object' ? a.value.split(" ") : a.split(" ");
	var a = typeof a == 'object' ? a : {value:a};
	if(a.value.match(/^\/(bye|logout|logoff|quit|exit|q)$/gi)) {
		Core.logout();
	} else if(a.value.match(/^\/(leave|leave room|back|lobby)$/gi)) {
		Core.room.connect('lobby');
	} else if(a.value.match(/^\/(join|room|rm)(\ )([a-z0-9\_]+)/gi)) {
		var rm = val[1].toLowerCase();
		Core.room.connect(rm);
	} else if(a.value.match(/^\/(alert|to|pm|tell|whisper|dm|kick)(\ )([a-z0-9\_]+)/gi)) {
		if(val[2] || val[0] == "/kick") {
			var cmd,usr = val[1].toLowerCase();
			if(val[0] == "/kick") {
				if(Core.room.mod) cmd = "kick";
				else cmd = "NO_AUTH";
			} else if(val[0] == "/alert") {
				cmd = "alert";
			} else {
				cmd = "pm";
			}
			if(usr == Core.user.name.toLowerCase()) {
				if(cmd == "NO_AUTH") Core.alert.write("Nothing interesting happens");
				else Core.alert.out("You cannot "+cmd+" yourself");
			} else {
				var m = a.value;
				var mssg = a.value.replace(/^\/(alert|to|pm|tell|whisper|dm|kick)(\ )([a-z0-9\_]+)(\ )?/gi,'');
				Core.io.emit('command',{valid:true,command:cmd,message:mssg,target:val[1],user:Core.user.name});
			}
		} else {
			Core.alert.out("You must enter a message");
		}
	} else if(a.value.match(/\/(clear|clear all|clear chat|empty|empty chat)$/gi)) {
		Core.alert.write("Your chatlog has been cleared, you are talking in room <b>"+Core.room.name+"</b> as "+Core.user.name,"-r");
	} else if(a.value.match(/^\/(room|rooms|ls|list|list rooms)$/gi)) {
		window.location.assign("#!/rooms");
	} else if(a.value.match(/^\/(mute|unmute|mod|demod)(\ )([a-z0-9\_\-]+)/gi)) {
		if(val[1] == Core.user.name) {
			Core.alert.write("Nothing interesting happens");
		} else {
			if(Core.room.mod) {
				var cmd = val[0].split("/")[1];
				Core.io.emit('command',{valid:true,command:cmd,message:'',target:val[1],user:Core.user.name});
			} else {
				Core.alert.out("You are not allowed to perform that command");
			}
		}
	} else if(a.value.match(/^\/(help|\?)$/gi)) {
		Core._help();
	} else {
		Core.alert.out("Invalid command: "+a.value);
		Core._help();
	}
};
Core.connect = function(a,b,c) {
	if(typeof b == 'function' || !b) {
		c = b;
		b = Core.room.lobby;
	}
	Core.alert.out("loading, please wait...");
	if(Core.io) {
		Core.user.name = a;
		Core.io.emit('connect',{user:Core.user.name,room:b});
	} else {
		this.alert.out("Warning: io is not defined; unable to proceed");
	}
};
Core.hash.listen = function() {
	if(window.location.hash) {
		var hash = window.location.hash.split("#!/")[1];
		if(hash != "about") {
			$('#about').slideUp('normal');
			$('#wrapper-about a').attr('href','#!/about');
		}
		if($.inArray(hash,Core.hash.rm) != -1) {
			if(Core.hash.url != hash) {
				var width = $('#content-left-'+Core.hash.url).width()+"px";
				$('#nav-left ul.nav li').removeClass('nav-selected');
				$('#content-left-'+Core.hash.url).css('overflowX','hidden');
				$('#content-left-'+Core.hash.url).animate({width:'0'},330,function() {
					$('#nav-left-'+hash).addClass('nav-selected');
					$(this).css('overflowX','visible');
					$(this).hide();
					$('#content-left-'+hash).width(0);
					$('#content-left-'+hash).show();
					$('#content-left-'+hash).animate({width:width});
				});
				if(hash == "rooms" || hash == "users") {
					Core.page.update.client(hash);
				}
				Core.hash.url = hash;
			}
		} else if(hash == "about") {			
			$('#wrapper-about a').attr('href','#!/'+Core.hash.url);
			$('#about').slideDown('normal');
		} else {
			Core.alert.write("404 That page doesn't exist","-e");
			window.location.assign("#!/home");
			Core.hash.url = "home";
		}
	} else {
		window.location.assign("#!/home");
		Core.hash.url = "home";
	}
};
Core.login = function(a) {
	if(!a.nameTaken) {
		window.location.assign("#!/home");
		Core.user.key = a.key;
		Core.user.loggedin = true;
		Core.room.name = a.room;
		Core.user.room = true;
		Core.room.update(a);
		if(Core.room.name != Core.room.lobby) var msg = "Welcome "+Core.user.name+", you are now talking in room <b>"+Core.room.name+"</b>";
		else var msg = "Welcome "+Core.user.name+", you are talking in the lobby";
		Core.alert.write(msg,"-s");
		$('#content-right-side-user').fadeOut('normal',function() {
			$('.hide-on-loggin').fadeOut('normal',function() {
				$('.show-on-loggin').fadeIn('normal');
			});
			$('#content-right-side-text').fadeIn('normal');
			$('#content-right-side-text').focus();
			Core.alert.out("Welcome to the lobby",'hide',10000);
		});
	} else {
		$('#content-right-side-user').removeAttr('disabled');
		Core.user.locked = false;
		Core.alert.out("That username is currently in use");
	}
};
Core.logout = function(a,b) {
	if(Core.user.loggedin) {
		if(a == 'CONN_LOST') {
			$('#content-right-side-text').css('color','#aaa');
			$('#content-right-side-text').val("Server Offline"); 
			$('#content-right-side-text').attr('disabled','true');
		} else Core.alert.write("Disconnecting, please wait...");
		Core.io.emit('logout',b);
		Core.io.on('logout',function() {
			Core.user.loggedin = false;
			Core.user.key = 0;
			Core.room.name = Core.room.lobby;
			Core.user.room = false;
			Core.user.locked = false;
			$('#content-right-side-text').fadeOut('normal',function() {
				$('#content-right-side-user').fadeIn('normal');
				$('#content-right-side-user').removeAttr('disabled');
				$('#content-right-side-user').focus();
			});
		});
	} else {
		if(a == 'CONN_LOST') {
			$('#content-right-side-user').css('color','#aaa');
			$('#content-right-side-user').val("Server Offline"); 
			$('#content-right-side-user').attr('disabled','true');
		}
	}
	if(a == 'CONN_LOST') {
		Core.alert.out("Server connection lost, attempting to reconnect...");
	}
	$('.show-on-loggin').fadeOut('normal',function() {
		$('.hide-on-loggin').fadeIn('normal');
	});
	$('.hide-on-logout').fadeOut('normal');
	$('#content-right-side-authors-list').html('');
};
Core.page.update.client = function(hash) {
	var timeout;
	function a() {
		if(Core.loaded._ls) {
			clearTimeout(timeout);
			Core.alert.write("Listing all current "+hash,"-r","content-left-"+hash);
			if(hash == "rooms") {
				for(var i=0;i<Core.room.ls.length;i++) {
					Core.alert.write("Room name: <b>"+Core.room.ls[i]+"</b>","-w","content-left-"+hash);
				}
				if(Core.room.ls.length == 0) {
					Core.alert.write("There are currently no rooms open","-r","content-left-"+hash);
				}
			} else {
				for(var i=0;i<Core.user._ls.length;i++) {
					Core.alert.write("User name: <b>"+Core.user._ls[i]+"</b>","-w","content-left-"+hash);
				}
				if(Core.user._ls.length == 0) {
					Core.alert.write("There are currently no people online","-r","content-left-"+hash);
				}
			}
		} else {
			Core.alert.write("Loading, please wait...","-r","content-left-"+hash);
			timeout = setTimeout(function() {
				a();
			},1000);
		}
	}
	a();
};
Core.parseCommand = function(a) {
	if(a.command == "kick") {
		var reason = a.message || "no reason given";
		if(Core.room.name == Core.room.lobby) Core.logout();
		else Core.room.connect(Core.room.lobby);
		Core.alert.out("You have been kicked by "+a.user+" (reason: "+reason+")","hide",50000);
	} else if(a.command == "mute") {
		if(Core.user.muted) {
			Core.user.muted = false;
			Core.alert.write("You have been unmuted by "+a.user);
		} else {
			Core.user.muted = true;
			Core.alert.write("You have been muted by "+a.user);
		}
	} else if(a.command == "unmute") {
		Core.user.muted = false;
		Core.alert.write("You have been unmuted by "+a.user);	
	} else if(a.command == "mod") {
		if(a.target == Core.user.name) Core.room.mod = true;
		if(Core.room.mods.indexOf(a.target) == -1) {
			Core.room.mods.push(a.target);
			Core.room.update(a);
		}
	} else if(a.command == "demod") {
		if(a.target == Core.user.name) {
			Core.room.mod = false;
			Core.alert.out("You have been demoted by "+a.user);
		}
		if(Core.room.mods.indexOf(a.target) != -1) Core.room.mods.splice(Core.room.mods.indexOf(a.target),1);
		else {
			if(Core.user.name == a.user) Core.alert.out(a.target+" is not currently a room moderator");
		}
		Core.alert.write(a.target+" is no longer a moderator");
		Core.room.update(a);
	}
};
Core.pm = function(a) {
	if(Core.user.loggedin) {
		if(Core.user.pm) {
			if(a) {
				$('#content-right-side-pm').attr("value",a);
				$('#content-right-side-text').focus();
			} else {
				Core.user.pm = false;
				$('#nav-right-pm').removeClass('icon-active');
				$('#content-right-side-pm').fadeOut('normal',function() {
					$('#content-right-side-text').focus();
				});
			}
		} else {
			Core.user.pm = true;
			$('#nav-right-pm').addClass('icon-active');
			$('#content-right-side-pm').fadeIn('normal',function() {
				if(a) {
					$(this).attr('value',a);
					$('#content-right-side-text').focus();
				} else $(this).focus();
			});
		}
	}
};
Core.reconnect = function() {
	$('#content-right-side-text').css('color','rgb(100,91,94)');
	$('#content-right-side-text').val(""); 
	$('#content-right-side-text').removeAttr('disabled');
	$('#content-right-side-user').css('color','rgb(100,91,94)');
	$('#content-right-side-user').val(""); 
	$('#content-right-side-user').removeAttr('disabled');
	$('#content-right-side-user').focus();
	Core.alert.out("Server connection restored","hide");
};
Core.room.connect = function(a) {
	if(Core.user.loggedin) {
		if(a == Core.room.name) {
			Core.alert.write("You are already in that room");
		} else {
			if(a == Core.room.lobby) $('#nav-right-room-leave').fadeOut('normal');
			else $('#nav-right-room-leave').fadeIn('normal');
			Core.alert.write("Leaving "+Core.room.name+"...");
			Core.io.emit('switch',{old_room:Core.room.name,new_room:a,user:Core.user.name});
		}
	}
};
Core.room._connect = function(b) {
	Core.room.ls = b.rm;
	Core.room.mod = b.mod;
	Core.room.mods = b.mods;
	Core.room.name = b.room;
	Core.room.update(b);
	if(Core.room.name != Core.room.lobby) var msg = "Welcome "+Core.user.name+", you are now talking in room <b>"+Core.room.name+"</b>";
	else var msg = "Welcome "+Core.user.name+", you are talking in the lobby";
	Core.alert.write(msg,"-r");
	if(b.mod) {
		Core.alert.out("You have been assigned mod status for this room");
	}
};
Core.room.emit = function(a) {
	if(Core.user.room) {
		if(Core.user.loggedin) {
			Core.io.emit('message',{message:a,user:Core.user.name,room:Core.room.name});
		} else {
			Core.alert.out("You are not logged in");
		}
	}
};
Core.room.switch = function() {
	if(Core.room.switching) {
		Core.room.switching = false;
		$('#nav-right-room-join').removeClass('icon-active');
		$('#content-right-side-room').fadeOut('fast',function() {
			$('#content-right-side-text').slideDown('normal').focus();
		});
	} else {
		Core.room.switching = true;
		$('#nav-right-room-join').addClass('icon-active');
		$('#content-right-side-text').slideUp('fast',function() {
			$('#content-right-side-room').fadeIn('normal').focus();
		});
	}
};
Core.room.update = function(a,b) {
	if(Core.user.loggedin && !a._ls) {
		Core.user.ls = a.ls;
		Core.room.ls = a.rm;
		if(a.new_room) Core.room.ls.push(a.new_room);
		for(var i=0,e="";i<Core.user.ls.length;i++) {
			var adm = "";
			if(Core.room.mods) {
				if(Core.room.mods.length > 0) {
					if(Core.room.mods.indexOf(Core.user.ls[i]) != -1) adm = " class='mod' title='room admin'";
				}
			}
			if(Core.user.ls[i] == Core.user.name) e += "<ul class='list'><li class='list-active'>"+Core.user.ls[i]+"</li><li class='list-active'>"+Core.room.name+"</li></ul>";
			else e += "<ul class='list'><li class='list-link list-user'>"+Core.user.ls[i]+"</li><li class='list-link'>"+Core.room.name+"</li></ul>";
		}
		$('#content-right-side-authors-list').html(e);
	} else {
		if(a._ls) {
			Core.room.ls = a.rm;
			Core.user._ls = a.ls;
			if(a.clients) {
				if(a.beforeLoggin || Core.room.name == Core.room.lobby) {
					var e = "";
					for(var i in a.clients) {
						Core.user.ls.push(a.clients[i].name);
						if(a.clients[i].name == Core.user.name) e += "<ul class='list'><li class='list-active'>"+a.clients[i].name+"</li><li class='list-active'>"+a.clients[i].room+"</li></ul>";
						else e += "<ul class='list'><li class='list-link list-user'>"+a.clients[i].name+"</li><li class='list-link'>"+a.clients[i].room+"</li></ul>";
					}
					if(e == "") e = "<ul class='list'><li class='list-disabled'>Chat Empty</li><li class='list-disabled'>N / A</li></ul>";
					$('#content-right-side-authors-list').html(e);
				}
			} else {
				if(Core.hash.url == "rooms" || Core.hash.url == "users") {
					Core.page.update.client(Core.hash.url);
				}
			}
		}
	}
	if(typeof b == "function") b.call(this);
};
Core.room.write = function(a,b,c) {
	if(a.err) b = "-e";
		if(a.command) {
			if(a.command == "pm") {
				if(a.err) Core.alert.out(a.message);
				else {
					var from,klass;
					if(a.user == Core.user.name) {
						from = 'to '+a.target;
						klass = 'item-private-a'
					} else {
						from = 'from '+a.user;
						klass = 'item-private-b';
					}
					$('#content-left-home').prepend("<div class='item "+klass+"' style='display:none;'>"+a.message+"<div class='item-footer'>Private message "+from+"</div></div>");
					$('#content-left-home .item:first-child').attr('sender',a.user);
					$('#content-left-home .item:first-child').slideDown('normal');
				}
			} else if(a.command == "alert") {
				if(a.user == Core.user.name) {
					Core.alert.out("Alert sent to "+a.target+": "+a.message);
				} else {
					Core.alert.out(a.message,"hide",15000);
				}
			}
		} else {
				var id = c || 'content-left-home';
				var month = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
				var d = new Date(),pm = "AM";
				var mo = d.getMonth(),dy = d.getDate(),yr = d.getFullYear(),hr = d.getHours(),mi = d.getMinutes();
				if(hr > 12) {
					hr -= 12;
					pm = "PM";
				}
				if(mi < 10) mi = "0"+mi;
				var time = month[mo]+" "+dy+", "+yr+", "+hr+":"+mi+" "+pm;
				var user = a.user == Core.user.name ? 'me' : a.user;
				if(!b) $('#content-left-home').prepend("<div class='item' style='display:none;'>"+a.message+"<div class='item-footer'>Written by <b>"+a.user+"</b> on "+time+"</div></div>");
				else {
					if(b == "-r") $('#'+id).html('');
					if(b == "-e") $('#'+id).prepend("<div class='item item-error' style='display:none;'>"+a.message+"<div class='item-footer'>Sent on "+time+"</div></div>");
					else if(b == "-w") $('#'+id).prepend("<div class='item' style='display:none;'>"+a.message+"<div class='item-footer'>Sent on "+time+"</div></div>");
					else $('#'+id).prepend("<div class='item item-system' style='display:none;'>"+a.message+"<div class='item-footer'>Sent on "+time+"</div></div>");
				}
				$('#'+id+' .item:first-child').slideDown('normal');
		}
};
Core.title = document.getElementsByTagName('title')[0].innerHTML;
Core._load();