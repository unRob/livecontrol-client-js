var mdns = require('mdns');
var ws = require('nodejs-websocket');
var SerialPort = require("serialport").SerialPort;

var browser = mdns.createBrowser(mdns.tcp('livecontrol'));

browser.on('serviceUp', function(service) {
  console.log("service up: ", service.host);
  var server = service.host;
  var port = service.port;
  found_server(server, port);
});
browser.start();

var client = null;

var found_server = function(server, port){
	client = ws.connect("ws://"+server+":"+port+"/control", function(){
		console.log("WS connected");
	});

	setup_tty();
};

var is_recording = false;

var setup_tty = function(){
	var serialPort = new SerialPort("/dev/ttyACM0", {
	  baudrate: 9600
	});

	serialPort.on('data', function(d){
		if (d.toString().match(/0/)) {

			var evt = is_recording? "stop" : "record";
			is_recording = !!is_recording;

			var rec = {
				evt: evt,
				data: {"track": "1", "clip": "1"}
			};
			client.sendText(JSON.stringify(rec));
		}
	});
};