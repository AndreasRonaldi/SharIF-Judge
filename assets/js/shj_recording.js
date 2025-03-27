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
	let funcTimeout = null;

	editor.setOptions({
		theme: "ace/theme/monokai",
		fontSize: "11pt",
		readOnly: true,
		enableLiveAutocompletion: true,
		enableBasicAutocompletion: true,
		enableSnippets: true,
	});

	const recording = {
		events: {},
		eventsIndex: {}, // Map
		indexEvents: {}, // Map
		length: -1,
		curIndex: -1,
		duration: -1,
		save_state: [],

		reset: () => {
			recording.events = {};
			recording.eventsIndex = {};
			recording.indexEvents = {};
			recording.length = -1;
			recording.curIndex = -1;
			recording.duration = -1;
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
					// TODO: Finish this...
					// Push to table of saved
					$(`<tr>
							<td>${convTimeToEpoch(c)}</td>
							<td>
								<a>
									Select
								</a>
							</td>
					</tr>`).appendTo("tbody#tbody_saved");
					recording.eventsIndex[c] = i;
					recording.indexEvents[i] = c;
					recording.length++;

					if (recording.curIndex === -1) {
						recording.curIndex = c;
					}
				});

				setUpChart();
				disabledInput(false);
				setTitle("Ready!");
				setLoading(false);
				setStatus("Ready!");
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
			} else {
				setStatus("Finish...");
				setTitle("Finish...");
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

		funcTimeout = setTimeout(() => {
			playRecording(index + 1);
		}, timeDiff);
	};

	const playNextRecording = () => {
		if (recording.eventsIndex[recording.curIndex] < recording.length - 1) {
			// play next saved in 1 sec
			recording.curIndex =
				recording.indexEvents[recording.eventsIndex[recording.curIndex] + 1];

			funcTimeout = setTimeout(() => {
				emptyEditor();
				playRecording(0);
			}, 1000);

			return true;
		}

		return false;
	};

	const stopRecording = () => {
		clearTimeout(funcTimeout);
	};

	// ######################################################
	// ############         Chart Method         ############
	// ######################################################

	const setUpChart = (
		index = recording.curIndex,
		type = "bar",
		divider = 1,
		time = "s"
	) => {
		let times = calcTimeForChart(recording.events[index], divider, time);
		let data = formatToChartData(recording.events[index], times);

		const ctx = document.getElementById("recording_chart");

		const dataChart = {
			labels: times.map((c) => c.time),
			datasets: Object.entries(data).map(([k, v]) => {
				return {
					label: nameInChart[k],
					data: v,
				};
			}),
		};

		const configChart = {
			type: type,
			options: {
				responsive: true,
				scales: {
					x: {
						stacked: true,
					},
					y: {
						stacked: true,
					},
				},
			},
		};

		const chart = new Chart(ctx, {
			...configChart,
			data: dataChart,
		});

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
				time: divider * i + time,
				ms: dev * i,
			});
		}

		res.push({
			time: divider * i + time,
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
	// ############           Listener           ############
	// ######################################################

	$("select#rec_selection").change((e) => {
		stopRecording();
		recording.curIndex = e.currentTarget.value;
	});

	$("#rec_play").click(() => {
		emptyEditor();
		let firstIndex = recording.events[recording.curIndex].findIndex(
			(c) => c.time > 0
		);

		playRecording(firstIndex);
	});

	$("#rec_stop").click(() => {
		stopRecording();
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

	// ######################################################
	// ############            Runner            ############
	// ######################################################

	getRecording();
});
