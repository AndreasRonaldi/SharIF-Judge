/**
 * SharIF Judge
 * @file shj_recording.js
 * author: Andreas Ronaldi <andreasronaldi25@gmail.com>
 *
 *     Javascript codes for "Recording" page
 */

$(document).ready(() => {
	// ######################################################
	// ############           Variable           ############
	// ######################################################
	const editor = ace.edit("code_editor");
	const Range = ace.Range;

	let funcTimeoutRecording = null;
	let funcIntervalTimer = null;

	let curChart = null;
	let isRecPlaying = false;

	let confTimer = {
		delay: 1,
	}

	let confChart = {
		type: "bar",
		divider: 1,
		time: "s",
		stack: true,
		// fill: false,
		// step: false,
	};
	
	let confPlayer = {
		durationNext: 0
	}

	editor.setOptions({
		theme: "ace/theme/monokai",
		fontSize: "11pt",
		readOnly: true,
		enableLiveAutocompletion: true,
		enableBasicAutocompletion: true,
		enableSnippets: true,
	});

	const recording = {
		events: {}, // Map -> time events to list of events
		eventsIndex: {}, // Map -> index to time events
		indexEvents: {}, // Map -> time events to index
		length: -1, // Length of list of saved events
		curIndex: -1, // Currently selected index
		duration: 0, // Duration of events
		save_state: [], // Saved state to use in playback

		reset: () => {
			recording.events = {};
			recording.eventsIndex = {};
			recording.indexEvents = {};
			recording.length = -1;
			recording.curIndex = -1;
			recording.duration = 0;
			recording.save_state = [];
		},
	};

	const handlers = {
		insert: (args) => {
			// console.log([args.start.row, args.start.column]);
			// console.log("Testing: ", JSON.stringify(args.data.join("\n")), ".");
			// setSelection(editor, [args.start.row, args.start.column]);
			editor.session.replace(
				new ace.Range(
					args.start.row,
					args.start.column,
					args.start.row,
					args.start.column
				),
				args.data.join("\n")
			);
			// editor.selection.fromJSON({ start: args.start, end: args.start });
			// editor.insert(args.data.join(".\n."), -1);
			// editor.execCommand("insertstring", "a");
			// editor.session.insert("a");
			// editor.session.insert(
			// 	{ row: args.start.row, column: args.start.column },
			// 	args.data
			// ),
		},
		remove: (args) => {
			editor.session.remove({ start: args.start, end: args.end });
		},
		cursor_selection: (args) => {
			setSelection(editor, args);
		},
		sel_selection: (args) => {
			setSelection(editor, args);
		},
		focus: (args) => {
			setStatus("User is focus now");
			setTitle("User is focus now");
		},
		blur: (args) => {
			setStatus("User is not focus on website now");
			setTitle("User is not focus on website now");
		},
		visibility: (args) => {
			if (args) {
				setStatus("Open SharIF-Judge");
				setTitle("User is on SharIF-Judge now");
			} else {
				setStatus("Switching tabs");
				setTitle("User is on other tabs now");
			}
		},
		pdf_focus: (args) => {
			setStatus("User is focus on pdf viewer now");
			setTitle("User is focus on pdf viewer now");
		},
		pdf_blur: (args) => {
			setStatus("User is not focus on pdf viewer now");
			setTitle("User is not focus on pdf viewer now");
		},
		input_change: (args) => $("#editor_input").val(args),
		output_change: (args) => $("#editor_output").val(args),
		save: (args) => {
			setStatus("User just saved");
			setTitle("User just saved");
		},
		submit: (args) => {
			setStatus("User just submit!");
			setTitle("User just submit!");
		},
		execute: (args) => {
			setStatus("User is running the program.");
			setTitle("User is running the program.");
		},
	};

	const mult = {
		s: 1000,
		m: 1000 * 60,
		h: 1000 * 60 * 60,
		d: 1000 * 60 * 60 * 24,
		w: 1000 * 60 * 60 * 24 * 7,
		y: 1000 * 60 * 60 * 24 * 7 * 365.25,
	};

	const nameInChart = {
		insert: "Insert",
		remove: "Remove",
		cursor_selection: "Cursor Change",
		sel_selection: "Selection Change",
		focus: "Focus tabs",
		blur: "Unfocus tabs",
		visibility: "Change tabs",
		pdf_focus: "Focus PDF Viewer",
		pdf_blur: "Unfocus PDF Viewer",
		input_change: "Change Input",
		output_change: "Change Output",
		save: "Save",
		submit: "Submit",
		execute: "Execute",
	};

	// ######################################################
	// ############          Main Method         ############
	// ######################################################

	const getRecording = () => {
		setTitle("Loading...");
		setLoading(true);
		disabledInput(true);
		recording.reset();
		emptyEditor();

		console.log("GETTING recording/download_record/" + rec_path);

		$.ajax({
			type: "GET",
			url: shj.site_url + "recording/download_record/" + rec_path,
			cache: false,
			success: (data) => {
				console.log(data);
				recording.events = data;

				$("select#rec_selection").empty();

				recording.length = 0;

				Object.keys(data).forEach((c, i) => {
					// Push to table of saved
					$(`<tr>
							<td>${convTimeToEpoch(c)}</td>
							<td>${convTimeToEpoch(parseInt(c) + data[c][data[c].length - 1].time)}</td>
							<td id="sel_${c}" class="sel_recording">
								Select
							</td>
					</tr>`).appendTo("tbody#tbody_saved");

					$(`#sel_${c}`).click(() => setSelectedSaveTime(c));

					recording.eventsIndex[c] = i;
					recording.indexEvents[i] = c;
					recording.length++;

					recording.duration += data[c][data[c].length - 1].time;

					if (recording.curIndex === -1) {
						recording.curIndex = c;
					} else {
						recording.duration += confPlayer.durationNext;
					}
				});

				// console.log(recording.duration);

				$(`#range_player`).attr('max', recording.duration);
				$(`#sel_${recording.curIndex}`).text("Selected");
				$(`#sel_${recording.curIndex}`).addClass("sel_selected");
				disabledInput(false);
				setTitle("Ready!");
				setLoading(false);
				setStatus("Ready!");
				
				setUpChart();
			},
			error: function (error) {
				console.error(error);
			},
		});
	};

	const playRecording = (index) => {
		let events = recording.events[recording.curIndex];
		if (index >= events.length) {
			if (playNextRecording()) {
				setStatus("Playing Next");
				setTitle("Playing Next");
				return;
			} else {
				setStatus("Finish...");
				setTitle("Finish...");
				return;
			}
		}

		let event = events[index];
		let timeDiff = event.time - (index - 1 < 0 ? 0 : events[index - 1].time);

		handlers[event.event](event.args);
		// console.log(timeDiff, events[index]);
		// setStatus(true, event.event);

		while (timeDiff <= 0) {
			index++;
			event = events[index];
			timeDiff = event.time - events[index - 1].time;
			handlers[event.event](event.args);
		}

		funcTimeoutRecording = setTimeout(() => {
			playRecording(index + 1);
		}, timeDiff);
	};

	const startTimer = (time) => {
		const update = () => {
			let val = parseInt($(`#range_player`).val());
			// console.log("start", val);
			val += 1;
			// console.log("update", val);
			$(`#range_player`).val(val);
			updateTimerRange();
		}

		if (!funcIntervalTimer) {
			funcIntervalTimer = setInterval(
				update,
				confTimer.delay,
			);
		}
	}

	const playNextRecording = () => {
		if (recording.eventsIndex[recording.curIndex] < recording.length - 1) {
			// play next saved in 1 sec
			// recording.curIndex =
			// 	recording.indexEvents[recording.eventsIndex[recording.curIndex] + 1];

			setSelectedSaveTime(
				recording.indexEvents[recording.eventsIndex[recording.curIndex] + 1],
				false
			);

			funcTimeoutRecording = setTimeout(() => {
				emptyEditor();
				playRecording(0);
			}, confPlayer.durationNext);

			return true;
		}

		return false;
	};

	const stopTimer = () => {
		clearTimeout(funcIntervalTimer);
	}

	const stopRecording = () => {
		clearTimeout(funcTimeoutRecording);
	};

	// ######################################################
	// ############         Chart Method         ############
	// ######################################################

	const setUpChart = (
		index = recording.curIndex,
		type = confChart.type ? confChart.type : "bar",
		divider = confChart.divider ? confChart.divider : 1,
		time = confChart.time ? confChart.time : "s",
		stack = confChart.stack != undefined ? confChart.stack : true,
		step = confChart.step != undefined ? confChart.step : false,
		fill = confChart.fill != undefined ? confChart.fill : false
	) => {
		console.log(stack);
		if (curChart != null) curChart.destroy();

		let times = calcTimeForChart(recording.events[index], divider, time);
		let data = formatToChartData(recording.events[index], times);

		const ctx = document.getElementById("recording_chart");

		const dataChart = {
			labels: times.map((c) => c.time),
			datasets: Object.entries(data).map(([k, v]) => {
				return {
					label: nameInChart[k],
					data: v,
					fill: fill,
					stepped: step,
				};
			}),
		};

		const configChart = {
			type: type,
			options: {
				scales: {
					x: {
						stacked: stack,
					},
					y: {
						stacked: stack,
					},
				},
			},
		};

		const chart = new Chart(ctx, {
			...configChart,
			data: dataChart,
		});

		curChart = chart;
		return chart;
	};

	const formatToChartData = (arrEvent, arrTimes) => {
		let res = {};

		let idxTimes = 0;

		arrEvent.forEach((e) => {
			while (e.time > arrTimes[idxTimes].ms) {
				idxTimes++;
			}

			if (!res[e.event]) {
				res[e.event] = {};
			}

			if (!res[e.event][arrTimes[idxTimes].time]) {
				res[e.event][arrTimes[idxTimes].time] = 0;
			}

			res[e.event][arrTimes[idxTimes].time]++;
		});

		return res;
	};

	const calcTimeForChart = (arrEvent, divider, time) => {
		let res = [];

		let dev = calcTimeToMilliSec(divider, time);
		let max = arrEvent[arrEvent.length - 1].time;
		let i = 1;
		// console.log(dev);

		for (; dev * i < max; i++) {
			res.push({
				time: Math.floor(divider * i * 100) / 100 + time,
				ms: dev * i,
			});
		}

		res.push({
			time: Math.floor(divider * i * 100) / 100 + time,
			ms: dev * i,
		});

		return res;
	};

	const calcTimeToMilliSec = (divider, time) => {
		if (mult[time]) {
			return divider * mult[time];
		}

		return divider;
	};

	// ######################################################
	// ##########        Set Up Config Chart       ##########
	// ######################################################

	const setUpTimeDividerSelector = (selectID) => {
		Object.keys(mult).forEach((c) => {
			console.log();
			$(`
				<option value="${c}">
					${c}
				</option>
			`).appendTo(`#${selectID}`);
		});
	};

	// ######################################################
	// ##########       Listener Config Chart      ##########
	// ######################################################

	$("#config_chart_type").on("change", (e) => {
		let val = $("#config_chart_type").val();
		confChart.type = val;
		setUpChart();
	});

	$("#config_chart_stack").on("click", (e) => {
		let val = $("#config_chart_stack").prop("checked");
		confChart.stack = val;
		setUpChart();
	});

	$("#config_chart_divider").on("input", (e) => {
		let val = $("#config_chart_divider").val();
		if (val > 0) {
			console.log("Change divider to", val);
			confChart.divider = val;
			setUpChart();
		}
	});

	$("#config_chart_time").on("change", (e) => {
		let val = $("#config_chart_time").val();
		console.log("Change time to", val);
		confChart.time = val;
		setUpChart();
	});

	// ######################################################
	// ############           Listener           ############
	// ######################################################

	$("#rec_btn").click(() => {
		if (isRecPlaying) {
			// if recording is playing -> stop
			stopTimer();
			stopRecording();
			$("#rec_btn").text("Play");
		} else {
			// if recording is not played -> played in the time in input.
			emptyEditor();
			let firstIndex = recording.events[recording.curIndex].findIndex(
				(c) => c.time > 0
			);

			startTimer();
			playRecording(firstIndex);
			$("#rec_btn").text("Stop");
		}

		isRecPlaying = !isRecPlaying;
	});

	$("#range_player").on("change mousemove", function () {
		updateTimerRange();
	});

	// ######################################################
	// ############          Misc Method         ############
	// ######################################################

	function setSelection(editor, data) {
		let x = data;
		let start = { row: x[0], column: x[1] };
		let end = x.length == 2 ? start : { row: x[2], column: x[3] };
		let isBackwards = Range.comparePoints(start, end) > 0;
		editor.selection.fromJSON(
			isBackwards
				? {
						start: end,
						end: start,
						isBackwards: true,
				  }
				: {
						start: start,
						end: end,
						isBackwards: true,
				  }
		);
	}

	const emptyEditor = () => {
		editor.session.setValue("", -1);
	};

	const disabledInput = (bool) => {
		$("#rec_play").prop("disabled", bool);
		$("#rec_stop").prop("disabled", bool);
	};

	// Convert Timestamp to Epoch
	// https://stackoverflow.com/questions/10535782/how-can-i-convert-a-date-in-epoch-to-y-m-d-his-in-javascript
	const convTimeToEpoch = (timestamp) => {
		var date = new Date(parseInt(timestamp));

		var year = date.getFullYear();
		var month = date.getMonth() + 1;
		var day = date.getDate();
		var hours = date.getHours();
		var minutes = date.getMinutes();
		var seconds = date.getSeconds();

		return (
			year +
			"-" +
			month +
			"-" +
			day +
			" " +
			hours +
			":" +
			minutes +
			":" +
			seconds
		);
	};

	const setTitle = (title) => {
		$("#status_rec").text(title);
	};

	const setSelectedSaveTime = (time, stop = true) => {
		if (time == recording.curIndex) return;

		if (stop) stopRecording();
		$(`#sel_${recording.curIndex}`).text("Select");
		$(`#sel_${recording.curIndex}`).removeClass("sel_selected");

		recording.curIndex = time;
		$(`#sel_${time}`).text("Selected");
		$(`#sel_${time}`).addClass("sel_selected");

		setUpChart(time);
	};

	const setStatus = (text = "...") => {
		const status = $("#status_wrapper");

		status.show();
		status.text(text);

		setTimeout(() => {
			status.hide();
		}, 1000);
	};

	const setLoading = (bool) => {
		const mainEle = $("#recording_wrap");

		if (bool) {
			mainEle.hide();
		} else {
			mainEle.show();
		}
	};

	const updateTimerRange = (idRange = "#range_player", idSpan = `#timer_player`) => {
		const val = ($(idRange).val() / recording.duration) * 100;
		const ms = $(idRange).val();

		let seconds = ms / 1000;
		const hours = parseInt( seconds / 3600 ).toFixed(0); 
		seconds = seconds % 3600; 
		const minutes = parseInt( seconds / 60 ).toFixed(0);
		seconds = (seconds % 60).toFixed(0);

		const valTime = (hours > 0 ? (hours < 10 ? '0' : '') + hours + ":" : "") + (minutes < 10 ? '0' : '') + minutes + ":" + (seconds < 10 ? '0' : '') + seconds;

		$(idSpan).text(valTime);

		$(idRange).css(
			"background",
			"linear-gradient(to right, #cc181e 0%, #cc181e " +
				val +
				"%, #444 " +
				val +
				"%, #444 100%)"
		);
	}

	// ######################################################
	// ############            Runner            ############
	// ######################################################

	getRecording();

	// Runner Config
	setUpTimeDividerSelector("config_chart_time");
});
