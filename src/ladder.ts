


class Player {
	constructor() {
		return Vue.reactive(this);
	}
}

type _MakeRankerHistoryEvent<T extends string, D extends {} = {}> = {
	type: T, delta: number, rank: number, oldRank: number, currentTime: number,
} & D;

type RankerHistoryEventMap = {
	'UPRANK': _MakeRankerHistoryEvent<'UPRANK'>,
	'DOWNRANK': _MakeRankerHistoryEvent<'DOWNRANK'>,
	'MULTI': _MakeRankerHistoryEvent<'MULTI'>,
	'BIAS': _MakeRankerHistoryEvent<'BIAS'>,
	'LAST': _MakeRankerHistoryEvent<'LAST'>,
	'THROW_VINEGAR': _MakeRankerHistoryEvent<'THROW_VINEGAR', { target: accountId, amount: number, success: boolean }>,
	'GOT_VINEGARED': _MakeRankerHistoryEvent<'GOT_VINEGARED', { source: accountId, amount: number, success: boolean }>,
};

class Ranker {
	accountId: accountId = 0;
	username: string = '';
	points: number = 0;
	power: number = 1;
	bias: number = 0;
	multiplier: number = 1;
	you: boolean = false;
	growing: boolean = true;
	timesAsshole: number = 0;
	grapes: number = 0;
	vinegar: number = 0;

	rank: number = 0;
	autoPromote: boolean = false;

	history: RankerHistoryEventMap[keyof RankerHistoryEventMap][] = [];

	interpolated = Vue.reactive({
		timeOffset: 0,
		rank: 0,
		points: 0,
		power: 0,
		history: [] as RankerHistoryEventMap[keyof RankerHistoryEventMap][],
	});

	constructor() {
		return Vue.markRaw(this);
	}

	static from(source: SocketYouRanker): YouRanker;
	static from(source: SocketRanker): Ranker;
	static from(source: SocketRanker | SocketYouRanker): Ranker | YouRanker {
		let ranker = source.you ? new YouRanker() : new Ranker();
		ranker.username = unescapeHtml(source.username);
		ranker.you = source.you;
		ranker.accountId = source.accountId;
		ranker.bias = source.bias;
		ranker.growing = source.growing;
		ranker.multiplier = source.multiplier;
		ranker.rank = source.rank;
		ranker.timesAsshole = source.timesAsshole;
		ranker.points = +source.points;
		ranker.power = +source.power;
		ranker.interpolated = {
			history: [],
			points: ranker.points,
			power: ranker.power,
			rank: ranker.rank,
			timeOffset: 0,
		}
		if (source.you) {
			let youSource = source as SocketYouRanker;
			let youRanker = ranker as YouRanker;
			youRanker.autoPromote = youSource.autoPromote;
			youRanker.grapes = +youSource.grapes;
			youRanker.vinegar = +youSource.vinegar;
		}
		return ranker;
	}

	get powerFormatted() {
		return `${numberFormatter.format(this.interpolated.power)
			} [+${(this.bias + '').padStart(2, '0')
			} x${(this.multiplier + '').padStart(2, '0')
			}]`;
	}
	get pointsFormatted() {
		return numberFormatter.format(this.interpolated.points);
	}

	pushHistory<T extends keyof RankerHistoryEventMap>(
		type: T, data: Omit<RankerHistoryEventMap[T], 'type' | 'delta' | 'rank'>,
		interpolated = false,
	) {
		let currentRank = !interpolated ? this.rank : this.interpolated.rank;
		if (data.oldRank == 0) data.oldRank = currentRank;
		let history = !interpolated ? this.history : this.interpolated.history;

		let entry: RankerHistoryEventMap[keyof RankerHistoryEventMap] | _MakeRankerHistoryEvent<string> = {
			type,
			delta: currentRank - data.oldRank,
			rank: currentRank,
			...data,
		};
		// Object.freeze(entry);
		history.unshift(entry as RankerHistoryEventMap[keyof RankerHistoryEventMap]);
		if (history.length > 30) history.pop();
		return entry as RankerHistoryEventMap[T];
	}
}
class YouRanker extends Ranker {
	you = true;
}


class FairLadder {
	socket?: FairSocket;
	userData = new UserData();
	state = VueReactive({
		connected: false,
		connectionRequested: false,
		rankersById: {} as Record<accountId, Ranker>,

		vinegared: {
			justVinegared: false,
			vinegaredBy: new Ranker(),
			vinegarThrown: 0,
		},

		currentLadder: {
			number: 0,
		},
		yourRanker: new YouRanker(),
		firstRanker: new Ranker(),
		rankers: [new Ranker()],
		startRank: 0,

		infoData: {
			pointsForPromote: 250000000,
			minimumPeopleForPromote: 10,
			assholeLadder: 15,
			assholeTags: ["", "♠", "♣", "♥", "♦"],
			baseVinegarNeededToThrow: 1000000,
			baseGrapesNeededToAutoPromote: 2000,
			manualPromoteWaitTime: 15,
			autoPromoteLadder: 2
		},

		interpolated: {
			currentTime: 0,
			timeOffset: 0,
			rankers: [new Ranker()],
		},

		pointsNeededForManualPromote: 0,

		currentTime: 0,
		updateRealTime: 0,
	});
	ladderSubscription: any;
	constructor() {
		return Vue.markRaw(this);
	}
	connect() {
		if (!this.socket) throw 0;
		if (!this.userData.uuid) throw 0;
		if (this.state.connected || this.state.connectionRequested) return false;
		this.state.connectionRequested = true;
		let resolveConnected: () => void;

		this.ladderSubscription = this.socket.subscribe('/topic/ladder/$ladderNum', (data) => {
			this.handleLadderUpdates(data);
		}, { uuid: this.userData.uuid }, this.userData.ladderNum);

		this.socket.subscribe('/user/queue/ladder/', (data) => {
			this.handleLadderInit(data);
			resolveConnected();
		}, { uuid: this.userData.uuid });

		this.socket.subscribe('/user/queue/ladder/updates', (data) => {
			this.handlePrivateLadderUpdates(data);
		}, { uuid: this.userData.uuid });

		this.socket.send('/app/ladder/init/$ladderNum'
			, { uuid: this.userData.uuid }, this.userData.ladderNum);

		this.socket.subscribe('/user/queue/info', (data) => {
			this.handleInfo(data);
		}, { uuid: this.userData.uuid });

		this.socket.send('/app/info'
			, { uuid: this.userData.uuid });

		return new Promise<void>(resolve => { resolveConnected = resolve; });
	}
	disconnect() {
		// todo
	}


	handleLadderUpdates(message: FairSocketSubscribeResponseMap['/topic/ladder/$ladderNum']) {
		for (let event of message.events) {
			this.handleEvent(event);
		}
		this.calculateLadder(message.secondsPassed);
	}

	handleEvent(event: SocketLadderEvent) {
		console.log(event);
		let currentTime = this.state.currentTime;

		switch (event.eventType) {
			case 'BIAS': {
				let ranker = this.state.rankersById[event.accountId];
				ranker.bias++;
				ranker.points = 0;
				ranker.pushHistory('BIAS', { currentTime, oldRank: 0 });
				break;
			}
			case 'MULTI': {
				let ranker = this.state.rankersById[event.accountId];
				ranker.multiplier++;
				ranker.bias = 0;
				ranker.points = 0;
				ranker.power = 0;
				ranker.pushHistory('MULTI', { currentTime, oldRank: 0 });
				break;
			}
			case 'VINEGAR': {
				let vinegarThrown = +event.data.amount;
				let ranker = this.state.rankersById[event.accountId];
				ranker.vinegar = 0;
				let target = this.state.firstRanker;
				if (target.you) {
					if (event.data.success) {
						this.state.vinegared = {
							justVinegared: true,
							vinegaredBy: ranker,
							vinegarThrown,
						};
						// alert(ranker.username + " threw their "
						// + numberFormatter.format(vinegarThrown)
						// + " Vinegar at you and made you slip to the bottom of the ladder.");
					}
				}
				target.vinegar = Math.max(0, target.vinegar - vinegarThrown);
				break;
			}
			case 'SOFT_RESET_POINTS': {
				let ranker = this.state.rankersById[event.accountId];
				ranker.points = 0;
				break;
			}
			case 'PROMOTE': {
				let ranker = this.state.rankersById[event.accountId];
				ranker.growing = false;

				if (event.accountId == this.userData.accountId) {
					// let newLadderNum = ladderData.currentLadder.number + 1
					// changeLadder(newLadderNum);
					// changeChatRoom(newLadderNum);
				}
				break;
			}
			case 'AUTO_PROMOTE': {
				let ranker = this.state.rankersById[event.accountId];
				ranker.grapes -= this.getAutoPromoteGrapeCost(ranker.rank);
				ranker.autoPromote = true;
				break;
			}
			case 'JOIN': {
				let ranker = new Ranker();
				ranker.accountId = event.accountId;
				ranker.username = unescapeHtml(event.data.username);
				if (ranker.username.includes('\\u')) {
					try { ranker.username = JSON.parse(`"${ranker.username}"`) } catch { }
				}
				ranker.rank = this.state.rankers.length + 1;
				if (!this.state.rankers.find(e => e.accountId == event.accountId)) {
					this.state.rankers.push(ranker);
					this.state.rankersById[ranker.accountId] = ranker;
				}
				break;
			}
			case 'NAME_CHANGE': {
				let ranker = this.state.rankersById[event.accountId];
				ranker.username = unescapeHtml(event.data);
				break;
			}
			case 'RESET': {
				// disconnect is made automatically
				location.reload();
				break;
			}
		}
	}

	handleInfo(message: FairSocketSubscribeResponseMap['/user/queue/info']) {
		this.state.infoData = {
			assholeLadder: message.content.assholeLadder,
			assholeTags: message.content.assholeTags.map(unescapeHtml),
			autoPromoteLadder: message.content.autoPromoteLadder,
			baseGrapesNeededToAutoPromote: +message.content.baseGrapesNeededToAutoPromote,
			baseVinegarNeededToThrow: +message.content.baseVinegarNeededToThrow,
			manualPromoteWaitTime: message.content.manualPromoteWaitTime,
			minimumPeopleForPromote: message.content.minimumPeopleForPromote,
			pointsForPromote: +message.content.pointsForPromote,
		}
	}

	handlePrivateLadderUpdates(message: FairSocketSubscribeResponseMap['/user/queue/ladder/updates']) {
		for (let event of message.events) {
			this.handleEvent(event);
		}
	}

	handleLadderInit(message: FairSocketSubscribeResponseMap['/user/queue/ladder/']) {
		if (message.status === "OK") {
			if (message.content) {
				localStorage._ladder = JSON.stringify(message);
				console.log(message);
				this.state.currentLadder.number = message.content.currentLadder.number;
				this.state.startRank = message.content.startRank;
				this.state.rankers = message.content.rankers.map(e => Ranker.from(e));
				this.state.rankersById = Object.fromEntries(this.state.rankers.map(e => [e.accountId, e]));
				this.state.yourRanker = this.state.rankersById[message.content.yourRanker.accountId] as YouRanker;
				this.state.firstRanker = this.state.rankers[0];
				this.state.interpolated = {
					currentTime: 0,
					rankers: this.state.rankers.slice(),
					timeOffset: 0,
				};

				this.state.connectionRequested = false;
				this.state.connected = true;

				this.userData.accountId = this.state.yourRanker.accountId;
				this.userData.username = this.state.yourRanker.username;
			}
		}
	}

	calculateLadder(secondsPassed: number) {
		this.state.currentTime += secondsPassed;
		let currentTime = this.state.currentTime;
		// FIXME this uses 400ms per 8k rankers
		this.ensureSortedDescending(this.state.rankers, e => e.points);

		let ladderStats = {
			growingRankerCount: 0,
			pointsNeededForManualPromote: 0,
			eta: 0
		}

		this.state.rankers.forEach((ranker, index) => {
			let rank = index + 1;
			ranker.rank = rank;
			// If the ranker is currently still on ladder
			if (!ranker.growing) return;
			ladderStats.growingRankerCount += 1;

			// Calculating Points & Power
			if (rank != 1) {
				ranker.power += Math.floor((ranker.bias + rank - 1) * ranker.multiplier * secondsPassed);
			}
			ranker.points += Math.floor(ranker.power * secondsPassed);


			// Calculating Vinegar based on Grapes count
			if (rank == 1) {
				if (this.state.currentLadder.number === 1)
					ranker.vinegar = Math.floor(ranker.vinegar * (0.9975 ** secondsPassed));
			} else {
				ranker.vinegar += Math.floor(ranker.grapes * secondsPassed)
			}
		});

		// let rankersOld = this.state.rankers.slice();
		// FIXME this uses 400ms per 8k rankers
		this.state.rankers.sort((a, b) => b.points - a.points);

		this.state.rankers.forEach((ranker, index, list) => {
			let newRank = index + 1;
			let oldRank = ranker.rank;
			if (newRank == oldRank) return;

			ranker.rank = newRank;

			if (newRank < oldRank)
				ranker.pushHistory('UPRANK', { currentTime, oldRank });
			else
				ranker.pushHistory('DOWNRANK', { currentTime, oldRank });

			if (newRank < oldRank) {
				// rank increase, gain grapes
				for (let r = oldRank; r < newRank; r++) {
					// let otherRanker = rankersOld[r];
					if (ranker.growing && (ranker.bias > 0 || ranker.multiplier > 1)) {
						ranker.grapes++;
					}
				}
			}

		});

		// Ranker on Last Place gains 1 Grape, only if he isn't the only one
		if (this.state.rankers.length >= Math.max(this.state.infoData.minimumPeopleForPromote, this.state.currentLadder.number)) {
			let lastRanker = this.state.rankers[this.state.rankers.length - 1];
			if (lastRanker.growing) {
				lastRanker.grapes += ~~secondsPassed;
				lastRanker.pushHistory('LAST', { currentTime, oldRank: 0 });
			}
		}
		this.state.firstRanker = this.state.rankers[0];

		this.calculateStats();

		this.state.interpolated = {
			currentTime: this.state.currentTime,
			rankers: this.state.rankers.slice(),
			timeOffset: 0,
		}
		for (let ranker of this.state.rankers) {
			ranker.interpolated = {
				history: [],
				power: ranker.power,
				points: ranker.points,
				rank: ranker.rank,
				timeOffset: 0,
			};
		}
		this.state.updateRealTime = performance.now();
	}

	ensureSortedDescending<T>(array: T[], fn: (el: T) => number) {
		let prevValue = +Infinity;
		let sorted = true;
		for (let el of array) {
			let value = fn(el);
			if (value > prevValue) {
				sorted = false;
				break;
			}
			prevValue = value;
		}
		if (!sorted) {
			array.sort((a, b) => fn(b) - fn(a));
		}
	}

	calculateStats() {
		this.state.pointsNeededForManualPromote = this.calculatePointsNeededForManualPromote();
		// 	// ETA
		// 	// TODO: ETA
	}

	interpolateLadder(secondsOffset: number) {
		let currentTime = this.state.currentTime + secondsOffset;
		this.state.interpolated.currentTime = currentTime;
		this.state.interpolated.timeOffset = secondsOffset;
		let secondsPassed = secondsOffset;

		this.ensureSortedDescending(this.state.interpolated.rankers, e => e.interpolated.points);

		this.state.interpolated.rankers.forEach((ranker, index) => {
			let rank = index + 1;
			ranker.interpolated.rank = rank;
			// If the ranker is currently still on ladder
			if (!ranker.growing) return;

			// Calculating Points & Power
			if (rank != 1) {
				ranker.interpolated.power = ranker.power + Math.floor((ranker.bias + rank - 1) * ranker.multiplier * secondsPassed);
			}
			ranker.interpolated.points = ranker.points + Math.floor(ranker.power * secondsPassed);
		});

		// let rankersOld = this.state.rankers.slice();
		// FIXME this uses 400ms per 8k rankers
		this.state.interpolated.rankers.sort((a, b) => b.interpolated.points - a.interpolated.points);

		this.state.interpolated.rankers.forEach((ranker, index, list) => {
			let newRank = index + 1;
			let oldRank = ranker.interpolated.rank;
			if (newRank == oldRank) return;

			ranker.interpolated.rank = newRank;

			if (newRank < oldRank)
				ranker.pushHistory('UPRANK', { currentTime, oldRank }, true);
			else
				ranker.pushHistory('DOWNRANK', { currentTime, oldRank }, true);
		});

	}


	calculatePointsNeededForManualPromote() {
		let infoData = this.state.infoData;
		if (this.state.rankers.length < Math.max(infoData.minimumPeopleForPromote, this.state.currentLadder.number)) {
			return Infinity;
		}
		if (this.state.firstRanker.points < infoData.pointsForPromote) {
			return infoData.pointsForPromote;
		}
		let firstRanker = this.state.firstRanker;
		let secondRanker = this.state.rankers[1];
		if (this.state.currentLadder.number < infoData.autoPromoteLadder) {
			if (!firstRanker.you) return firstRanker.points + 1;
			return secondRanker.points + 1;
		}

		let leadingRanker = firstRanker;
		let pursuingRanker = firstRanker.you ? secondRanker : firstRanker;

		// How many more points does the ranker gain against his pursuer, every Second
		let powerDiff = (leadingRanker.growing ? pursuingRanker.power : 0) - (pursuingRanker.growing ? pursuingRanker.power : 0);
		// Calculate the needed Point difference, to have f.e. 30seconds of point generation with the difference in power
		let neededPointDiff = Math.abs(powerDiff * infoData.manualPromoteWaitTime);

		return Math.max(
			(leadingRanker.you ? pursuingRanker : leadingRanker).points + neededPointDiff,
			infoData.pointsForPromote
		);
	}


	request(type: 'asshole' | 'auto-promote' | 'bias' | 'multi' | 'promote' | 'vinegar') {
		if (!this.socket) throw 0;
		if (!this.canRequest(type, this.state.yourRanker.accountId)) {
			console.log(`fakeRequest: %O can't do %O!`, Vue.toRaw(this.state.yourRanker), type);
			return;
		}
		this.socket.send(`/app/ladder/post/${type}`, { uuid: this.userData.uuid });
	}

	fakeUpdate(secondsPassed: number = 1) {
		this.calculateLadder(secondsPassed);
	}
	fakeRequest(eventType: SocketLadderEvent['eventType'], accountId: accountId = this.state.yourRanker.accountId) {
		if (!this.canRequest(eventType.toLowerCase().replace(/_/g, '-') as any, accountId)) {
			console.log(`fakeRequest: %O can't do %O!`, Vue.toRaw(this.state.rankersById[accountId]), eventType);
		}
		switch (eventType) {
			case 'BIAS':
			case 'MULTI':
			case 'SOFT_RESET_POINTS':
			case 'PROMOTE':
			case 'AUTO_PROMOTE':
				this.handleEvent({ eventType, accountId }); break;
			case 'VINEGAR': {
				let target = this.state.rankers[0];
				let source = this.state.rankersById[accountId];
				this.handleEvent({
					eventType, accountId, data: {
						amount: source.vinegar + '',
						success: source.vinegar > target.vinegar,
					}
				}); break;
			}
			default:
				eventType;
				console.error('not implemented', { fakeRequest: true, eventType, accountId });
				alert('not implemented');
		}
		this.calculateLadder(0);
	}



	getUpgradeCost(level: number) {
		return Math.round(Math.pow(this.state.currentLadder.number + 1, level));
	}

	getVinegarThrowCost() {
		return this.state.infoData.baseVinegarNeededToThrow * this.state.currentLadder.number;
	}

	getAutoPromoteGrapeCost(rank: number) {
		let infoData = this.state.infoData;
		let minPeople = Math.max(infoData.minimumPeopleForPromote, this.state.currentLadder.number);
		let divisor = Math.max(rank - minPeople + 1, 1);
		return Math.floor(infoData.baseGrapesNeededToAutoPromote / divisor);
	}

	getBiasCost(ranker: Ranker = this.state.yourRanker) {
		return this.getUpgradeCost(ranker.bias + 1);
	}
	getMultiplierCost(ranker: Ranker = this.state.yourRanker) {
		return this.getUpgradeCost(ranker.multiplier + 1);
	}

	canRequest(type: 'asshole' | 'auto-promote' | 'bias' | 'multi' | 'promote' | 'vinegar', accountId = this.state.yourRanker.accountId) {
		let ranker = this.state.rankersById[accountId];
		switch (type) {
			case 'bias': {
				return this.getBiasCost(ranker) <= ranker.points;
			}
			case 'multi': {
				return this.getMultiplierCost(ranker) <= ranker.power;
			}
			case 'vinegar': {
				return this.getVinegarThrowCost() <= ranker.vinegar;
			}
			case 'promote': {
				return !!'TODO';
			}
			case 'auto-promote': {
				return !!'TODO';
			}
			case 'asshole': {
				return !!'TODO';
			}
			default:
				return false;
		}
	}

}

