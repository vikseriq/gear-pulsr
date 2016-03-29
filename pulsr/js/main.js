/**
 * Pulsr
 *
 * Real time heart rate monitor standalone app for Gear S
 *
 * @author vikseriq
 * @license MIT
 */
'use strict';
var hrmEnabled = false, hrmData = -1, timeStart = null, hrLog = [], _sum = 0, _n = 0;
var debug = false;
var elWatch, elPulse, elInfo, elLog;

window.requestAnimationFrame = window.requestAnimationFrame
		|| window.webkitRequestAnimationFrame || window.oRequestAnimationFrame
		|| function(callback) {
			window.setTimeout(callback, 1000 / 2);
		};

/**
 * HR sensor data callback.
 * Accumulate each five precise values and push average in log
 *
 * @param motionInfo
 */
function hrmSensorCallback(motionInfo) {
	hrmData = motionInfo.heartRate;
	// only precise results
	if (motionInfo.rRInterval === 0 && hrmData > 0) {
		_sum += hrmData;
		_n++;
		// flush to log
		if (_n >= 5) {
			hrLog.push(Math.round(_sum / _n));
			_sum = _n = 0;
		}
	}
}

/**
 * Controlling state of HR sensor
 *
 * @param enable
 *            enable or disable sensor
 */
function hrmControl(enable) {
	if (hrmEnabled === enable) {
		return;
	}
	if (enable) {
		console.log("HRM on");
		hrmEnabled = true;
		webapis.motion.start("HRM", hrmSensorCallback);
	} else {
		console.log("HRM off");
		hrmEnabled = false;
		webapis.motion.stop("HRM");
	}
}

/**
 * getDate wrapper
 *
 * @returns {Date}
 */
function getDate() {
	var date;
	try {
		date = tizen.time.getCurrentDateTime();
	} catch (err) {
		date = new Date();
	}
	return date;
}

/**
 * Format date as hh:ii::ss
 *
 * @param date Date
 * @returns {String}
 */
function date2timestr(date) {
	return ("00" + date.getHours()).slice(-2) + ":"
			+ ("00" + date.getMinutes()).slice(-2) + ":"
			+ ("00" + date.getSeconds()).slice(-2);
}

/**
 * Update clock and stat with autoloop
 */
function uiRefresh() {
	var hr = hrmData, date = getDate(), nextTick = (1000 - date
			.getMilliseconds()), time = date2timestr(date),
	// stat's variables
	sum = 0, n = 0, max = -1, min = 999;

	// readable edge states
	if (hr < 0) {
		hr = "off";
	} else if (hr === 0) {
		hr = "wait";
	}

	if (timeStart === null) {
		timeStart = date;
		elInfo.innerHTML = date2timestr(timeStart);
	}
	elWatch.innerHTML = time;
	elPulse.innerHTML = hr;

	// update stat
	if (date.getSeconds() % 4 === 0) {
		hrLog.map(function(e) {
			if (e > 0) {
				max = Math.max(e, max);
				min = Math.min(e, min);
				sum += e;
				n++;
			}
		});
		if (n > 0) {
			elLog.innerHTML = "avg: " + Math.ceil(sum / n) + " max: " + max
					+ " min: " + min + (debug ? " _ " + hrLog.length : "");
		} else {
			elLog.innerHTML = debug ? "empty records: " + hrLog.length : "";
		}
	}

	// schedule for loop
	setTimeout(function() {
		window.requestAnimationFrame(uiRefresh);
	}, nextTick);
}

// entry point
window.onload = function() {
	// back button
	document.addEventListener('tizenhwkey', function(e) {
		if (e.keyName === "back") {
			hrmControl(false);
			setTimeout(tizen.application.getCurrentApplication().exit, 300);
		}
	});

	if (window.webapis && window.webapis.motion !== undefined) {
		hrmControl(true);
	} else {
		console.error('MotionAPIs not found');
		return;
	}

	elWatch = document.querySelector('#wtime');
	elPulse = document.querySelector('#pulse');
	elInfo = document.querySelector('#wtime_start');
	elLog = document.querySelector('#wlog');

	window.requestAnimationFrame(uiRefresh);
};
