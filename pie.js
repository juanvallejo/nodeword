#!/bin/env node
var port = process.env.OPENSHIFT_INTERNAL_PORT || 8080,ip = process.env.OPENSHIFT_INTERNAL_IP;
var express = require('express')(),Pi = require('http').createServer(express),io = require('socket.io');
Pi.listen(port,ip,function() {
	console.log("Pi server started, listening on port "+port);
});
var u = {
	_ls:[],
	client:{},
	key:{},
	rm:{
		ls:[]
	}
};
io.listen(Pi).on('connection',function(a) {
	var Core = this;
	a.emit('_ls',_getls({beforeLoggin:true}));
	a.on('_ls',function() {
		a.emit('_ls',_getls());
	});
	a.on('alert',function(b) {
		this.sockets.emit('alert',{message:b.message});
	});
	a.on('command',function(b) {
		var data = {message:b.message,target:b.target,command:b.command,user:b.user,valid:true};
		if(b.valid) {
			var exists = false,targ;
			for(var i=0;i<u._ls.length;i++) {
				if(b.target.toLowerCase() == u._ls[i].toLowerCase()) {
					exists = true;
					targ = u._ls[i];
				}
			}
			if(b.command == "pm" || b.command == "kick" || b.command == "alert") {
				if(exists) {
					var socket = u.key[targ];
					if(b.command == "pm" || b.command == "alert") {
						a.emit('message',data);
						Core.sockets.socket(socket).emit('message',data);
					} else if(b.command == "kick") {
						var client = u.client[a.id];
						if(u.rm[client.room].ls.indexOf(b.target) != -1) {
							Core.sockets.socket(socket).emit('command',data);
							data.err = "NO_ERR";
							data.message = b.target+" has been kicked";
						} else {
							data.err = "USR_NOT_FOUND";
							data.message = b.target+" is not in your room";
						}
						a.emit('message',data);
					}
				} else a.emit('message',{err:'USR_NOT_FOUND',message:b.target+' is offline',command:'pm'});
			} else if(b.command == "mute" || b.command == "unmute" || b.command == "mod" || b.command == "demod") {
				if(exists) {
					var client = u.client[a.id],action = b.command == "mute" ? 'muted' : 'unmuted';
					if(u.rm[client.room].ls.indexOf(b.target) != -1) {
						data.err = "NO_ERR";
						data.message = b.target+" has been "+action;
						if(b.command == "mod" || b.command == "demod") {
							if(b.command == "mod") {
								u.rm[client.room].mods.push(b.target);
								data.message = b.target+" is now a room moderator";
								data.mods = u.rm[client.room].mods;
								data.ls = u.rm[client.room].ls;
								data.rm = u.rm.ls;
							} else {
								u.rm[client.room].mods.splice(u.rm[client.room].mods.indexOf(b.target),1);
								data.message = b.target+" is no longer a room moderator";
								data.mods = u.rm[client.room].mods;
								data.ls = u.rm[client.room].ls;
								data.rm = u.rm.ls;
							}
							Core.sockets.in(client.room).emit('command',data);
						} else Core.sockets.socket(u.key[targ]).emit('command',data);
					} else {
						data.err = "USR_NOT_FOUND";
						data.message = b.target+" is not in your room";
					}
				} else {
					data.err = "USR_NOT_FOUND";
					data.message = b.target+" is offline";
				}
				a.emit('message',data);
			} else if(b.command == "NO_AUTH") {
				a.emit('message',{err:'NO_AUTH',message:'You are not allowed to perform this command'});
			} else {
				a.emit('message',{err:'CMD_NOT_EXIST',message:'That command does not exist: '+b.command});	
			}
		} else {
			a.emit('message',{err:'CMD_INVALID',message:'Invalid command: '+b.command});
		}
	});
	a.on('connect',function(b) {
		var exists = false;
		for(var i=0;i<u._ls.length;i++) {
			if(b.user.toLowerCase() == u._ls[i].toLowerCase()) {
				exists = true;
			}
		}
		if(!exists) {
			var opt = {};
			u._ls.push(b.user);
			u.client[a.id] = {name:b.user,room:b.room};
			u.key[b.user] = a.id;
			if(b.room) {
				var mod;
				if(u.rm.hasOwnProperty(b.room)) {
					mod = false;
				} else {
					u.rm[b.room] = {};
					u.rm[b.room].data = {};
					u.rm[b.room].ls = [];
					u.rm.ls.push(b.room);
					mod = true;
				}
				u.rm[b.room].data[b.user] = {user:b.user,key:a.id,admin:mod};
				u.rm[b.room].ls.push(b.user);
				opt.room = b.room;
				opt.ls = u.rm[b.room].ls;
				a.join(b.room);
			}
			opt.rm = u.rm.ls;
			opt.user = b.user;
			opt.key = a.id;
			opt.nameTaken = false;
			a.emit('login',opt);
			if(b.room) {
				opt.room = true;
				if(!mod) {
					a.broadcast.to(b.room).emit('new',opt);
				}
			} else {
				opt.room = false;
				a.broadcast.emit('new',opt);
			}
			Core.sockets.in('lobby').emit('_ls',_getls());
			Core.sockets.emit('_ls',_getls({clients:false}));
		} else {
			a.emit('login',{nameTaken:true});
		}
	});
	a.on('disconnect',end);
	a.on('logout',end);
	a.on('message',send);
	a.on('switch',function(b) {
		var ls,rm;
		end("NEW_ROOM",b.new_room,function() {
			var mod;
			if(u.rm.hasOwnProperty(b.new_room)) {
				mod = false;
			} else {
				u.rm[b.new_room] = {};
				u.rm[b.new_room].data = {};
				u.rm[b.new_room].ls = [];
				u.rm[b.new_room].mods = [];
				u.rm.ls.push(b.new_room);
				mod = true;
			}
			u.client[a.id].name = b.user;
			u.client[a.id].room = b.new_room;
			u.rm[b.new_room].mod = false;
			u.rm[b.new_room].data[b.user] = {user:b.user,key:a.id,admin:mod};
			u.rm[b.new_room].ls.push(b.user);
			ls = u.rm[b.new_room].ls;
			rm = u.rm.ls;
			mods = u.rm.mods;
			a.join(b.new_room);
			var data = {room:b.new_room,ls:ls,rm:rm,user:b.user,lsrm:u.lsrm};
			if(mod) {
				var message;
				if(b.new_room != 'lobby') {
					message = 'A new room <b>'+b.new_room+'</b> has been created';
					u.rm[b.new_room].mod = true;
					u.rm[b.new_room].mods.push(b.user);
					Core.sockets.emit('alert',{message:message,rm:u.rm.ls});
				}
			} else {
				a.broadcast.to(b.new_room).emit('new',data);
			}
			data.mod = u.rm[b.new_room].mod;
			data.mods = u.rm[b.new_room].mods;
			a.emit('switch',data);
			Core.sockets.in('lobby').emit('_ls',_getls());
			Core.sockets.emit('_ls',_getls({clients:false}));
		});
	});
	function end(b,c,d) {
		var b = b || false;
		var user = u.client[a.id],rmdel = false;
		if(user) {
			var data = {};
			a.leave(user.room);
			data.user = user.name;
			u.rm[user.room].ls.splice(u.rm[user.room].ls.indexOf(user.name),1);
			if(u.rm[user.room].mod) u.rm[user.room].mods.splice(u.rm[user.room].mods.indexOf(user.name),1);
			delete u.rm[user.room].data[user.name];
			data.ls = u.rm[user.room].ls;
			data.uniquetest = u.rm[user.room].ls;
			data.oldroomname = user.room;
			if(u.rm[user.room].ls.length == 0) {
				delete u.rm[user.room];
				rmdel = true;
				u.rm.ls.splice(u.rm.ls.indexOf(user.room),1);
			}
			data.rm = u.rm.ls;
			data.room = rmdel;
			if(b == "NEW_ROOM") data.new_room = c;
			else {
				u._ls.splice(u._ls.indexOf(user.name),1);
				delete u.client[a.id];
				delete u.key[user.name];
				a.emit('logout');
			}
			a.broadcast.to(user.room).emit('disconnect',data);
			Core.sockets.in('lobby').emit('_ls',_getls());
			Core.sockets.emit('_ls',_getls({clients:false}));
			if(rmdel) {
				Core.sockets.emit('alert',{message:user.room+" is now empty and has been incinerated"});
			}
			if(typeof d == 'function') {
				d.call(this);
			}
		} else {
			a.emit('logout');
		}
	}
	function _getls(a) {
		var data = {ls:u._ls,clients:u.client,rm:u.rm.ls,_ls:true,beforeLoggin:true};
		var out = {};
		for(var i in data) {
			out[i] = data[i];
		}
		for(var i in a) {
			out[i] = a[i];
		}
		return out;
	}
	function send(b) {
		var date = new Date();
		var data = {},time = date.getTime();
		data.user = b.user;
		data.message = b.message;
		data.room = false;
		if(b.room) {
			data.room = true;
			Core.sockets.in(b.room).emit('message',data);
		} else {
			Core.sockets.emit('message',data);
		}
	}
});