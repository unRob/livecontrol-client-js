// var mdns = require('mdns');
var ws = require('nodejs-websocket');
var SerialPort = require("serialport").SerialPort;

// var browser = mdns.createBrowser(mdns.tcp('_livecontrol'));

// // browser.on('serviceUp', function(service) {
// //   console.log("service up: ", service);
// // });
// browser.start();

var server = "turing.local";
var port = 49170;

var found_server = function(server, port){
	ws.connect("ws://"+server+":"+port+"/control", function(){
		console.log("WS connected");
	});

	setup_tty();
};

var setup_tty = function(){
	var serialPort = new SerialPort("/dev/tty.usbmodem1412", {
	  baudrate: 9600
	});

	serialPort.on('data', function(d){
		console.log("data: "+d.toString());
	});
};

found_server(server, port);