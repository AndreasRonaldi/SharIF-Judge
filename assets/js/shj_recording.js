/**
 * SharIF Judge
 * @file shj_recording.js
 * author: Andreas Ronaldi <andreasronaldi25@gmail.com>
 *
 *     Javascript codes for "Recording" page
 */

$(document).ready(() => {
	// Check if recording data is avaliable, if not just dont run anything...
	if (document.querySelector("#code_editor") === null) return;

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
	};

	let confPlayer = {
		durationNext: 500, // in ms
		mergeDuration: 0, // if time difference smaller than value, then merge the events
	};

	editor.setOptions({
		theme: "ace/theme/monokai",
		fontSize: "11pt",
		readOnly: true,
		enableLiveAutocompletion: true,
		enableBasicAutocompletion: true,
		enableSnippets: true,
	});

	// Object for playing record
	const recording = {
		events: {}, // Map -> time events to list of events
		eventsIndex: {}, // Map -> index to time events
		indexEvents: {}, // Map -> time events to index
		presumIndexDuration: {}, // Map -> index to duration before timestart event
		length: -1, // Length of list of saved events
		curEvents: -1, // Currently selected index
		duration: 0, // Duration of events
		save_state: [], // Saved state to use in playback
		metrics: {
			inserted: 0,
			removed: 0,
			freq_changes: [],
			list_of_hotspot: [],
			total_input_change: 0,
			total_execute: 0,
			total_output_change: {},
			list_of_pauses: [],
			freq_change_nav: {},
			max_inserted: -1,
			max_removed: -1,
		},

		reset: () => {
			recording.events = {};
			recording.eventsIndex = {};
			recording.indexEvents = {};
			recording.presumIndexDuration = {};
			recording.length = -1;
			recording.curEvents = -1;
			recording.duration = 0;
			recording.save_state = [];
		},

		resetMetrics: () => {
			recording.metrics = {
				inserted: 0,
				removed: 0,
				freq_changes: [],
				list_of_hotspot: [],
				total_input_change: 0,
				total_execute: 0,
				total_output_change: {},
				list_of_pauses: [],
				freq_change_nav: {},
				max_inserted: -1,
				max_removed: -1,
			};
		},
	};

	// handle that will all be run of it when setState instead of the last handlers
	// const handlersIncludeInGoState = {
	// 	insert: true,
	// 	remove: true,
	// 	cursor_selection: false,
	// 	sel_selection: false,
	// 	focus: false,
	// 	blur: false,
	// 	visibility: false,
	// 	pdf_focus: false,
	// 	pdf_blur: false,
	// 	input_change: false,
	// 	output_change: false,
	// 	save: false,
	// 	submit: false,
	// 	execute: false,
	// };

	// TODO: Remove this config
	const handlersIncludeInGoState = {
		insert: true,
		remove: true,
		cursor_selection: true,
		sel_selection: true,
		focus: true,
		blur: true,
		visibility: true,
		pdf_focus: true,
		pdf_blur: true,
		input_change: true,
		output_change: true,
		save: true,
		submit: true,
		execute: true,
	};

	// handler when event is trigger
	const handlers = {
		insert: (args, time) => {
			editor.session.replace(
				new ace.Range(
					args.start.row,
					args.start.column,
					args.start.row,
					args.start.column
				),
				args.data.join("\n")
			);
			metricHandlers["insert"](args, time);
		},
		remove: (args, time) => {
			editor.session.remove({ start: args.start, end: args.end });
			metricHandlers["remove"](args, time);
		},
		cursor_selection: (args, time) => {
			setSelection(editor, args);
			metricHandlers["editor_cursor"](args, time);
		},
		sel_selection: (args, time) => {
			setSelection(editor, args);
			metricHandlers["editor_selection"](args, time);
		},
		focus: (args, time) => {
			setStatus("User is focus now");
			setTitle("User is focus now");
			metricHandlers["focus"](args, time);
		},
		blur: (args, time) => {
			setStatus("User is not focus on website now");
			setTitle("User is not focus on website now");
			metricHandlers["blur"](args, time);
		},
		visibility: (args, time) => {
			if ((args, time)) {
				setStatus("Open SharIF-Judge");
				setTitle("User is on SharIF-Judge now");
			} else {
				setStatus("Switching tabs");
				setTitle("User is on other tabs now");
			}
			metricHandlers["visibility"](args, time);
		},
		pdf_focus: (args, time) => {
			setStatus("User is focus on pdf viewer now");
			setTitle("User is focus on pdf viewer now");
			metricHandlers["pdf_focus"](args, time);
		},
		pdf_blur: (args, time) => {
			setStatus("User is not focus on pdf viewer now");
			setTitle("User is not focus on pdf viewer now");
			metricHandlers["pdf_blur"](args, time);
		},
		input_change: (args, time) => {
			$("#editor_input").val(args, time);
			metricHandlers["input_change"](args, time);
		},
		output_change: (args, time) => {
			$("#editor_output").val(args, time);
			metricHandlers["output_change"](
				{ value: args, input: $("#editor_input").val() },
				time
			);
		},
		save: (args, time) => {
			setStatus("User just saved");
			setTitle("User just saved");
			metricHandlers["save"](args, time);
		},
		submit: (args, time) => {
			setStatus("User just submit!");
			setTitle("User just submit!");
			metricHandlers["submit"](args, time);
		},
		execute: (args, time) => {
			setStatus("User is running the program.");
			setTitle("User is running the program.");
			metricHandlers["execute"](args, time);
		},
	};

	// Chart config
	let confChart = {
		type: "bar",
		autoDivider: 20, // How many section does the auto divider will giveout (default: 10)
		divider: 1,
		time: "s",
		stack: true,
		border: "#595959",
	};

	const showInChart = {
		insert: true,
		remove: true,
		cursor_selection: false,
		sel_selection: false,
		focus: true,
		blur: true,
		visibility: false,
		pdf_focus: true,
		pdf_blur: true,
		input_change: true,
		output_change: true,
		save: true,
		submit: true,
		execute: true,
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

	const colorInChart = {
		insert: {
			bg: "#00C853",
			border: "#008E3C",
		},
		remove: {
			bg: "#FF3D00",
			border: "#DD2C00",
		},
		cursor_selection: {
			bg: "#2962FF",
			border: "#0039CB",
		},
		sel_selection: {
			bg: "#6200EA",
			border: "#4500B5",
		},
		focus: {
			bg: "#FFAB00",
			border: "#FF8F00",
		},
		blur: {
			bg: "#757575",
			border: "#424242",
		},
		visibility: {
			bg: "#AA00FF",
			border: "#7B1FA2",
		},
		pdf_focus: {
			bg: "#FF6D00",
			border: "#E65100",
		},
		pdf_blur: {
			bg: "#9E9E9E",
			border: "#616161",
		},
		input_change: {
			bg: "#00B8D4",
			border: "#0088A3",
		},
		output_change: {
			bg: "#FF4081",
			border: "#D81B60",
		},
		save: {
			bg: "#64DD17",
			border: "#3E9C00",
		},
		submit: {
			bg: "#304FFE",
			border: "#1A237E",
		},
		execute: {
			bg: "#D50000",
			border: "#9B0000",
		},
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

		$.ajax({
			type: "GET",
			url: shj.site_url + "recording/download_record/" + rec_path,
			cache: false,
			success: (data) => {
				recording.events = data;

				$("select#rec_selection").empty();

				recording.length = 0;

				let curEvents = -1;

				Object.keys(data)
					.sort((a, b) => a - b)
					.forEach((c, i, a) => {
						// Push to table of saved
						$(`<tr>
							<td>${convTimeToEpoch(c)}</td>
							<td>${convTimeToEpoch(parseInt(c) + data[c][data[c].length - 1].time)}</td>
							<td id="sel_${c}" class="sel_recording">
								Select
							</td>
					</tr>`).appendTo("tbody#tbody_saved");

						$(`#sel_${c}`).click(() => {
							playOrStop(false);
							setValueTimer(recording.presumIndexDuration[i]);
							setSelectedSaveTime(c);
						});

						recording.eventsIndex[c] = i;
						recording.indexEvents[i] = c;
						recording.presumIndexDuration[i] = recording.duration;
						recording.length++;

						recording.duration += data[c][data[c].length - 1].time;

						if (curEvents === -1) {
							curEvents = c;
						}

						recording.duration += confPlayer.durationNext;
					});

				$(`#range_player`).attr("max", recording.duration);
				$(`#sel_${recording.curEvents}`).text("Selected");
				$(`#sel_${recording.curEvents}`).addClass("sel_selected");
				disabledInput(false);
				setTitle("Ready!");
				setLoading(false);
				setStatus("Ready!");
				setSelectedSaveTime(curEvents);
			},
			error: function (error) {
				console.error(error);
				setTitle("Something went wrong!");
			},
		});
	};

	const playOrStop = (playRecording = isRecPlaying) => {
		if (!playRecording) {
			// if recording is playing -> stop
			stop();
			$("#rec_btn").text("Play");
		} else {
			// if recording is not played -> played in the time in input.
			play();
			$("#rec_btn").text("Stop");
		}

		isRecPlaying = playRecording;
	};

	const play = (time = $(`#range_player`).val()) => {
		const { curEvent, timeEvent, eventsIndex } = setState(time);
		startTimer();

		// Start after time to eventsIndex
		if (curEvent.time < timeEvent)
			funcTimeoutRecording = setTimeout(() => {
				startRecording(eventsIndex);
			}, timeEvent - curEvent.time);
		else
			funcTimeoutRecording = setTimeout(() => {
				startRecording(eventsIndex);
			}, curEvent.time - timeEvent);
	};

	const setState = (time = $(`#range_player`).val()) => {
		emptyEditor();
		recording.resetMetrics();

		const eventsIndex = findEventsIndex(time);
		setSelectedSaveTime(eventsIndex);

		const timeEvent =
			time - recording.presumIndexDuration[recording.eventsIndex[eventsIndex]];
		const events = recording.events[eventsIndex];

		const eventIndex = findEventIndex(time, eventsIndex);

		const handlerForLast = {};

		// from index 0 of selected save time to eventsIndex, run all insert and remove
		for (let index = 0; index < eventIndex; index++) {
			const event = events[index];
			if (handlersIncludeInGoState[event.event]) {
				handlers[event.event](event.args, event.time);
			} else {
				handlerForLast[event.event] = () =>
					handlers[event.event](event.args, event.time);
			}
		}

		// Run all handler that set to false the last handler that the event is
		Object.values(handlerForLast).forEach((f) => {
			f();
		});

		return {
			curEvent: events[eventIndex],
			timeEvent: timeEvent,
			eventsIndex: eventIndex,
		};
	};

	// Methods for plays
	const startRecording = (index) => {
		let events = recording.events[recording.curEvents];
		if (index >= events.length) {
			if (playNextRecording()) {
				setStatus("Playing Next Session");
				setTitle("Playing Next Session");
				return;
			} else {
				funcTimeoutRecording = setTimeout(() => {
					setStatus("Finish...");
					setTitle("Finish...");
					playOrStop(false);
				}, confPlayer.durationNext);
				return;
			}
		}

		let event = events[index];
		let timeDiff =
			(index + 1 < events.length
				? events[index + 1].time
				: events[index].time) - event.time;

		handlers[event.event](event.args, event.time);

		while (index + 1 < events.length && timeDiff <= confPlayer.mergeDuration) {
			index++;
			event = events[index];
			timeDiff = events[index + 1].time - event.time;
			handlers[event.event](event.args, event.time);
		}

		funcTimeoutRecording = setTimeout(() => {
			startRecording(index + 1);
		}, timeDiff);
	};

	const startTimer = () => {
		let offset = 0;

		function delta() {
			var now = Date.now(),
				d = now - offset;

			offset = now;
			return d;
		}

		const update = () => {
			let val = parseInt($(`#range_player`).val());
			val += delta();
			$(`#range_player`).val(val);
			updateTimerRange();
		};

		if (!funcIntervalTimer) {
			offset = Date.now();
			funcIntervalTimer = setInterval(update, confTimer.delay);
		}
	};

	const playNextRecording = () => {
		if (recording.eventsIndex[recording.curEvents] < recording.length - 1) {
			setSelectedSaveTime(
				recording.indexEvents[recording.eventsIndex[recording.curEvents] + 1],
				false
			);

			funcTimeoutRecording = setTimeout(() => {
				emptyEditor();

				funcTimeoutRecording = setTimeout(() => {
					startRecording(0);
				}, recording.events[recording.curEvents][0].time);
			}, confPlayer.durationNext);

			return true;
		}
		funcTimeoutRecording = setTimeout(() => {}, confPlayer.durationNext);
		return false;
	};

	const stop = () => {
		stopTimer();
		stopRecording();
	};

	// Methods for stop
	const stopTimer = () => {
		clearTimeout(funcIntervalTimer);
		funcIntervalTimer = null;
	};

	const stopRecording = () => {
		clearTimeout(funcTimeoutRecording);
		funcTimeoutRecording = null;
	};

	// ######################################################
	// ############         Chart Method         ############
	// ######################################################

	const setUpChart = (index = recording.curEvents, destroy = false) => {
		// if (curChart != null) curChart.destroy();

		const type = confChart.type ? confChart.type : "bar";
		const divider = confChart.divider ? confChart.divider : 1;
		const time = confChart.time ? confChart.time : "s";
		const stack = confChart.stack ? confChart.stack : true;
		const step = confChart.step ? confChart.step : false;
		const fill = confChart.fill ? confChart.fill : false;
		const border = confChart.border ? confChart.border : "#595959";

		let times = calcTimeForChart(recording.events[index], divider, time);
		let data = formatToChartData(recording.events[index], times);

		const ctx = document.getElementById("recording_chart");

		const dataChart = {
			labels: times.map((c) => c.time),
			datasets: Object.entries(data)
				.map(([k, v]) => {
					if (!showInChart[k]) return null;

					return {
						label: nameInChart[k],
						data: v,
						fill: fill,
						stepped: step,
						borderColor: colorInChart[k].border
							? colorInChart[k].border
							: border,
						borderWidth: 2,
						backgroundColor: colorInChart[k].bg,
					};
				})
				.filter((c) => c),
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

		if (curChart == null || destroy) {
			if (curChart != null) curChart.destroy();

			curChart = new Chart(ctx, {
				...configChart,
				data: dataChart,
			});
		} else {
			curChart.data.labels = dataChart.labels;
			curChart.data.datasets = dataChart.datasets;
			curChart.options = configChart.options;
			curChart.type = configChart.type;
			curChart.update();
		}

		return curChart;
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

			const curTime = arrTimes[idxTimes].time;

			if (!res[e.event][curTime]) {
				res[e.event][curTime] = 0;
			}

			res[e.event][curTime]++;
		});

		return res;
	};

	const calcTimeForChart = (arrEvent, divider, time) => {
		const res = [];

		const dev = calcTimeToMilliSec(divider, time);
		const max = arrEvent[arrEvent.length - 1].time;
		let i = 1;

		for (; dev * i < max; i++) {
			const curTime = dev * i;
			res.push({
				time: convTimeToHHMMSS(curTime, false, true),
				ms: dev * i,
			});
		}

		// const curTime = Math.floor(divider * i * 100) / 100 + time;
		const curTime = dev * i;
		res.push({
			time: convTimeToHHMMSS(curTime, false, true),
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
		setUpChart(undefined, true);
	});

	$("#config_chart_stack").on("click", (e) => {
		let val = $("#config_chart_stack").prop("checked");
		confChart.stack = val;
		setUpChart();
	});

	$("#config_chart_divider").on("input", (e) => {
		let val = $("#config_chart_divider").val();
		if (val > 0) {
			confChart.divider = val;
			setUpChart();
		}
	});

	$("#config_chart_time").on("change", (e) => {
		let val = $("#config_chart_time").val();
		confChart.time = val;
		setUpChart();
	});

	// ######################################################
	// ############           Listener           ############
	// ######################################################

	$("#rec_btn").click(() => {
		playOrStop(!isRecPlaying);
	});

	$("#range_player").on("mousemove", function () {
		updateTimerRange();
	});

	$("#range_player").on("change", function () {
		let isPlaying = isRecPlaying;
		if (isPlaying) playOrStop(false);
		updateTimerRange();
		setState();
		if (isPlaying) playOrStop(true);
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

	// find the events key
	const findEventsIndex = (time) => {
		let left = 0;
		let right = recording.length - 1;
		let eventsIndex = 0;

		// lower bound
		while (left <= right) {
			let middle = left + Math.floor((right - left) / 2);

			if (recording.presumIndexDuration[middle] > time) {
				right = middle - 1;
			} else {
				eventsIndex = middle;
				left = middle + 1;
			}
		}

		return recording.indexEvents[eventsIndex];
	};

	// from events key, find the nearest index (floor) from time
	const findEventIndex = (time, eventsIndex) => {
		const timeEvent =
			time - recording.presumIndexDuration[recording.eventsIndex[eventsIndex]];
		const events = recording.events[eventsIndex];

		let left = 0;
		let right = events.length - 1;
		let eventIndex = events.length - 1;

		// upper bound
		while (left <= right) {
			let middle = left + Math.floor((right - left) / 2);

			if (events[middle].time < timeEvent) {
				left = middle + 1;
			} else {
				eventIndex = middle;
				right = middle - 1;
			}
		}

		while (
			eventIndex > 0 &&
			events[eventIndex].time - events[eventIndex - 1].time <=
				confPlayer.mergeDuration
		) {
			eventIndex--;
		}

		return eventIndex;
	};

	const emptyEditor = () => {
		editor.session.setValue("", -1);
		$("#editor_input").val("");
		$("#editor_output").val("");
	};

	const disabledInput = (bool) => {
		$("#rec_play").prop("disabled", bool);
		$("#rec_stop").prop("disabled", bool);
	};

	// Convert Timestamp to Epoch
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
			(hours < 10 ? "0" : "") +
			hours +
			":" +
			(minutes < 10 ? "0" : "") +
			minutes +
			":" +
			(seconds < 10 ? "0" : "") +
			seconds
		);
	};

	const convTimeToHHMMSS = (ms, showZero = true, showMS = false) => {
		let seconds = ms / 1000;
		const hours = parseInt(seconds / 3600).toFixed(0);
		seconds = seconds % 3600;
		const minutes = parseInt(seconds / 60).toFixed(0);
		seconds = Math.floor(seconds % 60).toFixed(0);
		const sec = parseInt(seconds / 60).toFixed(0);
		ms = Math.floor(ms % 1000).toFixed(0);

		return (
			(hours > 0 ? (hours < 10 ? "0" : "") + hours + ":" : "") +
			(showZero || minutes > 0
				? (minutes < 10 ? "0" : "") + minutes + ":"
				: "") +
			(seconds < 10 ? "0" : "") +
			seconds +
			(showMS ? "." + ms.slice(0, 2) : "")
		);
	};

	const setTitle = (title) => {
		$("#status_rec").text(title);
	};

	const setSelectedSaveTime = (time, stop = true) => {
		if (stop) playOrStop(false);
		if (time == recording.curEvents) return;

		$(`#sel_${recording.curEvents}`).text("Select");
		$(`#sel_${recording.curEvents}`).removeClass("sel_selected");

		recording.curEvents = time;
		$(`#sel_${time}`).text("Selected");
		$(`#sel_${time}`).addClass("sel_selected");

		let duration =
			recording.events[time][recording.events[time].length - 1].time;

		let divider = (duration / confChart.autoDivider / 1000).toFixed(2);
		let times = "s";

		confChart.divider = divider;
		confChart.time = times;
		$(`#config_chart_divider`).val(divider);
		$(`#config_chart_time`).val(times);

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

	const setValueTimer = (value) => {
		$(`#range_player`).val(value);
		updateTimerRange();
	};

	const updateTimerRange = (
		idRange = "#range_player",
		idSpan = `#timer_player`
	) => {
		const val = ($(idRange).val() / recording.duration) * 100;
		const ms = $(idRange).val();

		$(idSpan).text(convTimeToHHMMSS(ms));

		$(idRange).css(
			"background",
			"linear-gradient(to right, #cc181e 0%, #cc181e " +
				val +
				"%, #444 " +
				val +
				"%, #444 100%)"
		);
	};

	// ######################################################
	// ############            Runner            ############
	// ######################################################

	getRecording();

	// Runner Config
	setUpTimeDividerSelector("config_chart_time");

	// handlers for metrics only
	const metricHandlers = {
		insert: (e, time) => {
			const total = e.data.reduce((prev, cur) => prev + cur.length, 0);

			recording.metrics.inserted += total;
			recording.metrics.max_inserted = Math.max(
				total,
				recording.metrics.max_inserted
			);

			const min = Math.ceil(time / 1000 / 10).toFixed(0);

			recording.metrics.freq_changes[min] =
				++recording.metrics.freq_changes[min] || 1;
		},
		remove: (e, time) => {
			const total = e.data.reduce((prev, cur) => prev + cur.length, 0);
			recording.metrics.removed += total;
			recording.metrics.max_removed = Math.max(
				total,
				recording.metrics.max_removed
			);

			const min = Math.ceil(time / 1000 / 10).toFixed(0);
			recording.metrics.freq_changes[min] =
				++recording.metrics.freq_changes[min] || 1;
		},
		editor_cursor: (selection, time) => {},
		editor_selection: (selection, time) => {},
		focus: (_, time) => {
			const min = (time / 1000 / 10).toFixed(0);
			recording.metrics.freq_change_nav[min] =
				++recording.metrics.freq_change_nav[min] || 1;
		},
		blur: (_, time) => {},
		visibility: (isVisible, time) => {},
		pdf_focus: (_, time) => {},
		pdf_blur: (_, time) => {},
		input_change: (value, time) => {
			recording.metrics.total_input_change++;

			const min = Math.ceil(time / 1000 / 60).toFixed(0);
			recording.metrics.freq_changes[min] =
				++recording.metrics.freq_changes[min] || 1;
		},
		output_change: ({ value, input }, time) => {
			if (!value.includes("Total Execution Time")) return;

			let text = value
				.split("\n")
				.filter((c) => c)
				.slice(1, -1)
				.join("\n");

			const arr = recording.metrics.total_output_change[input];
			if (arr) arr.add(text);
			else recording.metrics.total_output_change[input] = new Set().add(text);
		},
		save: (_, time) => {},
		submit: (_, time) => {},
		execute: (_, time) => {
			recording.metrics.total_execute++;
		},
	};

	function detectPauses(freq, threshold = 5, minDuration = 2) {
		const pauses = [];
		const pausesIndex = [];
		let count = 0;

		for (let i = 0; i < freq.length; i++) {
			const val = freq[i];

			console.log(i, freq[i]);

			if (val == null || val <= threshold) {
				count++;
			} else {
				if (count >= minDuration) {
					pauses.push(count);
					pausesIndex.push(i);
				}
				count = 0;
			}
		}

		return { pauses, pausesIndex };
	}

	// setInterval(() => {
	// 	// const arr = recording.metrics.total_output_change;

	// 	const data = detectPauses(
	// 		recording.metrics.freq_changes.map((c) => (c ? c : 0))
	// 	);

	// 	$("#testing").text(
	// 		JSON.stringify(recording.metrics, null, 4) +
	// 			"\n\n" +
	// 			JSON.stringify(data, null, 1)
	// 	);
	// }, 10000);
});
