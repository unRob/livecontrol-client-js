
var mdns = require('mdns');
var ws = require('nodejs-websocket');
var sp = require("serialport");
var SerialPort = sp.SerialPort;
var glob = require('glob');

var browser = mdns.createBrowser(mdns.tcp('livecontrol'));
browser.on('serviceUp', function(service) {
  console.log("Server found at "+service.host);
  connect(service.host, service.port);
  browser.stop();
});

var setup = function(){
	console.log("Looking for server...");
	browser.start();
	client = null;
	LIVE = false;
};
setup();

var client = null;
var pedales = {};
var LIVE = false;

/*
LEDS:
-1	transition	blue
0	off
1	recording
2	playing
*/

var scanUSB = function(){
	console.log("Looking for devices");
	glob("/dev/ttyACM*", function(err, files){
		if (err) {
			console.error(err);
		} else {
			files.forEach(function(file){
				var pedal = new SerialPort(file, {parity: 'none', parser: sp.parsers.readline("\n")});
				setTimeout(function(){
					register(pedal);
				}, 100);
			});
		}
	});
};
scanUSB();

var register = function(pedal) {
	var id = null;
	pedal.on("data", function(buffer){
		if (buffer.match(/^id/)) {
			id = buffer.replace(/\D/g, '');
			console.log("Device registered with ID <"+id+">");
			pedal.write("0");
			pedales[id] = {serial: pedal, id: id, recording: false};
		} else {
			if (!LIVE) {
				return false;
			}

			pedal = pedales[id];

			if (buffer !== "0") {
				pedal.expires = new Date().getTime() + 5000;
				setTimeout(function(){
					pedal.serial.write("3");
				}, 5000);
				// console.log("Buffer es:", buffer);
			} else {
				if (pedal.expires) {
					var now = new Date().getTime();
					var expires = pedal.expires;
					pedal.expires = null;

					if (now >= expires) {
						console.log("DELETING!");
						client.sendText(JSON.stringify({
							evt: "clip:delete",
							data: {track: id, clip: "0"}
						}));
						pedal.serial.write("0");
						return true;
					}
				}

				var evt = pedal.recording ? "stop" : "record";
				pedal.recording = !pedal.recording;

				var msg = {
					evt: evt,
					data: {"track": pedal.id, "clip": "0"}
				};

				console.log(msg);

				client.sendText(JSON.stringify(msg));
				pedal.serial.write("2");
			}
		}
	});

	pedal.write("?", function(err, res){
		if (err) {
			console.error("Error querying ID", err);
		} else {
			console.log("Getting ID for "+pedal.path);
		}
	});
};

var connect = function(host, port){
	console.log("Connecting to server...");
	client = ws.connect("ws://"+host+":"+port+"/control", function ConnectedToServer(){
		console.log("Connected to server at "+host+":"+port);
		LIVE = true;
	});

	client.on('close', function(){
		console.log("Lost server at "+host+":"+port);
		setup();
	});

	client.on('text', function(data){
		var msg = JSON.parse(data);

		if (['tick', 'tock'].indexOf(msg.evt) == -1) {
			console.log("Received: ", msg);
		}

		switch (msg.evt) {
			// case 'tick':
			// 	b[0] = 0x01;
			// 	// serialPort.write("1");
			// 	break;
			// case 'tock':
			// 	b[0] = 0x00;
			// 	// serialPort.write(b);
			// 	break;
			case 'track:info':
				console.log("track info: "+msg.data.status);
				pedales[msg.data.track].serial.write(msg.data.status.toString());
				break;
				// if (data.data.status === "2") {
				// 	console.log("Recording started for track "+data.data.track);
				// 	serialPort.write("3");
				// }
				// break;
			case 'clip:state':
				console.log("clip state: "+msg.data.status);
				pedales[msg.data.track].serial.write(msg.data.status.toString());
				break;
		}
	});
};